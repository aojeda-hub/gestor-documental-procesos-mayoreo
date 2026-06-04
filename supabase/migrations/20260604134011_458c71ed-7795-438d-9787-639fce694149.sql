
CREATE OR REPLACE FUNCTION public.notify_task_assignee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_name text;
  v_project_name text;
BEGIN
  IF NEW.assignee_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.assignee_id IS NOT DISTINCT FROM NEW.assignee_id THEN
    RETURN NEW;
  END IF;
  IF NEW.assignee_id = v_actor_id THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_project_name FROM public.projects WHERE id = NEW.project_id;
  SELECT COALESCE(full_name, email, 'Alguien') INTO v_actor_name
    FROM public.profiles WHERE user_id = v_actor_id LIMIT 1;

  INSERT INTO public.notificaciones (user_id, created_by, tipo, titulo, mensaje, link, metadata)
  VALUES (
    NEW.assignee_id,
    v_actor_id,
    'tarea_asignada',
    'Se te asignó una tarea',
    COALESCE(v_actor_name, 'Alguien') || ' te asignó la tarea "' || COALESCE(NEW.name, 'sin nombre') || '"' ||
      CASE WHEN v_project_name IS NOT NULL THEN ' en el proyecto "' || v_project_name || '"' ELSE '' END,
    '/proyectos?project=' || NEW.project_id::text,
    jsonb_build_object('project_id', NEW.project_id, 'task_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_assignee_ins ON public.project_tasks;
DROP TRIGGER IF EXISTS trg_notify_task_assignee_upd ON public.project_tasks;

CREATE TRIGGER trg_notify_task_assignee_ins
AFTER INSERT ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_assignee();

CREATE TRIGGER trg_notify_task_assignee_upd
AFTER UPDATE OF assignee_id ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_assignee();
