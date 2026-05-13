/* 20260513180000_ensure_project_phases.sql */
-- Ensure default project phases exist and adjust read policy

-- Drop existing SELECT policy for project_phases (if any)
DROP POLICY IF EXISTS "Select project_phases" ON public.project_phases;

-- Create new SELECT policy allowing any authenticated user to read phases
CREATE POLICY "Select project_phases"
  ON public.project_phases
  FOR SELECT
  TO authenticated
  USING (true);

-- Function to ensure default phases for a given project
CREATE OR REPLACE FUNCTION public.ensure_project_phases(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM project_phases WHERE project_id = p_project_id;
  IF cnt = 0 THEN
    INSERT INTO project_phases (project_id, name, order_index, status)
    SELECT p_project_id, name, idx,
           CASE WHEN idx = 1 THEN 'activa' ELSE 'bloqueada' END
    FROM unnest(array['Alineación','Diseño','Construcción','Implementación','Adopción']) WITH ORDINALITY AS t(name, idx);
  END IF;
END;
$$;

-- Trigger function to call ensure_project_phases after a project is inserted
CREATE OR REPLACE FUNCTION public.ensure_project_phases_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.ensure_project_phases(NEW.id);
  RETURN NEW;
END;
$$;

-- Attach trigger to projects table
DROP TRIGGER IF EXISTS trg_ensure_project_phases ON public.projects;
CREATE TRIGGER trg_ensure_project_phases
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_project_phases_trigger();
