-- Resuelve los casos de revisión de las normas de Personal (2026-11-25).
-- En cada caso el archivo está en una carpeta de Normas, así que se vincula al
-- candidato de tipo Norma; los otros documentos se conservan sin el archivo.
-- Sin tablas temporales (el SQL Editor de Supabase ejecuta sentencia por sentencia).

BEGIN;

-- 1) Vincular cada archivo a su norma (mismos campos que deja la sincronización).
UPDATE public.documents d
SET drive_file_id = v.fid,
    drive_link = COALESCE(d.drive_link, r.drive_link),
    drive_path = r.drive_path,
    drive_nombre = r.title,
    drive_visto_at = now(),
    drive_eliminado_at = NULL,
    confidential = d.confidential OR r.drive_path ILIKE '%restringid%'
FROM (VALUES
  ('f3dbcc3a-ea92-45a5-bfdd-09468dff0224'::uuid, '1WenUdw21RyG9SN6RSGyohrNxpAr15GEJfHmM4gsbcsg'),   -- Entrevista a Candidatos (NO01)
  ('46a6ce50-d3a0-4c61-b097-1f343e687da5'::uuid, '1NSD9rjytgokPzIGpTWfJgN77-rnCqlJAx-BpiCdfKyE'),   -- Actividades de Bienestar (NO01)
  ('48799294-8ea9-421f-a435-4e7e43dd49f1'::uuid, '15MJL1LAymPA3uq2kelYaafRthubVbvFi74yc9Uhd934'),   -- Gestión de Reconocimiento (NO01)
  ('e9be43e1-9fc0-455c-b095-f979a4e8bf2a'::uuid, '16YFLaGBL4J5Sy1tg341KL7fEdZPWqPOK'),              -- Capacitación de personal
  ('a57b2801-d997-42f6-9a08-de218298bdc5'::uuid, '15ZQyr6zWs98nAYQlEG1OyZiFRr1O9wP23m0-4t0Yr9w')    -- Seguimiento desempeño fuerza de ventas
) AS v(doc_id, fid)
JOIN public.drive_sync_revision r ON r.drive_file_id = v.fid
WHERE d.id = v.doc_id;

-- 2) Las copias que también apuntaban a esos archivos quedan sin enlace.
UPDATE public.documents
SET drive_file_id = NULL, drive_link = NULL, drive_path = NULL, drive_nombre = NULL,
    drive_modified_at = NULL, drive_visto_at = NULL, drive_eliminado_at = NULL
WHERE id IN ('e512f5fc-e81c-4d11-a190-f77850908bd3',   -- "Norma Capacitación del Personal.docx" (Sistemas)
             '6a7da70b-e479-4dd5-a521-76487edd1a86');  -- "Seguimiento de Desempeño..." (Ventas)

-- 3) Casos resueltos fuera de la lista de revisión.
DELETE FROM public.drive_sync_revision
WHERE drive_file_id IN ('1WenUdw21RyG9SN6RSGyohrNxpAr15GEJfHmM4gsbcsg', '1NSD9rjytgokPzIGpTWfJgN77-rnCqlJAx-BpiCdfKyE',
                        '15MJL1LAymPA3uq2kelYaafRthubVbvFi74yc9Uhd934', '16YFLaGBL4J5Sy1tg341KL7fEdZPWqPOK',
                        '15ZQyr6zWs98nAYQlEG1OyZiFRr1O9wP23m0-4t0Yr9w');

-- 4) Archivo en la carpeta "Políticas": es una política, no una norma.
UPDATE public.documents SET doc_type = 'politica'
WHERE id = 'aa458689-370b-48c8-9a02-1aa4af85ec5e';

-- 5) Son formatos (confirmado por Procesos). El trigger de drive_movimientos anota
--    el movimiento y el Apps Script mueve cada archivo a "Personal / Formatos".
UPDATE public.documents SET doc_type = 'formato'
WHERE id IN ('0194fad3-7aa4-40eb-aeba-7a7bdccde6fa',   -- Descripción de cargo (estaba en Personal/Normas)
             'ca84b212-7729-4a6b-aff4-14ab1eae3b84',   -- Préstamos a Colaboradores (estaba en Personal/Otros)
             '24d446af-e3dc-402f-ba19-0038a91eb5b5');  -- Implementación del teletrabajo (estaba en Personal/Otros)

COMMIT;
