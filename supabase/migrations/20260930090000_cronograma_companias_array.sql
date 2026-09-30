-- Una actividad puede aplicar a varias compañías a la vez (ej. las 3 de
-- Venezuela) sin tener que duplicarla en varias filas: "compania" (un solo
-- valor) se reemplaza por "companias" (lista). Antes de borrar la columna
-- vieja, se fusionan en una sola fila las actividades que hoy están
-- repetidas SOLO por compañía (mismo proceso, año, nombre, meses,
-- responsable, estado y recordatorio) — se conserva la fila que ya tenga un
-- seguimiento vinculado (si alguna lo tiene) y se borran las demás.
--
-- Cada sentencia de este script es autocontenida (no depende de tablas
-- creadas por sentencias anteriores) para evitar problemas si el editor
-- reparte el script entre distintas conexiones.

ALTER TABLE public.cronograma_actividades ADD COLUMN IF NOT EXISTS companias text[];

UPDATE public.cronograma_actividades
SET companias = ARRAY[compania]
WHERE compania IS NOT NULL AND companias IS NULL;

-- Propaga el array combinado de compañías a TODAS las filas de cada grupo
-- duplicado (no solo a la que sobrevivirá).
UPDATE public.cronograma_actividades a
SET companias = sub.companias_agg
FROM (
  SELECT proceso_id, anio, nombre, meses, responsable_user_id, estado, dias_recordatorio, frecuencia_recordatorio,
         array_agg(DISTINCT compania ORDER BY compania) AS companias_agg
  FROM public.cronograma_actividades
  WHERE compania IS NOT NULL
  GROUP BY proceso_id, anio, nombre, meses, responsable_user_id, estado, dias_recordatorio, frecuencia_recordatorio
  -- Solo se fusiona automáticamente si hay a lo sumo una fila con
  -- seguimiento vinculado (evita perder un enlace si dos duplicados tienen
  -- cada uno el suyo).
  HAVING count(*) > 1 AND count(*) FILTER (WHERE seguimiento_id IS NOT NULL) <= 1
) sub
WHERE a.compania IS NOT NULL
  AND a.proceso_id = sub.proceso_id
  AND a.anio = sub.anio
  AND a.nombre = sub.nombre
  AND a.meses = sub.meses
  AND a.responsable_user_id IS NOT DISTINCT FROM sub.responsable_user_id
  AND a.estado = sub.estado
  AND a.dias_recordatorio = sub.dias_recordatorio
  AND a.frecuencia_recordatorio = sub.frecuencia_recordatorio;

-- Borra todas las filas del grupo menos una (se conserva la que ya tenga
-- seguimiento vinculado, o si ninguna lo tiene, la más antigua).
WITH ranked AS (
  SELECT id,
    row_number() OVER (
      PARTITION BY proceso_id, anio, nombre, meses, responsable_user_id, estado, dias_recordatorio, frecuencia_recordatorio
      ORDER BY (seguimiento_id IS NOT NULL) DESC, created_at ASC
    ) AS rn,
    count(*) OVER (
      PARTITION BY proceso_id, anio, nombre, meses, responsable_user_id, estado, dias_recordatorio, frecuencia_recordatorio
    ) AS grp_count,
    count(*) FILTER (WHERE seguimiento_id IS NOT NULL) OVER (
      PARTITION BY proceso_id, anio, nombre, meses, responsable_user_id, estado, dias_recordatorio, frecuencia_recordatorio
    ) AS grp_seg_count
  FROM public.cronograma_actividades
  WHERE compania IS NOT NULL
)
DELETE FROM public.cronograma_actividades
WHERE id IN (SELECT id FROM ranked WHERE rn > 1 AND grp_count > 1 AND grp_seg_count <= 1);

ALTER TABLE public.cronograma_actividades DROP COLUMN IF EXISTS compania;

ALTER TABLE public.cronograma_actividades
  DROP CONSTRAINT IF EXISTS cronograma_actividades_companias_check;
ALTER TABLE public.cronograma_actividades
  ADD CONSTRAINT cronograma_actividades_companias_check
  CHECK (companias IS NULL OR companias <@ ARRAY['Febeca', 'Sillaca', 'Beval', 'Mundial de Partes', 'Cofersa']::text[]);
