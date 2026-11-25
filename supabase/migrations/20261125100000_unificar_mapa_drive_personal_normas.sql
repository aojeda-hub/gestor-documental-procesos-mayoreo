-- Unifica normas de Personal que estaban dos veces: la entrada del Mapa de
-- Procesos (con su código y estatus, sin archivo) y el documento que creó la
-- sincronización desde Drive con un nombre un poco distinto. Pares confirmados
-- por Procesos el 2026-11-25.
--
-- Para cada par: la entrada del Mapa recibe el archivo de Drive (queda con su
-- código, título y estatus del Mapa) y se elimina el documento creado por la
-- sincronización (sin versiones, indicadores ni alertas).

BEGIN;

CREATE TEMP TABLE pares (mapa_id uuid, drive_id uuid) ON COMMIT DROP;
INSERT INTO pares VALUES
  ('22dbbe38-1088-4e40-862b-8662a9e3d49e', 'ca75d9cc-3027-4cbd-b873-1a97a61d2598'), -- Exámen Pre-Empleo <- Exámenes Pre-Empleo
  ('733cb871-673f-4ae4-aaf9-a0bfc4405b8f', 'c95e52d1-a23c-44b8-a3e3-484f3d9373ac'), -- Inducción a Colaboradores <- Inducción Colaboradores
  ('6e09693b-cefe-4658-9f27-6a734f047aef', '7dd0322a-8118-4d92-a811-1fe82bf097d9'), -- Vacaciones colaborador <- Vacaciones de Colaboradores
  ('5305f3c6-e526-465f-93ac-c1b2098b3d2b', '30d5b2cd-855f-4bb7-9760-7cf4240ea2a8'), -- Ingreso del colaborador <- Ingreso de Colaboradores
  ('fba0e30d-1d8c-41bd-8a76-ab53dfa74db1', '6d89655d-b258-4450-815a-5ba7a7463786'), -- Suspensiones de Colaboradores <- Suspensión de Colaboradores (por iniciar)
  ('23ad7072-9262-45ab-9798-4125f376c45a', '2673d8ce-41b5-469a-8ba4-8c557e60cf9c'), -- Conato de Incendio <- Conato de Incendios
  ('eddf7568-8ccb-4758-8029-61a5199caac3', '133df3a5-01c1-4bc2-be3c-d45b0d843fe4'), -- Respuestas ante Sismos <- Respuesta ante Sismos
  ('db3221fe-335d-4961-a3de-4da67465fbc3', '1b46439b-08b6-49ed-91ac-fc8ec84200ec'), -- Beneficios del Colaborador <- Beneficios de los Colaboradores
  ('0e2b8c31-d809-4245-9d7f-80a49a7298ec', '2041ea0f-03a8-4621-b18b-7c22e878f19c'), -- Dotación de Equipos de Protección Personal
  ('c555ceab-b72e-442d-b065-17cac05dfd69', 'a8e2fe2b-d5b5-4574-b984-6b8c3d5b926f'), -- Revisión del Sistema contra Incendio (del Edificio)
  ('2cc4eaec-4991-4342-b10a-c984a586cbcf', '3d1b1279-ca87-40dc-b47b-0bdd0adf7f75'), -- Protocolo manejo Sustancias peligrosas <- Manejo de Derrame de Sustancias Peligrosas
  ('0eaf72f7-81a2-41b5-86c1-8218bc5b0013', 'ccb02a81-2f36-41e4-b3bc-5146d9acf2d7'), -- Protocolo Vehículos cargados <- Inspección de vehículos cargados para despacho
  ('09616817-6145-4993-9d18-3d95b7be4e52', '28654f65-87a4-4421-a3ce-c7532592f0d2'), -- Control de Acceso a las Instalaciones <- Control de Acceso y permanencia...
  ('e404e48e-ced5-4370-9f0a-583e6d9cb8ca', 'c38a2ef2-5da0-479f-b6c0-d9ba07bd28e3'), -- Comunicaciones internas <- Comunicaciones internas al colaborador
  ('ff3a9917-8977-4d9b-ba75-c3995fde19b6', 'ae9fe394-7c12-4dba-b9e8-0132c7ad2468'); -- Uso de Lockers en Instalaciones <- Uso de Lockers

-- Seguridad: solo pares donde el lado "Drive" lo creó la sincronización y no
-- tiene nada colgando (si no, el par se salta).
DELETE FROM pares p
WHERE EXISTS (SELECT 1 FROM public.documents d WHERE d.id = p.drive_id
                AND (d.created_by IS NOT NULL OR d.macroproceso_codigo IS NOT NULL))
   OR EXISTS (SELECT 1 FROM public.document_versions v WHERE v.document_id = p.drive_id)
   OR EXISTS (SELECT 1 FROM public.document_indicators i WHERE i.document_id = p.drive_id)
   OR EXISTS (SELECT 1 FROM public.review_alerts r WHERE r.document_id = p.drive_id);

-- 1) La entrada del Mapa recibe el archivo.
UPDATE public.documents m
SET drive_file_id = d.drive_file_id,
    drive_link = d.drive_link,
    drive_path = d.drive_path,
    drive_nombre = d.drive_nombre,
    drive_modified_at = d.drive_modified_at,
    drive_visto_at = d.drive_visto_at,
    drive_eliminado_at = NULL,
    confidential = m.confidential OR d.confidential
FROM pares p
JOIN public.documents d ON d.id = p.drive_id
WHERE m.id = p.mapa_id;

-- 2) Se elimina el documento duplicado creado por la sincronización.
DELETE FROM public.documents WHERE id IN (SELECT drive_id FROM pares);

COMMIT;
-- (Aplicada el 2026-11-25: 15 pares unificados. El SQL Editor de Supabase no ve la
-- tabla temporal después del COMMIT, por eso aquí no hay un SELECT de conteo.)
