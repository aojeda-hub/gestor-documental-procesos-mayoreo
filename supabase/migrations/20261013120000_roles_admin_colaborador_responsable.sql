-- Reestructura de roles y permisos.
--
-- Roles finales: admin, colaborador (antes "editor") y responsable_metodos.
-- El rol viewer se elimina: sus usuarios pasan a colaborador. Un usuario
-- puede tener varios roles y varios silos (user_silos) a la vez.
--
-- Regla transversal: cada usuario solo elimina lo propio; admin elimina todo.
--
-- Auditoría previa (13-oct-2026) sobre la BD en vivo:
--   * app_role = admin, editor, viewer, responsable_metodos. Los roles
--     fantasma metodos / comercial / colaborador (antiguo) nunca llegaron a
--     aplicarse, así que no hay usuarios que migrar ni colisión al renombrar
--     editor -> colaborador.
--   * Ningún usuario tiene más de un rol.
--   * La tabla chat_logs no existe en vivo; su política se corrige solo si
--     existe.
--
-- Nota sobre viewer: PostgreSQL no permite quitar un valor de un enum sin
-- recrear el tipo (y con él has_role y todas las políticas que lo usan). Se
-- migran todos los usuarios, se eliminan todas las referencias y un CHECK
-- impide volver a asignarlo, de modo que el valor queda inerte.

-- =====================================================================
-- 1. Roles: editor -> colaborador, viewer -> colaborador
-- =====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
             WHERE t.typname = 'app_role' AND e.enumlabel = 'editor') THEN
    -- Renombrar el valor actualiza automáticamente todas las políticas y
    -- filas que lo usan.
    ALTER TYPE public.app_role RENAME VALUE 'editor' TO 'colaborador';
  END IF;
END $$;

-- viewer -> colaborador (sin duplicar si ya lo tuviera)
DELETE FROM public.user_roles v
WHERE v.role = 'viewer'
  AND EXISTS (SELECT 1 FROM public.user_roles c WHERE c.user_id = v.user_id AND c.role = 'colaborador');
UPDATE public.user_roles SET role = 'colaborador' WHERE role = 'viewer';

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_no_viewer;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_no_viewer CHECK (role <> 'viewer');

-- Rol por defecto para usuarios nuevos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  -- Default role: colaborador
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'colaborador');
  RETURN NEW;
END;
$$;

-- =====================================================================
-- 2. Funciones auxiliares
-- =====================================================================
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role <> 'viewer');
$$;

-- admin, responsable_metodos o dueño del proyecto
CREATE OR REPLACE FUNCTION public.can_manage_project(_user_id uuid, _project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR public.has_role(_user_id, 'responsable_metodos')
      OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = _project_id AND p.created_by = _user_id);
$$;

-- admin o dueño del proyecto (eliminar)
CREATE OR REPLACE FUNCTION public.owns_project(_user_id uuid, _project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = _project_id AND p.created_by = _user_id);
$$;

-- Edición de un documento según su silo / confidencialidad
CREATE OR REPLACE FUNCTION public.can_edit_document_row(_user_id uuid, _silo silo_type, _confidential boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR (public.has_role(_user_id, 'colaborador') AND NOT COALESCE(_confidential, false))
      OR (public.has_role(_user_id, 'responsable_metodos')
          AND (_silo = 'sinsilo' OR public.user_has_silo(_user_id, _silo)));
$$;

CREATE OR REPLACE FUNCTION public.can_edit_document(_user_id uuid, _document_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.documents d
                 WHERE d.id = _document_id
                   AND public.can_edit_document_row(_user_id, d.silo, d.confidential));
$$;

CREATE OR REPLACE FUNCTION public.can_delete_document(_user_id uuid, _document_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.documents d
                 WHERE d.id = _document_id
                   AND (public.has_role(_user_id, 'admin')
                        OR (public.has_role(_user_id, 'responsable_metodos')
                            AND (d.silo = 'sinsilo' OR public.user_has_silo(_user_id, d.silo)))
                        OR d.created_by = _user_id));
$$;

REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_manage_project(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.owns_project(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_edit_document_row(uuid, silo_type, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_edit_document(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_delete_document(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_project(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_project(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_document_row(uuid, silo_type, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_document(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_delete_document(uuid, uuid) TO authenticated;

-- =====================================================================
-- 3. Documentos
--    admin: todo. colaborador: no confidenciales (ver/crear/editar),
--    elimina solo los suyos. responsable_metodos: ve no confidenciales de
--    cualquier silo y confidenciales de su silo; crea/edita/elimina en su silo.
-- =====================================================================
DROP POLICY IF EXISTS "View documents" ON public.documents;
CREATE POLICY "View documents" ON public.documents FOR SELECT TO authenticated USING (
  NOT confidential
  OR public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'responsable_metodos') AND public.user_has_silo(auth.uid(), silo))
);

DROP POLICY IF EXISTS "Editors/admins/responsables insert docs" ON public.documents;
DROP POLICY IF EXISTS "Insert documents by role" ON public.documents;
CREATE POLICY "Insert documents by role" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_document_row(auth.uid(), silo, confidential));

DROP POLICY IF EXISTS "Editors/admins/responsables update docs" ON public.documents;
DROP POLICY IF EXISTS "Update documents by role" ON public.documents;
CREATE POLICY "Update documents by role" ON public.documents FOR UPDATE TO authenticated
  USING (public.can_edit_document_row(auth.uid(), silo, confidential))
  WITH CHECK (public.can_edit_document_row(auth.uid(), silo, confidential));

DROP POLICY IF EXISTS "Admin or responsable delete docs" ON public.documents;
DROP POLICY IF EXISTS "Delete documents by role or owner" ON public.documents;
CREATE POLICY "Delete documents by role or owner" ON public.documents FOR DELETE TO authenticated
  USING (public.can_delete_document(auth.uid(), id));

-- Versiones: siguen al documento
DROP POLICY IF EXISTS "View versions follows doc policy" ON public.document_versions;
CREATE POLICY "View versions follows doc policy" ON public.document_versions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_versions.document_id));

DROP POLICY IF EXISTS "Editors/admins insert versions" ON public.document_versions;
DROP POLICY IF EXISTS "Insert versions follows doc policy" ON public.document_versions;
CREATE POLICY "Insert versions follows doc policy" ON public.document_versions FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_document(auth.uid(), document_id));

DROP POLICY IF EXISTS "Editors/admins update versions" ON public.document_versions;
DROP POLICY IF EXISTS "Update versions follows doc policy" ON public.document_versions;
CREATE POLICY "Update versions follows doc policy" ON public.document_versions FOR UPDATE TO authenticated
  USING (public.can_edit_document(auth.uid(), document_id));

DROP POLICY IF EXISTS "Delete versions follows doc policy" ON public.document_versions;
CREATE POLICY "Delete versions follows doc policy" ON public.document_versions FOR DELETE TO authenticated
  USING (public.can_delete_document(auth.uid(), document_id));

-- Archivos del bucket "documents": borra admin o responsable (además de
-- "Users can delete their own files", que ya cubre al dueño del archivo).
DROP POLICY IF EXISTS "Editors can delete doc files" ON storage.objects;
CREATE POLICY "Editors can delete doc files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'responsable_metodos')));

-- mapa_orden, cargo_jerarquia y descripcion_cargo_ocultos ya permiten
-- admin / editor (ahora colaborador) / responsable_metodos: el renombre del
-- enum los deja correctos sin cambios.

-- =====================================================================
-- 4. Indicadores: admin y colaborador crean/editan; responsable_metodos no.
--    Eliminar: admin, o el colaborador que lo creó.
--    (insert/update ya eran admin/editor -> ahora admin/colaborador)
-- =====================================================================
DROP POLICY IF EXISTS "Admins delete indicators" ON public.indicators;
DROP POLICY IF EXISTS "Admin or owner delete indicators" ON public.indicators;
CREATE POLICY "Admin or owner delete indicators" ON public.indicators FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')
         OR (public.has_role(auth.uid(), 'colaborador') AND created_by = auth.uid()));

-- =====================================================================
-- 5. Proyectos
--    Editar: admin, responsable_metodos o dueño. Eliminar: admin o dueño.
--    Elementos hijos (fases, tareas, documentos, Ishikawa): los gestiona
--    quien puede editar el proyecto.
-- =====================================================================
DROP POLICY IF EXISTS "Owner, admin, responsable or viewer update projects" ON public.projects;
DROP POLICY IF EXISTS "Owner, admin or responsable update projects" ON public.projects;
CREATE POLICY "Owner, admin or responsable update projects" ON public.projects FOR UPDATE TO authenticated
  USING (public.can_manage_project(auth.uid(), id))
  WITH CHECK (public.can_manage_project(auth.uid(), id));
-- "Owner or admin delete projects" y "Authenticated insert projects" se mantienen.

-- project_phases
DROP POLICY IF EXISTS "Insert project_phases" ON public.project_phases;
DROP POLICY IF EXISTS "Update project_phases" ON public.project_phases;
DROP POLICY IF EXISTS "Delete project_phases" ON public.project_phases;
CREATE POLICY "Insert project_phases" ON public.project_phases FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_project(auth.uid(), project_id));
CREATE POLICY "Update project_phases" ON public.project_phases FOR UPDATE TO authenticated
  USING (public.can_manage_project(auth.uid(), project_id));
CREATE POLICY "Delete project_phases" ON public.project_phases FOR DELETE TO authenticated
  USING (public.can_manage_project(auth.uid(), project_id));

-- project_tasks
DROP POLICY IF EXISTS "Insert project_tasks (owner/admin/responsable/viewer)" ON public.project_tasks;
DROP POLICY IF EXISTS "Update project_tasks (owner/admin/responsable/viewer)" ON public.project_tasks;
DROP POLICY IF EXISTS "Delete project_tasks (owner/admin/responsable/viewer)" ON public.project_tasks;
DROP POLICY IF EXISTS "Insert project_tasks" ON public.project_tasks;
DROP POLICY IF EXISTS "Update project_tasks" ON public.project_tasks;
DROP POLICY IF EXISTS "Delete project_tasks" ON public.project_tasks;
CREATE POLICY "Insert project_tasks" ON public.project_tasks FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_project(auth.uid(), project_id));
CREATE POLICY "Update project_tasks" ON public.project_tasks FOR UPDATE TO authenticated
  USING (public.can_manage_project(auth.uid(), project_id))
  WITH CHECK (public.can_manage_project(auth.uid(), project_id));
CREATE POLICY "Delete project_tasks" ON public.project_tasks FOR DELETE TO authenticated
  USING (public.can_manage_project(auth.uid(), project_id));

-- project_documents
DROP POLICY IF EXISTS "View project documents" ON public.project_documents;
DROP POLICY IF EXISTS "Insert project documents" ON public.project_documents;
DROP POLICY IF EXISTS "Delete project documents" ON public.project_documents;
CREATE POLICY "View project documents" ON public.project_documents FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Insert project documents" ON public.project_documents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = uploaded_by AND public.can_manage_project(auth.uid(), project_id));
CREATE POLICY "Delete project documents" ON public.project_documents FOR DELETE TO authenticated
  USING (public.can_manage_project(auth.uid(), project_id));

-- Bucket project-documents. Corrige además el bug de las políticas previas,
-- que comparaban contra storage.foldername(p.name) (nombre del PROYECTO) en
-- lugar del path del archivo, por lo que el dueño nunca coincidía.
DROP POLICY IF EXISTS "View files of own/admin/responsable projects" ON storage.objects;
DROP POLICY IF EXISTS "Upload files to own/admin/responsable projects" ON storage.objects;
DROP POLICY IF EXISTS "Delete files of own/admin/responsable projects" ON storage.objects;
DROP POLICY IF EXISTS "View project files" ON storage.objects;
DROP POLICY IF EXISTS "Upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Delete project files" ON storage.objects;
CREATE POLICY "View project files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'project-documents');
CREATE POLICY "Upload project files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-documents'
              AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'responsable_metodos')
                   OR EXISTS (SELECT 1 FROM public.projects p
                              WHERE p.id::text = (storage.foldername(objects.name))[1]
                                AND p.created_by = auth.uid())));
CREATE POLICY "Delete project files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'project-documents'
         AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'responsable_metodos')
                   OR EXISTS (SELECT 1 FROM public.projects p
                              WHERE p.id::text = (storage.foldername(objects.name))[1]
                                AND p.created_by = auth.uid())));

-- Ishikawa: todos ven; editan quienes pueden editar el proyecto.
DROP POLICY IF EXISTS "View project ishikawa (owner/admin/responsable)" ON public.project_ishikawa;
DROP POLICY IF EXISTS "Insert project ishikawa (owner/admin/responsable)" ON public.project_ishikawa;
DROP POLICY IF EXISTS "Update project ishikawa (owner/admin/responsable)" ON public.project_ishikawa;
DROP POLICY IF EXISTS "View project ishikawa" ON public.project_ishikawa;
DROP POLICY IF EXISTS "Insert project ishikawa" ON public.project_ishikawa;
DROP POLICY IF EXISTS "Update project ishikawa" ON public.project_ishikawa;
CREATE POLICY "View project ishikawa" ON public.project_ishikawa FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert project ishikawa" ON public.project_ishikawa FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_project(auth.uid(), project_id));
CREATE POLICY "Update project ishikawa" ON public.project_ishikawa FOR UPDATE TO authenticated
  USING (public.can_manage_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "View project ishikawa causas (owner/admin/responsable)" ON public.project_ishikawa_causas;
DROP POLICY IF EXISTS "Insert project ishikawa causas (owner/admin/responsable)" ON public.project_ishikawa_causas;
DROP POLICY IF EXISTS "Update project ishikawa causas (owner/admin/responsable)" ON public.project_ishikawa_causas;
DROP POLICY IF EXISTS "Delete project ishikawa causas (owner/admin/responsable)" ON public.project_ishikawa_causas;
DROP POLICY IF EXISTS "View project ishikawa causas" ON public.project_ishikawa_causas;
DROP POLICY IF EXISTS "Insert project ishikawa causas" ON public.project_ishikawa_causas;
DROP POLICY IF EXISTS "Update project ishikawa causas" ON public.project_ishikawa_causas;
DROP POLICY IF EXISTS "Delete project ishikawa causas" ON public.project_ishikawa_causas;
CREATE POLICY "View project ishikawa causas" ON public.project_ishikawa_causas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert project ishikawa causas" ON public.project_ishikawa_causas FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_project(auth.uid(), project_id));
CREATE POLICY "Update project ishikawa causas" ON public.project_ishikawa_causas FOR UPDATE TO authenticated
  USING (public.can_manage_project(auth.uid(), project_id));
CREATE POLICY "Delete project ishikawa causas" ON public.project_ishikawa_causas FOR DELETE TO authenticated
  USING (public.can_manage_project(auth.uid(), project_id));

-- =====================================================================
-- 6. Riesgos, Hitos, Dependencias y Objetivos Estratégicos
--    Antes: cualquier sesión podía todo. Ahora: crear/editar requiere uno
--    de los tres roles; eliminar, quien puede editar el proyecto (riesgos,
--    hitos, dependencias) o el creador / admin (objetivos).
-- =====================================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['riesgos', 'hitos', 'dependencias'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all authenticated users to insert %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow all authenticated users to update %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow all authenticated users to delete %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Role insert %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Role update %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Project manager delete %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Role insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Role update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid())) WITH CHECK (public.has_any_role(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Project manager delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (public.can_manage_project(auth.uid(), proyecto_id))', t);
  END LOOP;
END $$;

ALTER TABLE public.objetivos_estrategicos ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
DROP POLICY IF EXISTS "Allow all authenticated users to insert objetivos_estrategicos" ON public.objetivos_estrategicos;
DROP POLICY IF EXISTS "Allow all authenticated users to update objetivos_estrategicos" ON public.objetivos_estrategicos;
DROP POLICY IF EXISTS "Allow all authenticated users to delete objetivos_estrategicos" ON public.objetivos_estrategicos;
DROP POLICY IF EXISTS "Role insert objetivos_estrategicos" ON public.objetivos_estrategicos;
DROP POLICY IF EXISTS "Role update objetivos_estrategicos" ON public.objetivos_estrategicos;
DROP POLICY IF EXISTS "Admin or owner delete objetivos_estrategicos" ON public.objetivos_estrategicos;
CREATE POLICY "Role insert objetivos_estrategicos" ON public.objetivos_estrategicos FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid()));
CREATE POLICY "Role update objetivos_estrategicos" ON public.objetivos_estrategicos FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid())) WITH CHECK (public.has_any_role(auth.uid()));
CREATE POLICY "Admin or owner delete objetivos_estrategicos" ON public.objetivos_estrategicos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

-- =====================================================================
-- 7. chat_logs: la política comparaba profiles.silo = 'admin' (valor que no
--    existe en silo_type) y el claim JWT "role" (siempre 'authenticated').
-- =====================================================================
DO $$
BEGIN
  IF to_regclass('public.chat_logs') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Allow admin select on chat_logs" ON public.chat_logs;
    CREATE POLICY "Allow admin select on chat_logs" ON public.chat_logs FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
