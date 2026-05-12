
CREATE TABLE public.project_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  order_index int NOT NULL,
  status text NOT NULL DEFAULT 'bloqueada' CHECK (status IN ('bloqueada','activa','completada')),
  planned_start date,
  planned_end date,
  actual_start timestamptz,
  actual_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, order_index),
  UNIQUE(project_id, name)
);

CREATE INDEX idx_project_phases_project ON public.project_phases(project_id);

ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select project_phases" ON public.project_phases FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'responsable_metodos'::app_role)
  OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_phases.project_id AND p.created_by = auth.uid()));

CREATE POLICY "Insert project_phases" ON public.project_phases FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'responsable_metodos'::app_role)
  OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_phases.project_id AND p.created_by = auth.uid()));

CREATE POLICY "Update project_phases" ON public.project_phases FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'responsable_metodos'::app_role)
  OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_phases.project_id AND p.created_by = auth.uid()));

CREATE POLICY "Delete project_phases" ON public.project_phases FOR DELETE TO authenticated
USING (has_role(auth.uid(),'admin'::app_role)
  OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_phases.project_id AND p.created_by = auth.uid()));

CREATE TRIGGER update_project_phases_updated_at
BEFORE UPDATE ON public.project_phases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$
DECLARE
  p RECORD;
  phase_names text[] := ARRAY['Alineación','Diseño','Construcción','Implementación','Adopción'];
  i int;
  current_idx int;
  st text;
BEGIN
  FOR p IN SELECT id, phase FROM public.projects LOOP
    current_idx := COALESCE(array_position(phase_names, p.phase), 1);
    FOR i IN 1..5 LOOP
      IF i < current_idx THEN st := 'completada';
      ELSIF i = current_idx THEN st := 'activa';
      ELSE st := 'bloqueada';
      END IF;
      INSERT INTO public.project_phases (project_id, name, order_index, status, actual_start, actual_end)
      VALUES (p.id, phase_names[i], i, st,
        CASE WHEN i <= current_idx THEN now() ELSE NULL END,
        CASE WHEN i < current_idx THEN now() ELSE NULL END)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE public.project_tasks
  ADD COLUMN phase_id uuid REFERENCES public.project_phases(id) ON DELETE CASCADE;

CREATE INDEX idx_project_tasks_phase ON public.project_tasks(phase_id);

UPDATE public.project_tasks t SET phase_id = ph.id
FROM public.project_phases ph
WHERE ph.project_id = t.project_id AND ph.name = t.phase AND t.phase_id IS NULL;

UPDATE public.project_tasks t SET phase_id = ph.id
FROM public.project_phases ph
WHERE ph.project_id = t.project_id AND ph.order_index = 1 AND t.phase_id IS NULL;

CREATE OR REPLACE FUNCTION public.auto_advance_phase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phase_id uuid;
  v_project_id uuid;
  v_total int;
  v_completed int;
  v_current_order int;
  v_status text;
  v_next_phase_id uuid;
  v_next_name text;
BEGIN
  v_phase_id := COALESCE(NEW.phase_id, OLD.phase_id);
  IF v_phase_id IS NULL THEN RETURN NEW; END IF;

  SELECT project_id, order_index, status
    INTO v_project_id, v_current_order, v_status
  FROM public.project_phases WHERE id = v_phase_id;

  IF v_status <> 'activa' THEN RETURN NEW; END IF;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE progress_percent = 100)
    INTO v_total, v_completed
  FROM public.project_tasks WHERE phase_id = v_phase_id;

  IF v_total > 0 AND v_completed = v_total THEN
    UPDATE public.project_phases
       SET status = 'completada', actual_end = now()
     WHERE id = v_phase_id;

    SELECT id, name INTO v_next_phase_id, v_next_name
    FROM public.project_phases
    WHERE project_id = v_project_id AND order_index = v_current_order + 1;

    IF v_next_phase_id IS NOT NULL THEN
      UPDATE public.project_phases
         SET status = 'activa', actual_start = now()
       WHERE id = v_next_phase_id;

      UPDATE public.projects SET phase = v_next_name WHERE id = v_project_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_advance_phase
AFTER INSERT OR UPDATE OF progress_percent, status, phase_id OR DELETE
ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.auto_advance_phase();
