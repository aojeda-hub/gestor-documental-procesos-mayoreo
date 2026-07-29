CREATE TABLE public.incidencia_observaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incidencia_id uuid NOT NULL REFERENCES public.incidencias(id) ON DELETE CASCADE,
  contenido text NOT NULL,
  user_id uuid,
  autor_nombre text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidencia_observaciones TO authenticated;
GRANT ALL ON public.incidencia_observaciones TO service_role;

ALTER TABLE public.incidencia_observaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados pueden ver observaciones"
  ON public.incidencia_observaciones FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios crean sus observaciones"
  ON public.incidencia_observaciones FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios editan sus observaciones"
  ON public.incidencia_observaciones FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios borran sus observaciones"
  ON public.incidencia_observaciones FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_incidencia_observaciones_inc ON public.incidencia_observaciones(incidencia_id, created_at DESC);

CREATE TRIGGER trg_incidencia_observaciones_updated_at
  BEFORE UPDATE ON public.incidencia_observaciones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();