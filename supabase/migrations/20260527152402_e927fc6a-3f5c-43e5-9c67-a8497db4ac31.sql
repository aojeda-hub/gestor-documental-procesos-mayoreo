
-- Grant viewer the same project permissions as responsable_metodos

-- projects: update
DROP POLICY IF EXISTS "Owner, admin or responsable update projects" ON public.projects;
CREATE POLICY "Owner, admin, responsable or viewer update projects"
ON public.projects FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_metodos') OR has_role(auth.uid(),'viewer'))
WITH CHECK (auth.uid() = created_by OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_metodos') OR has_role(auth.uid(),'viewer'));

-- project_phases
DROP POLICY IF EXISTS "Insert project_phases" ON public.project_phases;
CREATE POLICY "Insert project_phases" ON public.project_phases FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_metodos') OR has_role(auth.uid(),'viewer') OR EXISTS(SELECT 1 FROM projects p WHERE p.id = project_phases.project_id AND p.created_by = auth.uid()));

DROP POLICY IF EXISTS "Update project_phases" ON public.project_phases;
CREATE POLICY "Update project_phases" ON public.project_phases FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_metodos') OR has_role(auth.uid(),'viewer') OR EXISTS(SELECT 1 FROM projects p WHERE p.id = project_phases.project_id AND p.created_by = auth.uid()));

DROP POLICY IF EXISTS "Delete project_phases" ON public.project_phases;
CREATE POLICY "Delete project_phases" ON public.project_phases FOR DELETE TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_metodos') OR has_role(auth.uid(),'viewer') OR EXISTS(SELECT 1 FROM projects p WHERE p.id = project_phases.project_id AND p.created_by = auth.uid()));

-- project_tasks
DROP POLICY IF EXISTS "Owner, admin or responsable insert project_tasks" ON public.project_tasks;
CREATE POLICY "Insert project_tasks (owner/admin/responsable/viewer)" ON public.project_tasks FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_metodos') OR has_role(auth.uid(),'viewer') OR EXISTS(SELECT 1 FROM projects p WHERE p.id = project_tasks.project_id AND p.created_by = auth.uid()));

DROP POLICY IF EXISTS "Owner, admin or responsable update project_tasks" ON public.project_tasks;
CREATE POLICY "Update project_tasks (owner/admin/responsable/viewer)" ON public.project_tasks FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_metodos') OR has_role(auth.uid(),'viewer') OR EXISTS(SELECT 1 FROM projects p WHERE p.id = project_tasks.project_id AND p.created_by = auth.uid()))
WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_metodos') OR has_role(auth.uid(),'viewer') OR EXISTS(SELECT 1 FROM projects p WHERE p.id = project_tasks.project_id AND p.created_by = auth.uid()));

DROP POLICY IF EXISTS "Owner of project delete tasks" ON public.project_tasks;
CREATE POLICY "Delete project_tasks (owner/admin/responsable/viewer)" ON public.project_tasks FOR DELETE TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_metodos') OR has_role(auth.uid(),'viewer') OR EXISTS(SELECT 1 FROM projects p WHERE p.id = project_tasks.project_id AND p.created_by = auth.uid()));

-- project_documents
DROP POLICY IF EXISTS "View project documents (owner/admin/responsable)" ON public.project_documents;
CREATE POLICY "View project documents" ON public.project_documents FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_metodos') OR has_role(auth.uid(),'viewer') OR EXISTS(SELECT 1 FROM projects p WHERE p.id = project_documents.project_id AND p.created_by = auth.uid()));

DROP POLICY IF EXISTS "Insert project documents (owner/admin/responsable)" ON public.project_documents;
CREATE POLICY "Insert project documents" ON public.project_documents FOR INSERT TO authenticated
WITH CHECK (auth.uid() = uploaded_by AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_metodos') OR has_role(auth.uid(),'viewer') OR EXISTS(SELECT 1 FROM projects p WHERE p.id = project_documents.project_id AND p.created_by = auth.uid())));

DROP POLICY IF EXISTS "Delete project documents (owner/admin/responsable)" ON public.project_documents;
CREATE POLICY "Delete project documents" ON public.project_documents FOR DELETE TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_metodos') OR has_role(auth.uid(),'viewer') OR EXISTS(SELECT 1 FROM projects p WHERE p.id = project_documents.project_id AND p.created_by = auth.uid()));
