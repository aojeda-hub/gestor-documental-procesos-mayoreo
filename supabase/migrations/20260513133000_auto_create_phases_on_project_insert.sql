-- ============================================================
-- Auto-create the 5 standard phases whenever a project is created
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_default_phases_for_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  phase_names text[] := ARRAY['Alineación','Diseño','Construcción','Implementación','Adopción'];
  current_idx int;
  i int;
  st text;
BEGIN
  current_idx := COALESCE(array_position(phase_names, NEW.phase), 1);

  FOR i IN 1..5 LOOP
    IF i < current_idx THEN
      st := 'completada';
    ELSIF i = current_idx THEN
      st := 'activa';
    ELSE
      st := 'bloqueada';
    END IF;

    INSERT INTO public.project_phases
      (project_id, name, order_index, status, actual_start, actual_end)
    VALUES (
      NEW.id,
      phase_names[i],
      i,
      st,
      CASE WHEN i <= current_idx THEN now() ELSE NULL END,
      CASE WHEN i < current_idx  THEN now() ELSE NULL END
    )
    ON CONFLICT (project_id, order_index) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Drop previous trigger if exists, then recreate
DROP TRIGGER IF EXISTS trg_create_default_phases ON public.projects;

CREATE TRIGGER trg_create_default_phases
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.create_default_phases_for_project();

-- ============================================================
-- Back-fill: create phases for any existing projects that are missing them
-- ============================================================
DO $$
DECLARE
  p RECORD;
  phase_names text[] := ARRAY['Alineación','Diseño','Construcción','Implementación','Adopción'];
  i int;
  current_idx int;
  st text;
BEGIN
  FOR p IN
    SELECT id, phase FROM public.projects
    WHERE id NOT IN (SELECT DISTINCT project_id FROM public.project_phases)
  LOOP
    current_idx := COALESCE(array_position(phase_names, p.phase), 1);
    FOR i IN 1..5 LOOP
      IF i < current_idx THEN st := 'completada';
      ELSIF i = current_idx THEN st := 'activa';
      ELSE st := 'bloqueada';
      END IF;

      INSERT INTO public.project_phases
        (project_id, name, order_index, status, actual_start, actual_end)
      VALUES (
        p.id, phase_names[i], i, st,
        CASE WHEN i <= current_idx THEN now() ELSE NULL END,
        CASE WHEN i < current_idx  THEN now() ELSE NULL END
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
