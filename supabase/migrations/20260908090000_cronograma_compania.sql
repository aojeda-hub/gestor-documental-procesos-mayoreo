-- Compañía (entidad) a la que pertenece cada actividad del cronograma, para
-- poder filtrar el cronograma por compañía. Nullable: las actividades
-- existentes quedan sin clasificar ("Sin asignar") y se siguen viendo con el
-- filtro "Global (todas)" hasta que se les asigne una compañía.
ALTER TABLE public.cronograma_actividades ADD COLUMN IF NOT EXISTS compania text;

ALTER TABLE public.cronograma_actividades
  DROP CONSTRAINT IF EXISTS cronograma_actividades_compania_check;
ALTER TABLE public.cronograma_actividades
  ADD CONSTRAINT cronograma_actividades_compania_check
  CHECK (compania IS NULL OR compania IN ('Febeca', 'Sillaca', 'Beval', 'Mundial de Partes', 'Cofersa'));
