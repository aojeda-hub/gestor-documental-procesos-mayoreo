-- Helper: obtener silo del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_silo(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT silo::text FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- ===== Tabla `documents` (catálogo) =====
-- Actualizar política de INSERT: incluir responsable_metodos
DROP POLICY IF EXISTS "Editors/admins insert docs" ON public.documents;
CREATE POLICY "Editors/admins/responsables insert docs"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'editor'::app_role)
  OR has_role(auth.uid(), 'responsable_metodos'::app_role)
);

-- Actualizar política de UPDATE
DROP POLICY IF EXISTS "Editors/admins update docs" ON public.documents;
CREATE POLICY "Editors/admins/responsables update docs"
ON public.documents FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'editor'::app_role)
  OR has_role(auth.uid(), 'responsable_metodos'::app_role)
);

-- Actualizar política de DELETE: admin O responsable_metodos del mismo silo
DROP POLICY IF EXISTS "Admins delete docs" ON public.documents;
CREATE POLICY "Admin or responsable same silo delete docs"
ON public.documents FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'responsable_metodos'::app_role)
    AND silo::text = public.get_user_silo(auth.uid())
  )
);

-- ===== Tabla `documentos` (archivos físicos) =====
-- Eliminar la política que bloquea TODO DELETE
DROP POLICY IF EXISTS "Bloquear eliminación física" ON public.documentos;

-- Permitir eliminación a admin (cualquiera) y responsable_metodos de su silo
CREATE POLICY "Admin or responsable same silo delete documentos"
ON public.documentos FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'responsable_metodos'::app_role)
    AND silo = public.get_user_silo(auth.uid())
  )
);