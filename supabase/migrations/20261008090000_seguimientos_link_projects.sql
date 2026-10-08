-- Conecta Seguimientos con el proyecto real (public.projects). Hoy
-- `seguimientos.proyecto` es solo texto libre (sin relación). Esto agrega una
-- columna nueva, nullable, sin default, sin tocar ninguna fila existente ni la
-- columna `proyecto` (que se sigue llenando en paralelo como antes, para no
-- romper nada de lo que ya la usa). 100% aditivo y reversible.
ALTER TABLE public.seguimientos
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_seguimientos_project_id ON public.seguimientos(project_id);
