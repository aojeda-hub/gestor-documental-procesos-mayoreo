-- Allow all authenticated users to select projects, phases, and tasks
DROP POLICY IF EXISTS "Owner, admin or responsable select projects" ON public.projects;
CREATE POLICY "Allow authenticated users to select projects" ON public.projects
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Owner, admin or responsable select project_tasks" ON public.project_tasks;
CREATE POLICY "Allow authenticated users to select project_tasks" ON public.project_tasks
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Select project_phases" ON public.project_phases;
CREATE POLICY "Select project_phases" ON public.project_phases
  FOR SELECT TO authenticated
  USING (true);
