-- Estados de seguimiento
CREATE TYPE public.seguimiento_estado AS ENUM ('pendiente', 'en_revision', 'en_progreso', 'completado', 'cancelado');
CREATE TYPE public.seguimiento_prioridad AS ENUM ('baja', 'media', 'alta', 'critica');

CREATE TABLE public.seguimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  titulo text NOT NULL,
  descripcion text,
  estado public.seguimiento_estado NOT NULL DEFAULT 'pendiente',
  prioridad public.seguimiento_prioridad NOT NULL DEFAULT 'media',
  responsable text,
  categoria text,
  fecha_limite date,
  fecha_completado timestamptz,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seguimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own seguimientos" ON public.seguimientos
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own seguimientos" ON public.seguimientos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own seguimientos" ON public.seguimientos
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own seguimientos" ON public.seguimientos
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER set_seguimientos_updated_at
  BEFORE UPDATE ON public.seguimientos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.set_seguimiento_completado()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.estado = 'completado' AND (OLD.estado IS DISTINCT FROM 'completado') THEN
    NEW.fecha_completado = now();
  ELSIF NEW.estado <> 'completado' THEN
    NEW.fecha_completado = NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seguimiento_completado
  BEFORE UPDATE ON public.seguimientos
  FOR EACH ROW EXECUTE FUNCTION public.set_seguimiento_completado();

CREATE INDEX idx_seguimientos_user ON public.seguimientos(user_id);
CREATE INDEX idx_seguimientos_estado ON public.seguimientos(estado);