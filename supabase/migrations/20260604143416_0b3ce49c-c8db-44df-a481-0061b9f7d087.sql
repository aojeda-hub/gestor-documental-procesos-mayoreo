
CREATE TABLE IF NOT EXISTS public.project_task_assignees (
  task_id uuid NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_task_assignees TO authenticated;
GRANT ALL ON public.project_task_assignees TO service_role;

ALTER TABLE public.project_task_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view task assignees"
  ON public.project_task_assignees FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert task assignees"
  ON public.project_task_assignees FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can delete task assignees"
  ON public.project_task_assignees FOR DELETE
  TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.notify_task_assignee_multi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := COALESCE(NEW.assigned_by, auth.uid());
  v_actor_name text;
  v_project_name text;
  v_project_id uuid;
  v_task_name text;
BEGIN
  IF NEW.user_id = v_actor_id THEN
    RETURN NEW;
  END IF;

  SELECT t.project_id, t.name INTO v_project_id, v_task_name
    FROM public.project_tasks t WHERE t.id = NEW.task_id;

  SELECT name INTO v_project_name FROM public.projects WHERE id = v_project_id;
  SELECT COALESCE(full_name, email, 'Alguien') INTO v_actor_name
    FROM public.profiles WHERE user_id = v_actor_id LIMIT 1;

  INSERT INTO public.notificaciones (user_id, created_by, tipo, titulo, mensaje, link, metadata)
  VALUES (
    NEW.user_id,
    v_actor_id,
    'tarea_asignada',
    'Se te asignó una tarea',
    COALESCE(v_actor_name, 'Alguien') || ' te asignó la tarea "' || COALESCE(v_task_name, 'sin nombre') || '"' ||
      CASE WHEN v_project_name IS NOT NULL THEN ' en el proyecto "' || v_project_name || '"' ELSE '' END,
    '/proyectos?project=' || v_project_id::text,
    jsonb_build_object('project_id', v_project_id, 'task_id', NEW.task_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_assignee_multi ON public.project_task_assignees;
CREATE TRIGGER trg_notify_task_assignee_multi
  AFTER INSERT ON public.project_task_assignees
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_assignee_multi();
