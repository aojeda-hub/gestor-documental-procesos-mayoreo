-- Soporta la deteccion de bloqueos en Sprint Semanal: cuanto tiempo lleva una
-- tarea en su columna actual. DEFAULT now() se evalua una sola vez para las
-- filas existentes, asi que las tareas ya cargadas quedan marcadas como
-- "recien entraron" en el momento del despliegue (sin falsos positivos).
ALTER TABLE public.seguimientos
  ADD COLUMN column_entered_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_seguimiento_column_entered_at()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.column_id IS DISTINCT FROM OLD.column_id THEN
    NEW.column_entered_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_seguimiento_column_entered_at ON public.seguimientos;
CREATE TRIGGER trg_seguimiento_column_entered_at
  BEFORE INSERT OR UPDATE ON public.seguimientos
  FOR EACH ROW EXECUTE FUNCTION public.set_seguimiento_column_entered_at();
