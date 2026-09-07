-- Cada año tiene su propio cronograma independiente: se agrega el año al
-- que pertenece cada actividad (y sus meses marcados), para poder filtrar
-- por año y copiar el cronograma de un año a otro sin mezclar datos.
-- Las actividades existentes (cargadas del PDF 2026-2027) quedan en 2026.
ALTER TABLE public.cronograma_actividades ADD COLUMN IF NOT EXISTS anio integer NOT NULL DEFAULT 2026;
