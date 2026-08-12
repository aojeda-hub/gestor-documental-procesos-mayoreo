-- ============================================================
-- Migration: Create phase_gate_checklist table and default seed trigger
-- ============================================================

CREATE TABLE IF NOT EXISTS public.phase_gate_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  fase VARCHAR(50) NOT NULL, -- 'Alineación', 'Diseño', 'Construcción', 'Implementación', 'Adopción'
  item VARCHAR(255) NOT NULL,
  completado BOOLEAN DEFAULT FALSE,
  evidencia_url VARCHAR(500),
  comentario TEXT,
  fecha_completado TIMESTAMP WITH TIME ZONE,
  usuario_completado VARCHAR(100),
  orden INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.phase_gate_checklist ENABLE ROW LEVEL SECURITY;

-- Policies for phase_gate_checklist
CREATE POLICY "Allow all authenticated users to select phase_gate_checklist"
  ON public.phase_gate_checklist FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to insert phase_gate_checklist"
  ON public.phase_gate_checklist FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update phase_gate_checklist"
  ON public.phase_gate_checklist FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to delete phase_gate_checklist"
  ON public.phase_gate_checklist FOR DELETE
  TO authenticated
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_phase_gate_checklist_updated_at
  BEFORE UPDATE ON public.phase_gate_checklist
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Auto-create 5 checklist items per phase when a project is created
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_default_checklists_for_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ALINEACIÓN (5 items)
  INSERT INTO public.phase_gate_checklist (project_id, fase, item, orden) VALUES
    (NEW.id, 'Alineación', 'Acta de constitución del proyecto firmada por Sponsor', 1),
    (NEW.id, 'Alineación', 'Sponsor/Patrocinador oficialmente asignado', 2),
    (NEW.id, 'Alineación', 'Alcance preliminar aprobado por el Sponsor', 3),
    (NEW.id, 'Alineación', 'Interesados clave identificados y documentados', 4),
    (NEW.id, 'Alineación', 'Objetivo general validado con el negocio', 5)
  ON CONFLICT DO NOTHING;

  -- DISEÑO (5 items)
  INSERT INTO public.phase_gate_checklist (project_id, fase, item, orden) VALUES
    (NEW.id, 'Diseño', 'Documento de arquitectura técnica aprobado', 1),
    (NEW.id, 'Diseño', 'Prototipos o maquetas validadas con usuarios clave', 2),
    (NEW.id, 'Diseño', 'Plan de pruebas (unitarias, integración, aceptación) aceptado', 3),
    (NEW.id, 'Diseño', 'Estimación de esfuerzo (horas/días) revisada y aprobada', 4),
    (NEW.id, 'Diseño', 'Cronograma detallado de construcción definido', 5)
  ON CONFLICT DO NOTHING;

  -- CONSTRUCCIÓN (5 items)
  INSERT INTO public.phase_gate_checklist (project_id, fase, item, orden) VALUES
    (NEW.id, 'Construcción', 'Todas las tareas de la fase al 100% de avance (automático)', 1),
    (NEW.id, 'Construcción', 'Pruebas unitarias con cobertura > 80% (si aplica)', 2),
    (NEW.id, 'Construcción', 'Código/configuración revisado por pares', 3),
    (NEW.id, 'Construcción', 'Documentación técnica actualizada', 4),
    (NEW.id, 'Construcción', 'Entregables parciales aceptados por el Sponsor', 5)
  ON CONFLICT DO NOTHING;

  -- IMPLEMENTACIÓN (5 items)
  INSERT INTO public.phase_gate_checklist (project_id, fase, item, orden) VALUES
    (NEW.id, 'Implementación', 'Plan de rollout (despliegue) aprobado por Comité de Cambios', 1),
    (NEW.id, 'Implementación', 'Ambiente de producción preparado y validado', 2),
    (NEW.id, 'Implementación', 'Plan de reversión (Backout plan) definido y probado', 3),
    (NEW.id, 'Implementación', 'Pruebas de integración exitosas en pre-producción', 4),
    (NEW.id, 'Implementación', 'Usuarios clave capacitados en el nuevo sistema', 5)
  ON CONFLICT DO NOTHING;

  -- ADOPCIÓN (5 items)
  INSERT INTO public.phase_gate_checklist (project_id, fase, item, orden) VALUES
    (NEW.id, 'Adopción', 'Entrenamiento a todos los usuarios finales completado', 1),
    (NEW.id, 'Adopción', 'Documentación final del proyecto (técnica + funcional) entregada', 2),
    (NEW.id, 'Adopción', 'Acta de cierre de proyecto firmada por el Sponsor', 3),
    (NEW.id, 'Adopción', 'Lecciones aprendidas documentadas en el sistema', 4),
    (NEW.id, 'Adopción', 'Todos los entregables transferidos a operaciones', 5)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_default_checklists ON public.projects;

CREATE TRIGGER trg_create_default_checklists
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.create_default_checklists_for_project();

-- ============================================================
-- Back-fill checklist items for existing projects
-- ============================================================
DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT id FROM public.projects
    WHERE id NOT IN (SELECT DISTINCT project_id FROM public.phase_gate_checklist)
  LOOP
    -- ALINEACIÓN
    INSERT INTO public.phase_gate_checklist (project_id, fase, item, orden) VALUES
      (p.id, 'Alineación', 'Acta de constitución del proyecto firmada por Sponsor', 1),
      (p.id, 'Alineación', 'Sponsor/Patrocinador oficialmente asignado', 2),
      (p.id, 'Alineación', 'Alcance preliminar aprobado por el Sponsor', 3),
      (p.id, 'Alineación', 'Interesados clave identificados y documentados', 4),
      (p.id, 'Alineación', 'Objetivo general validado con el negocio', 5),
    -- DISEÑO
      (p.id, 'Diseño', 'Documento de arquitectura técnica aprobado', 1),
      (p.id, 'Diseño', 'Prototipos o maquetas validadas con usuarios clave', 2),
      (p.id, 'Diseño', 'Plan de pruebas (unitarias, integración, aceptación) aceptado', 3),
      (p.id, 'Diseño', 'Estimación de esfuerzo (horas/días) revisada y aprobada', 4),
      (p.id, 'Diseño', 'Cronograma detallado de construcción definido', 5),
    -- CONSTRUCCIÓN
      (p.id, 'Construcción', 'Todas las tareas de la fase al 100% de avance (automático)', 1),
      (p.id, 'Construcción', 'Pruebas unitarias con cobertura > 80% (si aplica)', 2),
      (p.id, 'Construcción', 'Código/configuración revisado por pares', 3),
      (p.id, 'Construcción', 'Documentación técnica actualizada', 4),
      (p.id, 'Construcción', 'Entregables parciales aceptados por el Sponsor', 5),
    -- IMPLEMENTACIÓN
      (p.id, 'Implementación', 'Plan de rollout (despliegue) aprobado por Comité de Cambios', 1),
      (p.id, 'Implementación', 'Ambiente de producción preparado y validado', 2),
      (p.id, 'Implementación', 'Plan de reversión (Backout plan) definido y probado', 3),
      (p.id, 'Implementación', 'Pruebas de integración exitosas en pre-producción', 4),
      (p.id, 'Implementación', 'Usuarios clave capacitados en el nuevo sistema', 5),
    -- ADOPCIÓN
      (p.id, 'Adopción', 'Entrenamiento a todos los usuarios finales completado', 1),
      (p.id, 'Adopción', 'Documentación final del proyecto (técnica + funcional) entregada', 2),
      (p.id, 'Adopción', 'Acta de cierre de proyecto firmada por el Sponsor', 3),
      (p.id, 'Adopción', 'Lecciones aprendidas documentadas en el sistema', 4),
      (p.id, 'Adopción', 'Todos los entregables transferidos a operaciones', 5)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
