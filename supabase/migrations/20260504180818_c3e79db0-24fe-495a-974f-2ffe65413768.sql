
-- 1) normas_personal: enable RLS
ALTER TABLE public.normas_personal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view normas_personal" ON public.normas_personal;
DROP POLICY IF EXISTS "Admins manage normas_personal" ON public.normas_personal;
CREATE POLICY "Authenticated can view normas_personal" ON public.normas_personal
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage normas_personal" ON public.normas_personal
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) profiles: restrict SELECT
DROP POLICY IF EXISTS "Users can read all profiles" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- 3) incidencias UPDATE: restrict
DROP POLICY IF EXISTS "Authenticated can update incidencias" ON public.incidencias;
CREATE POLICY "Owner or admin update incidencias" ON public.incidencias
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'::app_role));

-- 4) test_casos UPDATE: restrict
DROP POLICY IF EXISTS "Authenticated can update casos" ON public.test_casos;
CREATE POLICY "Owner or admin update casos" ON public.test_casos
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'::app_role));

-- 5) projects: add created_by + restrict policies
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS created_by uuid;
DROP POLICY IF EXISTS "Allow all authenticated users to delete projects" ON public.projects;
DROP POLICY IF EXISTS "Allow all authenticated users to insert projects" ON public.projects;
DROP POLICY IF EXISTS "Allow all authenticated users to update projects" ON public.projects;
CREATE POLICY "Authenticated insert projects" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owner or admin update projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owner or admin delete projects" ON public.projects
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'::app_role));

-- 6) project_tasks: restrict by parent project ownership
DROP POLICY IF EXISTS "Allow all authenticated users to delete project_tasks" ON public.project_tasks;
DROP POLICY IF EXISTS "Allow all authenticated users to insert project_tasks" ON public.project_tasks;
DROP POLICY IF EXISTS "Allow all authenticated users to update project_tasks" ON public.project_tasks;
CREATE POLICY "Owner of project insert tasks" ON public.project_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.created_by = auth.uid())
  );
CREATE POLICY "Owner of project update tasks" ON public.project_tasks
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.created_by = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.created_by = auth.uid())
  );
CREATE POLICY "Owner of project delete tasks" ON public.project_tasks
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.created_by = auth.uid())
  );

-- 7) incidencia_imagenes INSERT: restrict to own incidencia
DROP POLICY IF EXISTS "Authenticated can insert imagenes" ON public.incidencia_imagenes;
CREATE POLICY "Owner of incidencia can insert imagenes" ON public.incidencia_imagenes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (SELECT 1 FROM public.incidencias i WHERE i.id = incidencia_id AND i.created_by = auth.uid())
  );

-- 8) document_versions SELECT: enforce confidentiality
DROP POLICY IF EXISTS "View versions follows doc policy" ON public.document_versions;
CREATE POLICY "View versions follows doc policy" ON public.document_versions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_versions.document_id
      AND ((NOT d.confidential)
           OR (d.silo::text = public.get_user_silo(auth.uid()))
           OR public.has_role(auth.uid(), 'admin'::app_role))
  ));

-- 9) storage 'documents' bucket: restrict DELETE to admin/editor
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios documentos" ON storage.objects;
CREATE POLICY "Editors can delete doc files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role))
  );

-- 10) storage 'incidencias' bucket: remove public read; make private
UPDATE storage.buckets SET public = false WHERE id = 'incidencias';
DROP POLICY IF EXISTS "Public read incidencias" ON storage.objects;

-- 11) Restrict SECURITY DEFINER function execution
REVOKE EXECUTE ON FUNCTION public.get_user_silo(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_user_silo(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.soft_delete_documento(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.soft_delete_documento(uuid) TO authenticated;
