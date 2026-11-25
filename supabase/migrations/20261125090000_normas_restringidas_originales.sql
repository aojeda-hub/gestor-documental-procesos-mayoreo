-- Normas restringidas de Personal (2026-11-25).
--
-- Contexto: el 2026-11-24 la limpieza de duplicados vinculó 14 normas del Mapa de
-- Procesos a sus copias PDF en "Documentación / Personal / Normas Restringidas
-- Personal PDF". Hoy esa carpeta ya no está en la unidad y la sincronización
-- marcó esas normas como "desincorporado". Los archivos principales son los
-- originales de la unidad "Documentación restringida Personal / Personal /
-- Normas Restringidas", que pasan a sincronizarse desde ahora.

BEGIN;

-- 1) Restaurar el estatus que tenían las normas del Mapa antes de que la
--    sincronización las desincorporara (sale del historial de estatus).
UPDATE public.documents d
SET estatus = h.estatus_anterior
FROM (
  SELECT DISTINCT ON (document_id) document_id, estatus_anterior
  FROM public.documento_estatus_historial
  WHERE estatus_nuevo = 'desincorporado' AND changed_at >= '2026-11-25 12:00+00'
  ORDER BY document_id, changed_at DESC
) h
WHERE d.id = h.document_id
  AND d.macroproceso_codigo IS NOT NULL
  AND d.drive_eliminado_at >= '2026-11-25 12:00+00'
  AND h.estatus_anterior IS NOT NULL;

-- 2) Volver a apuntar esas normas a su archivo ORIGINAL (su drive_link ya lo
--    tenía). Si el enlace era el propio PDF, se limpia para que la
--    sincronización las empareje por título con el original.
UPDATE public.documents
SET drive_file_id = CASE
      WHEN substring(drive_link from '(?:/d/|[?&]id=)([a-zA-Z0-9_-]{20,})') <> drive_file_id
        THEN substring(drive_link from '(?:/d/|[?&]id=)([a-zA-Z0-9_-]{20,})')
      ELSE NULL END,
    drive_link = CASE
      WHEN substring(drive_link from '(?:/d/|[?&]id=)([a-zA-Z0-9_-]{20,})') = drive_file_id THEN NULL
      ELSE drive_link END,
    drive_path = NULL, drive_nombre = NULL, drive_modified_at = NULL,
    drive_visto_at = NULL, drive_eliminado_at = NULL
WHERE macroproceso_codigo IS NOT NULL
  AND drive_path ILIKE '%/ Normas Restringidas Personal PDF';

-- 3) Dato erróneo previo: un "Evaluación de Competencias" del Mapa tenía como
--    enlace el archivo de "Captación de Personal". Se le quita, para que ese
--    archivo quede para la norma "Captación de Personal".
UPDATE public.documents
SET drive_file_id = NULL, drive_link = NULL, drive_path = NULL, drive_nombre = NULL,
    drive_modified_at = NULL, drive_visto_at = NULL, drive_eliminado_at = NULL
WHERE macroproceso_codigo IS NOT NULL
  AND title = 'Evaluación de Competencias'
  AND drive_file_id = '1W9J7ji0F4Xj8gnbGCUGSdYyncid68Xwu';

-- 4) Copias creadas por la sincronización desde esos PDF, cuyo original sí está
--    en la unidad restringida (la sincronización las recrea desde el original).
DELETE FROM public.documents
WHERE macroproceso_codigo IS NULL
  AND created_by IS NULL
  AND drive_path ILIKE '%/ Normas Restringidas Personal PDF'
  AND title IN ('Norma de aprobación de publicación de vacantes en proceso de captación',
                'Norma Exámenes Pre-Empleo',
                'Norma Ingreso de Colaboradores');

COMMIT;
