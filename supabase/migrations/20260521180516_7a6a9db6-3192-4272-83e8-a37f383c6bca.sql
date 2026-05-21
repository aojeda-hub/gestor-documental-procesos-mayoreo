
-- Habilitar realtime en notificaciones
ALTER TABLE public.notificaciones REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notificaciones'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;
  END IF;
END$$;

-- Trigger para crear notificación automática al agregar un miembro a un seguimiento
CREATE OR REPLACE FUNCTION public.notify_seguimiento_miembro()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_titulo text;
  v_actor_name text;
BEGIN
  SELECT user_id, titulo INTO v_owner_id, v_titulo
  FROM public.seguimientos WHERE id = NEW.seguimiento_id;

  -- No notificar si el miembro es la misma persona que lo agregó (dueño)
  IF NEW.member_user_id = v_owner_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, email, 'Alguien') INTO v_actor_name
  FROM public.profiles WHERE user_id = v_owner_id LIMIT 1;

  INSERT INTO public.notificaciones (user_id, created_by, tipo, titulo, mensaje, link, metadata)
  VALUES (
    NEW.member_user_id,
    v_owner_id,
    'seguimiento_miembro',
    'Fuiste agregado a un seguimiento',
    COALESCE(v_actor_name, 'Alguien') || ' te agregó a "' || COALESCE(v_titulo, 'un seguimiento') || '" para colaborar.',
    '/seguimientos',
    jsonb_build_object('seguimiento_id', NEW.seguimiento_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_seguimiento_miembro ON public.seguimiento_miembros;
CREATE TRIGGER trg_notify_seguimiento_miembro
AFTER INSERT ON public.seguimiento_miembros
FOR EACH ROW
EXECUTE FUNCTION public.notify_seguimiento_miembro();
