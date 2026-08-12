-- ============================================================
-- Migration: Create hitos (milestones) and dependencias (task dependencies) tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hitos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  fecha_planeada DATE NOT NULL,
  fecha_real DATE,
  completado BOOLEAN DEFAULT FALSE,
  fase_asociada VARCHAR(50), -- 'Alineación', 'Diseño', etc. NULL = hito general del proyecto
  orden INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.hitos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users to select hitos"
  ON public.hitos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to insert hitos"
  ON public.hitos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update hitos"
  ON public.hitos FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to delete hitos"
  ON public.hitos FOR DELETE
  TO authenticated
  USING (true);

CREATE TRIGGER update_hitos_updated_at
  BEFORE UPDATE ON public.hitos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================

CREATE TABLE IF NOT EXISTS public.dependencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tarea_origen UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE, -- debe completarse primero
  tarea_destino UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE, -- depende de la anterior
  tipo VARCHAR(10) NOT NULL DEFAULT 'FS' CHECK (tipo IN ('FS', 'SS', 'FF', 'SF')),
  retraso_dias INT DEFAULT 0,
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_no_self_dependency CHECK (tarea_origen <> tarea_destino)
);

-- Prevent duplicate active dependencies between the same pair of tasks
CREATE UNIQUE INDEX IF NOT EXISTS uq_dependencia_activa
  ON public.dependencias (tarea_origen, tarea_destino)
  WHERE activa = true;

ALTER TABLE public.dependencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users to select dependencias"
  ON public.dependencias FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to insert dependencias"
  ON public.dependencias FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update dependencias"
  ON public.dependencias FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to delete dependencias"
  ON public.dependencias FOR DELETE
  TO authenticated
  USING (true);
