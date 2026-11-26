-- Notificaciones por correo.
--
-- Cada aviso nuevo de la tabla notificaciones (la campanita) también se manda
-- por correo. Un Apps Script con una cuenta de Google Workspace de Mayoreo
-- (supabase/functions/notificar-email/apps-script.gs) pide cada minuto los
-- avisos pendientes a la función notificar-email y los envía por Gmail,
-- agrupando en un solo correo los de la misma persona.

ALTER TABLE public.notificaciones
  ADD COLUMN IF NOT EXISTS email_enviado_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_error text;

-- El historial no se manda: solo los avisos que lleguen desde ahora.
UPDATE public.notificaciones SET email_enviado_at = created_at WHERE email_enviado_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notificaciones_email_pendiente
  ON public.notificaciones (created_at) WHERE email_enviado_at IS NULL;

-- Toma (y marca como enviados) los avisos pendientes, con el correo de cada
-- destinatario. Se marcan al entregarlos para que nunca se manden dos veces;
-- si el envío falla, el script lo anota en email_error.
-- No se manda correo de lo que uno mismo hizo (created_by = user_id) ni de
-- avisos de más de 2 días (p. ej. si el script estuvo detenido).
CREATE OR REPLACE FUNCTION public.notificaciones_email_tomar(p_limite integer DEFAULT 200)
RETURNS TABLE (
  id uuid, email text, nombre text, tipo text, titulo text, mensaje text, link text, created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  WITH tomadas AS (
    SELECT n.id
      FROM public.notificaciones n
     WHERE n.email_enviado_at IS NULL
     ORDER BY n.created_at
     LIMIT p_limite
     FOR UPDATE SKIP LOCKED
  ), marcadas AS (
    UPDATE public.notificaciones n
       SET email_enviado_at = now()
      FROM tomadas t
     WHERE n.id = t.id
    RETURNING n.id, n.user_id, n.created_by, n.tipo, n.titulo, n.mensaje, n.link, n.created_at
  )
  SELECT m.id, u.email::text, coalesce(p.full_name, u.email)::text, m.tipo, m.titulo, m.mensaje, m.link, m.created_at
    FROM marcadas m
    JOIN auth.users u ON u.id = m.user_id
    LEFT JOIN public.profiles p ON p.user_id = m.user_id
   WHERE m.created_by IS DISTINCT FROM m.user_id
     AND m.created_at > now() - interval '2 days'
     AND u.email IS NOT NULL;
END;
$$;

-- Solo la función del servidor (service_role) puede llamarla.
REVOKE ALL ON FUNCTION public.notificaciones_email_tomar(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notificaciones_email_tomar(integer) TO service_role;
