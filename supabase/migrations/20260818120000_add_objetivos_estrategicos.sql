-- ============================================================
-- Migration: Objetivos Estratégicos (catálogo + vínculo con proyectos)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.objetivos_estrategicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  pilar TEXT NOT NULL,
  color TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.objetivos_estrategicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users to select objetivos_estrategicos"
  ON public.objetivos_estrategicos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to insert objetivos_estrategicos"
  ON public.objetivos_estrategicos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update objetivos_estrategicos"
  ON public.objetivos_estrategicos FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to delete objetivos_estrategicos"
  ON public.objetivos_estrategicos FOR DELETE
  TO authenticated
  USING (true);

INSERT INTO public.objetivos_estrategicos (nombre, pilar, color, orden) VALUES
  ('Maximizar la gestión comercial', 'Ingresos', 'green', 1),
  ('Maximizar la eficiencia', 'Eficiencia', 'orange', 2),
  ('Garantizar procesos', 'Procesos', 'blue', 3),
  ('Garantizar talento', 'Talento', 'purple', 4);

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS objetivo_estrategico_id UUID REFERENCES public.objetivos_estrategicos(id);
