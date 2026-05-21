
CREATE TABLE public.notificaciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'general',
  titulo TEXT NOT NULL,
  mensaje TEXT,
  link TEXT,
  leida BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notificaciones_user_unread ON public.notificaciones(user_id, leida, created_at DESC);

ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
ON public.notificaciones FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated can create notifications"
ON public.notificaciones FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

CREATE POLICY "Users update own notifications"
ON public.notificaciones FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications"
ON public.notificaciones FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
