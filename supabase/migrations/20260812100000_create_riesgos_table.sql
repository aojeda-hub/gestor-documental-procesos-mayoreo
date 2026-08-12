-- ============================================================
-- Migration: Create riesgos table and RLS policies
-- ============================================================

CREATE TABLE IF NOT EXISTS public.riesgos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  probabilidad VARCHAR(20) NOT NULL, -- 'Baja', 'Media', 'Alta'
  impacto VARCHAR(20) NOT NULL, -- 'Bajo', 'Medio', 'Alto', 'Crítico'
  categoria VARCHAR(50) DEFAULT 'Otro', -- 'Técnico', 'Organizacional', 'Externo', 'Costo', 'Tiempo', 'Otro'
  fase_afectada VARCHAR(50),
  tarea_afectada UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL,
  plan_mitigacion TEXT,
  responsable_mitigacion VARCHAR(100),
  fecha_identificacion DATE NOT NULL DEFAULT CURRENT_DATE,
  estado VARCHAR(20) DEFAULT 'Activo', -- 'Activo', 'Mitigado', 'Cerrado'
  fecha_cierre DATE,
  evidencia_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.riesgos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all authenticated users to select riesgos"
  ON public.riesgos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to insert riesgos"
  ON public.riesgos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update riesgos"
  ON public.riesgos FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to delete riesgos"
  ON public.riesgos FOR DELETE
  TO authenticated
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_riesgos_updated_at
  BEFORE UPDATE ON public.riesgos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
