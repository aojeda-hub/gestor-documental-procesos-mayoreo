-- Limpieza de duplicados creados por la primera carga de la sincronización con
-- Drive (2026-11-24). Casi todos vienen de "Personal / Normas Restringidas
-- Personal PDF". El archivo en Drive se llama "Norma de X" / "Procedimiento
-- de Y", el documento del Mapa de Procesos se llama "X" / "Y" y además apuntaba
-- a otra copia fuera de la unidad, así que la sincronización no los reconoció
-- como el mismo documento y creó uno nuevo.
--
-- Qué hace:
--   - Si hay UN documento del Mapa equivalente (misma empresa, silo, tipo y
--     título sin el prefijo de tipo ni código): el archivo de Drive pasa a ese
--     documento del Mapa y se elimina la copia creada por la sincronización.
--   - Si hay VARIOS (el Mapa tiene el documento repetido): se elimina la copia y
--     el archivo queda en la lista de revisión (Administración > Sincronización
--     Drive) para elegir a cuál del Mapa vincularlo.
--   - No toca copias que alguien haya editado después de crearse.

WITH d AS (
  SELECT id, title, empresa, silo, doc_type, estatus, macroproceso_codigo,
         drive_file_id, drive_link, drive_path, drive_nombre, drive_modified_at,
         drive_visto_at, created_by, created_at, updated_at,
         regexp_replace(
           translate(lower(
             regexp_replace(
               regexp_replace(title, '^\s*([A-Z]{2,5}[0-9]{0,3}(-[A-Z0-9]{2,6})+)\s*', '', 'i'),
               '^\s*(normas?|procedimientos?|instructivos?|manual(es)?|pol[ií]ticas?|anexos?|formatos?|diagramas?)\y\s*(:|-)?\s*((de|del|para|sobre)\s+(la\s+|el\s+|los\s+|las\s+)?)?',
               '', 'i')),
             'áéíóúüñ', 'aeiouun'),
           '[^a-z0-9]+', '', 'g') AS clave
  FROM public.documents
),
copias AS (            -- creadas por la sincronización, nunca editadas
  SELECT * FROM d
  WHERE created_at >= '2026-11-24 17:00+00' AND created_by IS NULL
    AND drive_visto_at IS NOT NULL AND macroproceso_codigo IS NULL
    AND updated_at <= created_at + interval '1 minute'
    AND length(clave) > 3
),
mapa AS (              -- del Mapa, sin archivo de esta unidad vinculado
  SELECT * FROM d WHERE macroproceso_codigo IS NOT NULL AND drive_visto_at IS NULL
),
pares AS (
  SELECT c.id AS copia_id, c.drive_file_id, c.drive_link, c.drive_path, c.drive_nombre,
         c.drive_modified_at, c.title, c.empresa, c.silo,
         array_agg(m.id) AS mapa_ids,
         jsonb_agg(jsonb_build_object('id', m.id, 'title', m.title, 'silo', m.silo,
                                      'estatus', m.estatus, 'codigo_mapa', m.macroproceso_codigo)) AS candidatos
  FROM copias c
  JOIN mapa m ON m.empresa = c.empresa AND m.silo = c.silo AND m.doc_type = c.doc_type AND m.clave = c.clave
  GROUP BY c.id, c.drive_file_id, c.drive_link, c.drive_path, c.drive_nombre,
           c.drive_modified_at, c.title, c.empresa, c.silo
),
vinculados AS (
  UPDATE public.documents doc
  SET drive_file_id = p.drive_file_id,
      drive_link = COALESCE(doc.drive_link, p.drive_link),
      drive_path = p.drive_path,
      drive_nombre = p.drive_nombre,
      drive_modified_at = p.drive_modified_at,
      drive_visto_at = now(),
      drive_eliminado_at = NULL,
      -- Misma regla que la sincronización: archivo en carpeta "restringida" => confidencial.
      confidential = doc.confidential OR p.drive_path ILIKE '%restringid%'
  FROM pares p
  WHERE cardinality(p.mapa_ids) = 1 AND doc.id = p.mapa_ids[1]
  RETURNING doc.id
),
a_revision AS (
  INSERT INTO public.drive_sync_revision
    (drive_file_id, empresa, silo, title, drive_path, drive_link, motivo, candidatos)
  SELECT drive_file_id, empresa, silo, title, drive_path, drive_link, 'coincidencia_ambigua', candidatos
  FROM pares WHERE cardinality(mapa_ids) > 1
  ON CONFLICT (drive_file_id) DO UPDATE
    SET motivo = EXCLUDED.motivo, candidatos = EXCLUDED.candidatos, actualizado_at = now()
  RETURNING drive_file_id
),
eliminadas AS (
  DELETE FROM public.documents WHERE id IN (SELECT copia_id FROM pares)
  RETURNING id
)
SELECT (SELECT count(*) FROM vinculados) AS mapa_vinculados,
       (SELECT count(*) FROM a_revision) AS enviados_a_revision,
       (SELECT count(*) FROM eliminadas) AS copias_eliminadas;
