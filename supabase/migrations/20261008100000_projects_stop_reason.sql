-- Motivo de detención/cancelación de un proyecto. Columna nueva, nullable,
-- sin default, sin tocar ninguna fila existente. 100% aditiva y reversible.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS stop_reason text;
