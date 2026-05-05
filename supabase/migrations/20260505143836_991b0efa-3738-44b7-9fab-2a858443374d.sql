-- Restrict projects visibility: owner or admin
DROP POLICY IF EXISTS "Allow all authenticated users to select projects" ON public.projects;
CREATE POLICY "Owner or admin select projects"
ON public.projects FOR SELECT TO authenticated
USING ((auth.uid() = created_by) OR public.has_role(auth.uid(), 'admin'::app_role));

-- Restrict project_tasks visibility: owner of parent project or admin
DROP POLICY IF EXISTS "Allow all authenticated users to select project_tasks" ON public.project_tasks;
CREATE POLICY "Owner or admin select project_tasks"
ON public.project_tasks FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.created_by = auth.uid())
);

-- Allow admin to view all seguimientos
DROP POLICY IF EXISTS "Users view own seguimientos" ON public.seguimientos;
CREATE POLICY "Owner or admin view seguimientos"
ON public.seguimientos FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::app_role));