
-- PROJECTS: select + update for responsable_metodos (no delete)
DROP POLICY IF EXISTS "Owner or admin select projects" ON public.projects;
DROP POLICY IF EXISTS "Owner, admin or responsable select projects" ON public.projects;
CREATE POLICY "Owner, admin or responsable select projects"
ON public.projects FOR SELECT TO authenticated
USING (
  auth.uid() = created_by
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'responsable_metodos'::app_role)
);

DROP POLICY IF EXISTS "Owner or admin update projects" ON public.projects;
DROP POLICY IF EXISTS "Owner, admin or responsable update projects" ON public.projects;
CREATE POLICY "Owner, admin or responsable update projects"
ON public.projects FOR UPDATE TO authenticated
USING (
  auth.uid() = created_by
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'responsable_metodos'::app_role)
)
WITH CHECK (
  auth.uid() = created_by
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'responsable_metodos'::app_role)
);

-- delete remains owner/admin only (ensure no responsable policy exists)
DROP POLICY IF EXISTS "Owner, admin or responsable delete projects" ON public.projects;

-- PROJECT TASKS: select + insert + update for responsable_metodos (no delete)
DROP POLICY IF EXISTS "Owner or admin select project_tasks" ON public.project_tasks;
DROP POLICY IF EXISTS "Owner, admin or responsable select project_tasks" ON public.project_tasks;
CREATE POLICY "Owner, admin or responsable select project_tasks"
ON public.project_tasks FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'responsable_metodos'::app_role)
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.created_by = auth.uid())
);

DROP POLICY IF EXISTS "Owner of project insert tasks" ON public.project_tasks;
DROP POLICY IF EXISTS "Owner, admin or responsable insert project_tasks" ON public.project_tasks;
CREATE POLICY "Owner, admin or responsable insert project_tasks"
ON public.project_tasks FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'responsable_metodos'::app_role)
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.created_by = auth.uid())
);

DROP POLICY IF EXISTS "Owner of project update tasks" ON public.project_tasks;
DROP POLICY IF EXISTS "Owner, admin or responsable update project_tasks" ON public.project_tasks;
CREATE POLICY "Owner, admin or responsable update project_tasks"
ON public.project_tasks FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'responsable_metodos'::app_role)
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.created_by = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'responsable_metodos'::app_role)
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.created_by = auth.uid())
);

-- delete on project_tasks remains owner/admin only
DROP POLICY IF EXISTS "Owner, admin or responsable delete project_tasks" ON public.project_tasks;
