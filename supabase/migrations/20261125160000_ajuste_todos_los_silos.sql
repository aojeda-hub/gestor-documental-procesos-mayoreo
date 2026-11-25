-- Ajuste de todos los silos para que la app refleje Drive (2026-11-25).
-- Decisiones confirmadas por Procesos:
--   * Pares Mapa <- Drive: 33 seguros + 17 probables (excepto "meta de cobro mensual"
--     y "control de Firmas y Roles de Usuarios Bancarios").
--   * Casos de revisión: se vincula el candidato cuyo tipo y silo coinciden con la carpeta.
--   * Tipo distinto a la carpeta: si el título dice el tipo, se mueve el archivo; si no, manda la carpeta.
--   * Documentos del Mapa en carpeta de otro tipo: manda el Mapa (se mueve el archivo).
--   * Archivos sin tipo: no se registran.
-- Sin tablas temporales: el SQL Editor de Supabase ejecuta sentencia por sentencia.

BEGIN;

-- A) 49 pares: la entrada del Mapa recibe el archivo del documento creado por la sincronización.
UPDATE public.documents m
SET drive_file_id = d.drive_file_id, drive_link = d.drive_link, drive_path = d.drive_path,
    drive_nombre = d.drive_nombre, drive_modified_at = d.drive_modified_at, drive_visto_at = d.drive_visto_at,
    drive_eliminado_at = NULL, confidential = m.confidential OR d.confidential
FROM (VALUES
  ('69254543-4a53-4ffb-b027-d866460b1987'::uuid, '712a15c2-38e0-42ad-a17a-d2bc6ed47233'::uuid), -- Registro de un nuevo proveedor en el recurso de aplicaciones MCG (CVP04-A7-T1-IU01) <- Instructivo para el registro de un nuevo proveedor en el recurso de aplicaciones MCG
  ('99b0b6c8-f14b-46a0-a189-733c7ebdda51'::uuid, 'ab9a3d5f-cf11-474d-903b-ec4a4accf102'::uuid), -- Compras MCG (CVP04-A6-T2-PR01) <- Procedimiento Compras MCG
  ('a520b853-6ea9-471e-9d54-349a5169366b'::uuid, 'df5b9039-3e46-4032-9e3e-134b6251a48b'::uuid), -- Programación de citas para la recepción de mercancía de proveedores (CVP04-A10-T1-AN01) <- Programación de citas de recepción de mercancía de proveedores
  ('a491fd25-95b9-4943-9faf-0410655d980f'::uuid, 'db000e4b-0cc8-4f6d-86e2-c007ad6d0885'::uuid), -- Solicitud de pedidos WMS - ERP. Taller (CVP06-A16-T1-PR01) <- Procedimiento solicitud de pedidos WMS - ERP Taller
  ('b297eb15-ba25-46f6-bfda-188e47e0d94f'::uuid, '221e0cb5-9211-4383-9b8f-93c46d4551cd'::uuid), -- Devolucion al cliente (CVP06-A18-T1-PR01) <- Procedimiento Devolucion al cliente (1)
  ('2484439d-a282-4a44-99bb-fd0e4e2f07be'::uuid, '9c1050af-93c3-48c1-a039-f02050908a72'::uuid), -- Facturación (CVP12-A4-T1-PR01) <- Procedimiento de Facturacion
  ('69a07eca-a7b0-4e67-91cc-9662a7eb6a00'::uuid, '5718f602-dbb0-44d5-a69e-64d94eb0ad48'::uuid), -- Cliente retira (CVP13-A2-T1-PR01) <- Procedimiento cliente retira
  ('a3b65df6-73b5-4407-b1be-293023f27515'::uuid, 'ae6f6685-90bf-4e74-b1d3-53f22f410601'::uuid), -- Plantilla comercial - Mayoreo (CVP02-A1-T4-FO03) <- Plantilla comercial - Mayoreo.
  ('5d7b078d-ed7b-4729-84c8-a9813d6e2796'::uuid, 'c170d4a7-4efc-425f-b687-f87f065d81ed'::uuid), -- Incoterms (CVP04-A1-T3-AN01) <- CPV04-T5-AN01 Incoterms
  ('f5d5eb72-25c4-4709-8ff2-3d78589cf507'::uuid, '63468d0a-63e9-4a4d-9213-1a48f43368dd'::uuid), -- Normativa de Base de Clientes Febeca (CVP11-A1-T9-NO01) <- FE-NO-MER-001 Normativa de Base de Clientes de Febeca
  ('a48d0075-4a5c-44a6-8743-fa575fbdae1d'::uuid, 'ae484fdf-be07-42ba-94de-7e4c31cb0482'::uuid), -- Normativa de Base de Clientes Beval (CVP11-A1-T9-NO02) <- BE-NO-MER-001 Normativa de Base de Clientes de Beval
  ('f94cf922-bddd-4793-8000-ea42f875f96c'::uuid, '5a824da6-f2f9-4b0c-b402-f92685c4578b'::uuid), -- Normativa de Base de Clientes de Sillaca (CVP11-A1-T9-NO03) <- SI-NO-MER-001 Normativa de Base de Clientes de Sillaca
  ('81cc2f1e-1b12-4c41-9d60-873e1538c58a'::uuid, 'ae26944f-cbf8-459b-8c6a-0281a5b38e9a'::uuid), -- Normativa de Base de Clientes de Cofersa (CVP11-A1-T9-NO04) <- CO-NO-MER-001 Normativa de Base de Clientes de Cofersa
  ('7cbbde40-e031-4092-b411-4f3e4e5fb28c'::uuid, '75d74153-9928-406b-a168-bdb3a19a4579'::uuid), -- Normativa de Base de Clientes de Mundipartes (CVP11-A1-T9-NO05) <- MP-NO-MER-001 Normativa de Base de Clientes de Mundipartes
  ('b2bfee5c-f00b-4891-a7c7-bff687e37d22'::uuid, '45aacea7-f780-444d-929b-452e16236722'::uuid), -- Liberación de Pedido (CVP15-A1-T1-NO01) <- Norma para la Liberación de Pedidos
  ('188ce99b-0be0-400c-8c25-c08684482a68'::uuid, '33d6c48c-9fc3-4c68-8d4f-d2d694cd5570'::uuid), -- Creación de Cliente Nuevo (CVP16-A2-T3-NO01) <- Creación de Clientes Nuevos
  ('8eef9f19-6522-4f53-9bb0-c6655f54ed42'::uuid, '8796c69a-b3ab-46d4-b4e7-d35916b746d0'::uuid), -- Reintegros a Clientes (CVP16-A2-T4-NO01) <- NORMA REINTEGRO A CLIENTES
  ('43f45a34-911c-4100-aac3-8bf9ed726d71'::uuid, '3f11a864-8123-482c-bfa0-1251772892ca'::uuid), -- Reintegros en Divisas a Clientes (CVP16-A3-T20-NO01) <- Norma para Reintegros en Divisas a Clientes
  ('9a5ff7f9-23b8-4a09-aa65-e9a87511a3d0'::uuid, '3be45069-3869-430e-ab8e-d148b9de6654'::uuid), -- Instructivo: Creación de  Proveedores SFL (SOP01-A3-T1-IN01) <- Instructivo: Creación de  Proveedores SFL
  ('2ff12a18-a066-40bf-9e00-e4d844028728'::uuid, '4c4fc5b9-79fc-40cd-9e72-1822f09d7aff'::uuid), -- Proyección y Monitoreo de Efectivo (SOP01-A4-T3-NO01) <- Proyección y Monitoreo de Efectivo
  ('9bdbeef4-b78d-4174-af40-5b78c7fc432c'::uuid, '6413ac41-afc5-4a92-b1ee-831bb0e771a8'::uuid), -- Toma Física de Inventario (TFI) (SOP03-A3-T1-NO01) <- Norma Toma Física de Inventario (TFI)
  ('d769e215-17ae-457b-8652-1963df7be4c4'::uuid, '5d124f47-9b84-4595-be76-278da4399985'::uuid), -- Creación de Bodegas (SOP03-A1-T1-NO01) <- Norma Creación de Bodegas
  ('a32e13e8-ff03-4adf-902d-b69c3e620015'::uuid, 'c3ce1572-dc80-4c6e-97e3-86e266c9579a'::uuid), -- Creación de Órdenes de Compra en Streamline (CVP04-A7-T5-IU01) <- Instructivo para la Creación de Órdenes de Compra en Streamline
  ('a32464ac-55cf-498f-9e6f-8b0603be1338'::uuid, 'f6e22176-0e5e-417f-abfa-7ca976db14b0'::uuid), -- Manejo Devoluciones y Dañados identificados en almacé (CVP06-A14-T6-NO01) <- Manejo Devoluciones y Dañados identificados en almacén
  ('9021ba5e-894f-49f6-a4a8-c6f5fb32a17b'::uuid, 'ffcfe876-9f36-4366-9088-898de0fc7ca7'::uuid), -- Facturación Cofersa (CVP12-A6-T1-IU01) <- Instructivo de Facturación Cofersa
  ('6fad4245-07b9-412e-babd-8d764ff92591'::uuid, '83ce181d-c425-4511-8efa-4c00b6cc6172'::uuid), -- Facturación MP (CVP12-A6-T3-IU01) <- Instructivo de Facturación MP
  ('a00308bb-bb4d-4b37-965c-377196a3c683'::uuid, '81556688-405c-448f-8acb-e0678bca4337'::uuid), -- Nivel de Servicio atención solicitudes de clientes (CVP14-A10-T1-NO01) <- Norma Nivel de servicio atención solicitudes de clientes
  ('d135fa37-25fa-45cc-acf7-f7d570d2067f'::uuid, '185e40d4-4a92-4e62-b871-610a74a51e49'::uuid), -- Reclamos, devoluciones y garantías clientes (CVP14-A11-T1-NO01) <- Norma reclamos, devoluciones y garantías clientes
  ('19f90c8c-dd59-43c8-b571-867374ddce0a'::uuid, '36654748-0be7-4fda-b282-96e424443fbc'::uuid), -- Cálculo de impuesto de importación (SOP04-A1-T3-NO01) <- CPV04-T6-NO01 Cálculo de impuesto de importación
  ('607df538-1cfd-4a16-89fe-200f7e02bf3a'::uuid, '03e28f7f-53a2-4d69-a1d1-f400b9fec71e'::uuid), -- Muestra de producto (CVP09-A1-T4-NO01) <- Muestras de Productos
  ('a354ce10-b80a-4fe4-a1ea-0bf0bab0caf4'::uuid, '4fc562fe-8ee0-455c-9867-87f92d3cfe78'::uuid), -- Carga de Pedidos Softland (CVP09-A3-T1-IU03) <- InCarga de Pedidos en Softland
  ('617e368f-487e-47c1-acc9-cd4fcb10d717'::uuid, 'a8589495-8338-489b-9f56-04933120873f'::uuid), -- Cotizador- Softland Cofersa (CVP09-A3-T2-IU02) <- ICotizador de Softland- Cofersa
  ('e3897d84-9915-401e-9229-4373065b951c'::uuid, '38d68f6f-a6d9-4ae3-b182-b8554846e9a9'::uuid), -- Creación de proveedor MCG (CVP04-A6-T1-IU01) <- Instructivo creación de proveedor MCG
  ('2b9f7adc-a75d-4680-bd10-4d51d18d9012'::uuid, '95ae5721-0ac8-439e-9827-e7cdb1afa29f'::uuid), -- Devolucion al Proveedor (CVP06-A11-T1-PR01) <- Devoluciones Proveedor
  ('580a3e43-73a9-4b19-8c9a-fb85ef846730'::uuid, '99f3dd75-7a0d-4af4-9376-b3ea0a62a515'::uuid), -- Creación de Artículos (CVP02-A1-T4-NO01) <- Norma Creación de Artículos en el sistema
  ('d84cd1b7-b632-4025-acd9-f0e0c1ead5ca'::uuid, '83b71594-2cfa-4223-bb6a-e326bdb6e082'::uuid), -- Segmentación de Clientes (CVP11-A1-T2-NO01) <- SOP10-AX-NO01 Norma de Segmentación de Clientes
  ('5d77c91a-024b-45b7-9129-247a93dd766d'::uuid, '870f9716-8caf-40ab-a0e7-2c2a72096148'::uuid), -- Norma de Uso y Manejo de Imagen Corporativa Mayoreo (CVP11-A1-T3-NO01) <- NO-MER-002 Norma de Uso y Manejo de Imagen Corporativa
  ('eefc7d06-abc3-45f5-9634-7f9e0b77f073'::uuid, '17dcad9f-067d-4760-8aef-c90ae79441f0'::uuid), -- Instructivo  Creación de Cliente Nuevo en el ERP (CVP16-A2-T3-IU01) <- Instructivo Creacion de Clientes en el ERP
  ('7c6a55bf-e85e-44d9-9f8f-c7cd979c8641'::uuid, '22ee8f2d-ef15-4125-8e7f-db6f696b519a'::uuid), -- Tasas de Cambioel registro de Inventarios en Transito (SOP02-A1-T3-IN01) <- Instructivo Tasas de Cambio para el registro de Inventarios en Transito en moneda extranjera
  ('85236d3a-10c3-43fe-b4e3-412e5ca24210'::uuid, 'cbc7c2b0-bcab-41f6-b196-546d082c70ff'::uuid), -- Reposición de Compras Global (CVP04-A7-T6-AN01) <- Flujo Reposición Compras Global
  ('986b06d1-c8f6-40b1-9fb8-d776ca75de12'::uuid, '1c4c3b59-8526-4cef-ad5c-fb90bf2c26c6'::uuid), -- Estándar de Paletas para Almacén (CVP06-A14-T2-MA01) <- Manual estándar paletas
  ('0d1a31a6-6aa7-4cd0-b96c-486a8a47d98e'::uuid, 'f8960ca2-d6e0-410d-b6b6-df55203f3ea1'::uuid), -- Facturación Cofersa (CVP12-A6-T1-PR01) <- Procedimiento de Facturación Cofersa
  ('29a0fb9d-34b9-4bca-9d5b-88a35f96e059'::uuid, '5c69f41e-44d7-4659-aa53-d2c4312b343c'::uuid), -- Facturacion (2) (CVP12-A6-T2-IU01) <- Instructivo de Facturacion (2)
  ('f448bf6d-9bc1-47cd-b450-57b3e2a76ae1'::uuid, '28bf46e1-9ee3-4a48-849f-a9e56047357b'::uuid), -- Prospeccion (CVP17-A3-T1-IU01) <- Instructivo CEMP- Prospeccion
  ('9bf9f01c-fe9c-46a8-bec4-d24c9b3e4f55'::uuid, '63de4121-6a6c-4b2e-bcf1-65ef45504369'::uuid), -- Consulta de Clientes/ Pedidos/ Articulos en Softland (CVP09-A2-T1-IU02) <- Instructivo Consulta de Clientes, Pedidos, Facturas y Artículos en Softland
  ('2f187fff-db81-4b7e-bd9c-e2d74f0296e4'::uuid, '54bc4122-dd97-4587-9966-5b5dc1a155eb'::uuid), -- Aprobación de Ajustes de Saldos Pendientes en Cuentas por Cobrar (CVP16-A3-T14-NO01) <- Ajustes de Saldos Pendientes en Cuentas por Cobrar.
  ('abcb281c-e8ff-4fb7-b674-30b1118f99d4'::uuid, 'b2548879-9250-433b-8051-7cd5a509f955'::uuid), -- creación de ajustes en Softland (SOP03-A2-T2-IN01) <- Instructivo creación de ajustes de inventario en Softland
  ('1b0b80e2-0301-401d-a694-b387e11a1fa3'::uuid, '54d2efda-4ba0-4dbb-ad82-da364f20dff6'::uuid), -- Recepción y almacenaje de mercancía Taller (CVP06-A6-T4-PR01) <- Procedimiento Recepción de mercancía Taller
  ('fbbfddb6-d7d2-4594-a778-8b66a7b3f17d'::uuid, 'f9b3e936-1fc2-459f-9eb3-0a1b624bc217'::uuid) -- Cotizador- Mundial de Partes (CVP09-A3-T2-IU01) <- ICotizador de Ventas Mundial de Partes
) AS p(mapa_id, drive_id)
JOIN public.documents d ON d.id = p.drive_id
WHERE m.id = p.mapa_id
  AND d.created_by IS NULL AND d.macroproceso_codigo IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.document_versions v WHERE v.document_id = d.id)
  AND NOT EXISTS (SELECT 1 FROM public.document_indicators i WHERE i.document_id = d.id)
  AND NOT EXISTS (SELECT 1 FROM public.review_alerts r WHERE r.document_id = d.id);

-- ...y se elimina ese duplicado (solo si su archivo ya quedó en la entrada del Mapa).
DELETE FROM public.documents d
USING (VALUES
  ('69254543-4a53-4ffb-b027-d866460b1987'::uuid, '712a15c2-38e0-42ad-a17a-d2bc6ed47233'::uuid), -- Registro de un nuevo proveedor en el recurso de aplicaciones MCG (CVP04-A7-T1-IU01) <- Instructivo para el registro de un nuevo proveedor en el recurso de aplicaciones MCG
  ('99b0b6c8-f14b-46a0-a189-733c7ebdda51'::uuid, 'ab9a3d5f-cf11-474d-903b-ec4a4accf102'::uuid), -- Compras MCG (CVP04-A6-T2-PR01) <- Procedimiento Compras MCG
  ('a520b853-6ea9-471e-9d54-349a5169366b'::uuid, 'df5b9039-3e46-4032-9e3e-134b6251a48b'::uuid), -- Programación de citas para la recepción de mercancía de proveedores (CVP04-A10-T1-AN01) <- Programación de citas de recepción de mercancía de proveedores
  ('a491fd25-95b9-4943-9faf-0410655d980f'::uuid, 'db000e4b-0cc8-4f6d-86e2-c007ad6d0885'::uuid), -- Solicitud de pedidos WMS - ERP. Taller (CVP06-A16-T1-PR01) <- Procedimiento solicitud de pedidos WMS - ERP Taller
  ('b297eb15-ba25-46f6-bfda-188e47e0d94f'::uuid, '221e0cb5-9211-4383-9b8f-93c46d4551cd'::uuid), -- Devolucion al cliente (CVP06-A18-T1-PR01) <- Procedimiento Devolucion al cliente (1)
  ('2484439d-a282-4a44-99bb-fd0e4e2f07be'::uuid, '9c1050af-93c3-48c1-a039-f02050908a72'::uuid), -- Facturación (CVP12-A4-T1-PR01) <- Procedimiento de Facturacion
  ('69a07eca-a7b0-4e67-91cc-9662a7eb6a00'::uuid, '5718f602-dbb0-44d5-a69e-64d94eb0ad48'::uuid), -- Cliente retira (CVP13-A2-T1-PR01) <- Procedimiento cliente retira
  ('a3b65df6-73b5-4407-b1be-293023f27515'::uuid, 'ae6f6685-90bf-4e74-b1d3-53f22f410601'::uuid), -- Plantilla comercial - Mayoreo (CVP02-A1-T4-FO03) <- Plantilla comercial - Mayoreo.
  ('5d7b078d-ed7b-4729-84c8-a9813d6e2796'::uuid, 'c170d4a7-4efc-425f-b687-f87f065d81ed'::uuid), -- Incoterms (CVP04-A1-T3-AN01) <- CPV04-T5-AN01 Incoterms
  ('f5d5eb72-25c4-4709-8ff2-3d78589cf507'::uuid, '63468d0a-63e9-4a4d-9213-1a48f43368dd'::uuid), -- Normativa de Base de Clientes Febeca (CVP11-A1-T9-NO01) <- FE-NO-MER-001 Normativa de Base de Clientes de Febeca
  ('a48d0075-4a5c-44a6-8743-fa575fbdae1d'::uuid, 'ae484fdf-be07-42ba-94de-7e4c31cb0482'::uuid), -- Normativa de Base de Clientes Beval (CVP11-A1-T9-NO02) <- BE-NO-MER-001 Normativa de Base de Clientes de Beval
  ('f94cf922-bddd-4793-8000-ea42f875f96c'::uuid, '5a824da6-f2f9-4b0c-b402-f92685c4578b'::uuid), -- Normativa de Base de Clientes de Sillaca (CVP11-A1-T9-NO03) <- SI-NO-MER-001 Normativa de Base de Clientes de Sillaca
  ('81cc2f1e-1b12-4c41-9d60-873e1538c58a'::uuid, 'ae26944f-cbf8-459b-8c6a-0281a5b38e9a'::uuid), -- Normativa de Base de Clientes de Cofersa (CVP11-A1-T9-NO04) <- CO-NO-MER-001 Normativa de Base de Clientes de Cofersa
  ('7cbbde40-e031-4092-b411-4f3e4e5fb28c'::uuid, '75d74153-9928-406b-a168-bdb3a19a4579'::uuid), -- Normativa de Base de Clientes de Mundipartes (CVP11-A1-T9-NO05) <- MP-NO-MER-001 Normativa de Base de Clientes de Mundipartes
  ('b2bfee5c-f00b-4891-a7c7-bff687e37d22'::uuid, '45aacea7-f780-444d-929b-452e16236722'::uuid), -- Liberación de Pedido (CVP15-A1-T1-NO01) <- Norma para la Liberación de Pedidos
  ('188ce99b-0be0-400c-8c25-c08684482a68'::uuid, '33d6c48c-9fc3-4c68-8d4f-d2d694cd5570'::uuid), -- Creación de Cliente Nuevo (CVP16-A2-T3-NO01) <- Creación de Clientes Nuevos
  ('8eef9f19-6522-4f53-9bb0-c6655f54ed42'::uuid, '8796c69a-b3ab-46d4-b4e7-d35916b746d0'::uuid), -- Reintegros a Clientes (CVP16-A2-T4-NO01) <- NORMA REINTEGRO A CLIENTES
  ('43f45a34-911c-4100-aac3-8bf9ed726d71'::uuid, '3f11a864-8123-482c-bfa0-1251772892ca'::uuid), -- Reintegros en Divisas a Clientes (CVP16-A3-T20-NO01) <- Norma para Reintegros en Divisas a Clientes
  ('9a5ff7f9-23b8-4a09-aa65-e9a87511a3d0'::uuid, '3be45069-3869-430e-ab8e-d148b9de6654'::uuid), -- Instructivo: Creación de  Proveedores SFL (SOP01-A3-T1-IN01) <- Instructivo: Creación de  Proveedores SFL
  ('2ff12a18-a066-40bf-9e00-e4d844028728'::uuid, '4c4fc5b9-79fc-40cd-9e72-1822f09d7aff'::uuid), -- Proyección y Monitoreo de Efectivo (SOP01-A4-T3-NO01) <- Proyección y Monitoreo de Efectivo
  ('9bdbeef4-b78d-4174-af40-5b78c7fc432c'::uuid, '6413ac41-afc5-4a92-b1ee-831bb0e771a8'::uuid), -- Toma Física de Inventario (TFI) (SOP03-A3-T1-NO01) <- Norma Toma Física de Inventario (TFI)
  ('d769e215-17ae-457b-8652-1963df7be4c4'::uuid, '5d124f47-9b84-4595-be76-278da4399985'::uuid), -- Creación de Bodegas (SOP03-A1-T1-NO01) <- Norma Creación de Bodegas
  ('a32e13e8-ff03-4adf-902d-b69c3e620015'::uuid, 'c3ce1572-dc80-4c6e-97e3-86e266c9579a'::uuid), -- Creación de Órdenes de Compra en Streamline (CVP04-A7-T5-IU01) <- Instructivo para la Creación de Órdenes de Compra en Streamline
  ('a32464ac-55cf-498f-9e6f-8b0603be1338'::uuid, 'f6e22176-0e5e-417f-abfa-7ca976db14b0'::uuid), -- Manejo Devoluciones y Dañados identificados en almacé (CVP06-A14-T6-NO01) <- Manejo Devoluciones y Dañados identificados en almacén
  ('9021ba5e-894f-49f6-a4a8-c6f5fb32a17b'::uuid, 'ffcfe876-9f36-4366-9088-898de0fc7ca7'::uuid), -- Facturación Cofersa (CVP12-A6-T1-IU01) <- Instructivo de Facturación Cofersa
  ('6fad4245-07b9-412e-babd-8d764ff92591'::uuid, '83ce181d-c425-4511-8efa-4c00b6cc6172'::uuid), -- Facturación MP (CVP12-A6-T3-IU01) <- Instructivo de Facturación MP
  ('a00308bb-bb4d-4b37-965c-377196a3c683'::uuid, '81556688-405c-448f-8acb-e0678bca4337'::uuid), -- Nivel de Servicio atención solicitudes de clientes (CVP14-A10-T1-NO01) <- Norma Nivel de servicio atención solicitudes de clientes
  ('d135fa37-25fa-45cc-acf7-f7d570d2067f'::uuid, '185e40d4-4a92-4e62-b871-610a74a51e49'::uuid), -- Reclamos, devoluciones y garantías clientes (CVP14-A11-T1-NO01) <- Norma reclamos, devoluciones y garantías clientes
  ('19f90c8c-dd59-43c8-b571-867374ddce0a'::uuid, '36654748-0be7-4fda-b282-96e424443fbc'::uuid), -- Cálculo de impuesto de importación (SOP04-A1-T3-NO01) <- CPV04-T6-NO01 Cálculo de impuesto de importación
  ('607df538-1cfd-4a16-89fe-200f7e02bf3a'::uuid, '03e28f7f-53a2-4d69-a1d1-f400b9fec71e'::uuid), -- Muestra de producto (CVP09-A1-T4-NO01) <- Muestras de Productos
  ('a354ce10-b80a-4fe4-a1ea-0bf0bab0caf4'::uuid, '4fc562fe-8ee0-455c-9867-87f92d3cfe78'::uuid), -- Carga de Pedidos Softland (CVP09-A3-T1-IU03) <- InCarga de Pedidos en Softland
  ('617e368f-487e-47c1-acc9-cd4fcb10d717'::uuid, 'a8589495-8338-489b-9f56-04933120873f'::uuid), -- Cotizador- Softland Cofersa (CVP09-A3-T2-IU02) <- ICotizador de Softland- Cofersa
  ('e3897d84-9915-401e-9229-4373065b951c'::uuid, '38d68f6f-a6d9-4ae3-b182-b8554846e9a9'::uuid), -- Creación de proveedor MCG (CVP04-A6-T1-IU01) <- Instructivo creación de proveedor MCG
  ('2b9f7adc-a75d-4680-bd10-4d51d18d9012'::uuid, '95ae5721-0ac8-439e-9827-e7cdb1afa29f'::uuid), -- Devolucion al Proveedor (CVP06-A11-T1-PR01) <- Devoluciones Proveedor
  ('580a3e43-73a9-4b19-8c9a-fb85ef846730'::uuid, '99f3dd75-7a0d-4af4-9376-b3ea0a62a515'::uuid), -- Creación de Artículos (CVP02-A1-T4-NO01) <- Norma Creación de Artículos en el sistema
  ('d84cd1b7-b632-4025-acd9-f0e0c1ead5ca'::uuid, '83b71594-2cfa-4223-bb6a-e326bdb6e082'::uuid), -- Segmentación de Clientes (CVP11-A1-T2-NO01) <- SOP10-AX-NO01 Norma de Segmentación de Clientes
  ('5d77c91a-024b-45b7-9129-247a93dd766d'::uuid, '870f9716-8caf-40ab-a0e7-2c2a72096148'::uuid), -- Norma de Uso y Manejo de Imagen Corporativa Mayoreo (CVP11-A1-T3-NO01) <- NO-MER-002 Norma de Uso y Manejo de Imagen Corporativa
  ('eefc7d06-abc3-45f5-9634-7f9e0b77f073'::uuid, '17dcad9f-067d-4760-8aef-c90ae79441f0'::uuid), -- Instructivo  Creación de Cliente Nuevo en el ERP (CVP16-A2-T3-IU01) <- Instructivo Creacion de Clientes en el ERP
  ('7c6a55bf-e85e-44d9-9f8f-c7cd979c8641'::uuid, '22ee8f2d-ef15-4125-8e7f-db6f696b519a'::uuid), -- Tasas de Cambioel registro de Inventarios en Transito (SOP02-A1-T3-IN01) <- Instructivo Tasas de Cambio para el registro de Inventarios en Transito en moneda extranjera
  ('85236d3a-10c3-43fe-b4e3-412e5ca24210'::uuid, 'cbc7c2b0-bcab-41f6-b196-546d082c70ff'::uuid), -- Reposición de Compras Global (CVP04-A7-T6-AN01) <- Flujo Reposición Compras Global
  ('986b06d1-c8f6-40b1-9fb8-d776ca75de12'::uuid, '1c4c3b59-8526-4cef-ad5c-fb90bf2c26c6'::uuid), -- Estándar de Paletas para Almacén (CVP06-A14-T2-MA01) <- Manual estándar paletas
  ('0d1a31a6-6aa7-4cd0-b96c-486a8a47d98e'::uuid, 'f8960ca2-d6e0-410d-b6b6-df55203f3ea1'::uuid), -- Facturación Cofersa (CVP12-A6-T1-PR01) <- Procedimiento de Facturación Cofersa
  ('29a0fb9d-34b9-4bca-9d5b-88a35f96e059'::uuid, '5c69f41e-44d7-4659-aa53-d2c4312b343c'::uuid), -- Facturacion (2) (CVP12-A6-T2-IU01) <- Instructivo de Facturacion (2)
  ('f448bf6d-9bc1-47cd-b450-57b3e2a76ae1'::uuid, '28bf46e1-9ee3-4a48-849f-a9e56047357b'::uuid), -- Prospeccion (CVP17-A3-T1-IU01) <- Instructivo CEMP- Prospeccion
  ('9bf9f01c-fe9c-46a8-bec4-d24c9b3e4f55'::uuid, '63de4121-6a6c-4b2e-bcf1-65ef45504369'::uuid), -- Consulta de Clientes/ Pedidos/ Articulos en Softland (CVP09-A2-T1-IU02) <- Instructivo Consulta de Clientes, Pedidos, Facturas y Artículos en Softland
  ('2f187fff-db81-4b7e-bd9c-e2d74f0296e4'::uuid, '54bc4122-dd97-4587-9966-5b5dc1a155eb'::uuid), -- Aprobación de Ajustes de Saldos Pendientes en Cuentas por Cobrar (CVP16-A3-T14-NO01) <- Ajustes de Saldos Pendientes en Cuentas por Cobrar.
  ('abcb281c-e8ff-4fb7-b674-30b1118f99d4'::uuid, 'b2548879-9250-433b-8051-7cd5a509f955'::uuid), -- creación de ajustes en Softland (SOP03-A2-T2-IN01) <- Instructivo creación de ajustes de inventario en Softland
  ('1b0b80e2-0301-401d-a694-b387e11a1fa3'::uuid, '54d2efda-4ba0-4dbb-ad82-da364f20dff6'::uuid), -- Recepción y almacenaje de mercancía Taller (CVP06-A6-T4-PR01) <- Procedimiento Recepción de mercancía Taller
  ('fbbfddb6-d7d2-4594-a778-8b66a7b3f17d'::uuid, 'f9b3e936-1fc2-459f-9eb3-0a1b624bc217'::uuid) -- Cotizador- Mundial de Partes (CVP09-A3-T2-IU01) <- ICotizador de Ventas Mundial de Partes
) AS p(mapa_id, drive_id), public.documents m
WHERE d.id = p.drive_id AND m.id = p.mapa_id AND m.drive_file_id = d.drive_file_id
  AND d.created_by IS NULL AND d.macroproceso_codigo IS NULL;

-- B) Casos de revisión: el documento elegido se queda con el archivo.
UPDATE public.documents d
SET drive_file_id = v.fid, drive_link = COALESCE(d.drive_link, r.drive_link), drive_path = r.drive_path,
    drive_nombre = r.title, drive_visto_at = now(), drive_eliminado_at = NULL,
    silo = COALESCE(v.silo, d.silo),
    confidential = d.confidential OR r.drive_path ILIKE '%restringid%'
FROM (VALUES
  ('15eca676-88b7-404f-8ffc-3857ba0d0068'::uuid, '1J7iHAb_CG0wvI3uZ9K92yJVLDH2Z5197XCb7dl9phxw', NULL::public.silo_type), -- Cálculo de impuesto de importación (Norma CVP04)
  ('ac4ece94-583a-4d6b-970c-91ac4d996d97'::uuid, '1nUk2KiM4iyE0iqWnyUeKXF9ml79icDRf', NULL::public.silo_type), -- Clasificación BDF de Articulos (Norma CVP01)
  ('f7daae64-07b2-4eca-8829-ab66198660bd'::uuid, '1n2Ntf7fWemxggpbyt6EOqaEBNI8aDRrgKKPGzfYvhBM', NULL::public.silo_type), -- Depuración de Surtido (Procedimiento CVP01)
  ('4325a75e-4380-4023-ba75-ee918d7987b7'::uuid, '1xIALUyiQPofN-JwkLal41Taj6pYIrVdc', NULL::public.silo_type), -- Combos y Kits (Norma CVP01)
  ('86668815-233d-4e9e-9397-d7d0ff855118'::uuid, '17Nvd8_EB3V3iLF3_PYYIRD7Ev4BT07ETCjw1WzR2Y9Y', NULL::public.silo_type), -- Gestión del Proceso de Compras Global (Norma CVP04)
  ('d21174b2-9212-439c-9515-a6eba231225f'::uuid, '1K-zuqN58ey668TaCLpUxNQD2JArqFuLhsD1ZppvDifo', NULL::public.silo_type), -- Lista de Precio de Venta (Norma CVP02)
  ('72004667-d634-471c-9e68-aead9bd1b2c2'::uuid, '1ULE9sdwPPypUEYvzXb796Anbv7I4c1oh', NULL::public.silo_type), -- Pedidos Especiales (Norma CVP04)
  ('e6141ea2-cbea-4f56-8243-559bce728f6d'::uuid, '1oXiS8pGEkVOO2uxD1urEjkcS6h_2XvpirFtmniHuzmw', NULL::public.silo_type), -- Pedidos Especiales (Procedimiento CVP04)
  ('eb5f3e04-6b21-4d10-a3dc-3e5a67a267df'::uuid, '1BhprlcDx0lDQQPklXC6SqWHyUnTUKwYwxlxgMtWsnk4', NULL::public.silo_type), -- Proveedor con anticipo (Compras)
  ('e13119ee-4c55-467b-a906-9d6e128d26ab'::uuid, '1HEKKCI1W6zmIbwEfoF3c5j6gfYtv8NGo8qv9qna3Lx8', NULL::public.silo_type), -- DM- Acompañamiento de nuevos ingresos (Personal)
  ('fce56986-2b5c-40e3-a29e-22fa9aaa91eb'::uuid, '1dd5cZcXsLShK5gDrcYePfF5tJlMan5UNUojj9HgxGIY', NULL::public.silo_type), -- Anexo Agregar Competencias (Personal)
  ('5eb8346b-58e8-402e-80d4-68ed68586d12'::uuid, '16UdoKjkts6pnhkLg2zO7qd-uQbQsAD_B', NULL::public.silo_type), -- DC- Coordinador de captación y desarrollo
  ('6e5e6bc4-6126-4d51-8c65-e6babbe9e6b0'::uuid, '1Dux8sy_JSdUEEBwlrSLzVtGl_SVLxLic', NULL::public.silo_type), -- DC-Jefe de Almacén
  ('f88f9dce-f810-45f1-8851-8f7e792bf4ee'::uuid, '1u18wBi3nFWB9Z8LrXeBShIW9T1kx58PD', NULL::public.silo_type), -- Inducción (Formato, Personal)
  ('41a92049-8fbd-43a4-b57f-2219652a836c'::uuid, '1up23FDj9soi8Ct31nLILwQdw91rKJ_OI', 'procesos'::public.silo_type), -- Ayuda Inteligente AIDA (Manual, pasa a Procesos)
  ('2162ddc8-001b-4d33-915f-57ece723f629'::uuid, '1smvSqmyED4mx0IhnHmnrFQ988y-uCuk1', NULL::public.silo_type), -- Gestión de tiquetes (Procedimiento CVP14)
  ('18e43936-e610-4243-9ddc-e4ecd8054731'::uuid, '1yxCkR_Dat946qu0CUKR0RUh_QE2eNU51k1K_b8j2RC8', NULL::public.silo_type), -- Reposición de Compras Global (Procedimiento PR01)
  ('a68639cc-9033-45d3-b68b-be6041563b0d'::uuid, '1K0zVpYN84z6XzTKZRZWuyeqYikKpinGk', NULL::public.silo_type), -- Reposición de inventarios (Anexo AN01)
  ('b8740a0c-32e0-4e3b-af38-24ed18bbf721'::uuid, '1v2tbAvdb9B-Qjdy8EiE6NOr2NLVLMyEu86G8rajiFe0', NULL::public.silo_type), -- Reposición de inventarios (Procedimiento PR01)
  ('9971c4c1-fe56-4000-8ac6-9a014e846040'::uuid, '1l9a7Q8N-PeAal4hUh3Mxwn_D-xtdfLHa', NULL::public.silo_type), -- Prospección (Procedimiento CVP17)
  ('7a2af1b0-dc80-4a88-8bc4-c429b9211dab'::uuid, '1N0l4vtkCv1bmRDGL3ChU1EWp_OO6PtVa', NULL::public.silo_type) -- Creación de Cliente Nuevo (Procedimiento CVP16)
) AS v(doc_id, fid, silo)
JOIN public.drive_sync_revision r ON r.drive_file_id = v.fid
WHERE d.id = v.doc_id;

-- Las otras copias que apuntaban a esos archivos quedan sin enlace (no se borran).
UPDATE public.documents
SET drive_file_id = NULL, drive_link = NULL, drive_path = NULL, drive_nombre = NULL,
    drive_modified_at = NULL, drive_visto_at = NULL, drive_eliminado_at = NULL
WHERE id IN ('ca9e7dee-3b78-4e53-aaca-4a66e4cc17fa', '65bf142f-2b72-48bf-b97b-a743ff5aa14b', '4974f67a-9bd4-4413-8940-3b1dd4f255b2', '9359464a-7ae2-4e8c-9281-edb0541b0bc8', '09e58c66-98ab-42b9-9cbc-d903c8aad7d9', '4376ed99-9a36-4418-818e-e070bb106f2f', 'f90d05b2-79a3-41ae-8044-77056d668e42', 'cc046ba8-6d97-4c2c-b379-eebdfcbc468d', 'a4bb4566-5b65-40bf-b6e6-87bba6bfdde6', '0e8ef239-05bd-4db4-a090-61ca84810581', 'fdcb6cf0-fa88-402e-8d09-4ab5049abd46', '875408fe-7e98-4f22-b9e0-00abf29c3017', '64fd463f-74f0-4827-a632-65f5c45f8b1b', '878dccb2-229d-49c0-a6d2-abf7f738f21a', '4cf30163-fa3a-4bf6-b353-8380a95d983c', '9ce9361d-7237-454d-8528-e6558b09209c');

-- Archivos sin tipo (copia, protocolo OLO, duplicado de norma restringida): no se registran.
INSERT INTO public.drive_sync_ignorados (drive_file_id, title, drive_path)
SELECT drive_file_id, title, drive_path FROM public.drive_sync_revision WHERE motivo = 'sin_tipo'
ON CONFLICT (drive_file_id) DO NOTHING;

DELETE FROM public.drive_sync_revision
WHERE motivo = 'sin_tipo' OR drive_file_id IN ('1J7iHAb_CG0wvI3uZ9K92yJVLDH2Z5197XCb7dl9phxw', '1nUk2KiM4iyE0iqWnyUeKXF9ml79icDRf', '1n2Ntf7fWemxggpbyt6EOqaEBNI8aDRrgKKPGzfYvhBM', '1xIALUyiQPofN-JwkLal41Taj6pYIrVdc', '17Nvd8_EB3V3iLF3_PYYIRD7Ev4BT07ETCjw1WzR2Y9Y', '1K-zuqN58ey668TaCLpUxNQD2JArqFuLhsD1ZppvDifo', '1ULE9sdwPPypUEYvzXb796Anbv7I4c1oh', '1oXiS8pGEkVOO2uxD1urEjkcS6h_2XvpirFtmniHuzmw', '1BhprlcDx0lDQQPklXC6SqWHyUnTUKwYwxlxgMtWsnk4', '1HEKKCI1W6zmIbwEfoF3c5j6gfYtv8NGo8qv9qna3Lx8', '1dd5cZcXsLShK5gDrcYePfF5tJlMan5UNUojj9HgxGIY', '16UdoKjkts6pnhkLg2zO7qd-uQbQsAD_B', '1Dux8sy_JSdUEEBwlrSLzVtGl_SVLxLic', '1u18wBi3nFWB9Z8LrXeBShIW9T1kx58PD', '1up23FDj9soi8Ct31nLILwQdw91rKJ_OI', '1smvSqmyED4mx0IhnHmnrFQ988y-uCuk1', '1yxCkR_Dat946qu0CUKR0RUh_QE2eNU51k1K_b8j2RC8', '1K0zVpYN84z6XzTKZRZWuyeqYikKpinGk', '1v2tbAvdb9B-Qjdy8EiE6NOr2NLVLMyEu86G8rajiFe0', '1l9a7Q8N-PeAal4hUh3Mxwn_D-xtdfLHa', '1N0l4vtkCv1bmRDGL3ChU1EWp_OO6PtVa');

-- C) 49 documentos: el tipo pasa a ser el de su carpeta en Drive.
--   Proceso para cancelación de líneas (procedimiento -> anexo)
--   Proceso para recepción con OC (procedimiento -> anexo)
--   Gestión de tickets. Automatización Servicio al cliente Final (norma -> anexo)
--   CO Costa Rica Comercializadora China (norma -> anexo)
--   EA Reporte de pagos mediante el portal de clientes (norma -> anexo)
--   Flujo manejo devoluciones y dañados identificados en almacén (procedimiento -> anexo)
--   Combos - Órdenes de producción (diagrama -> anexo)
--   Motivos de los reclamos (formato -> anexo)
--   Anexo Administración de soportes de Cobranza V2 (procedimiento -> anexo)
--   Anexo Condiciones para la Cobranza Extrajudicial (norma -> anexo)
--   Anexo Condiciones para la aceptación de los billetes en moneda extranjera.  (norma -> anexo)
--   Anexo Estructura de asientos contables de registro de deuda financiera (norma -> anexo)
--   Anexo  Funcionamiento DM Notificaciones de Pago (norma -> anexo)
--   Anexo de Gastos de Personal Directo (norma -> anexo)
--   Anexo Pestaña del GYP: VE Global GYP M AAAA-MM (Bs) (norma -> anexo)
--   Anexo de Gastos Ajenos al Costo (norma -> anexo)
--   CO Costa Rica Comercializadora Colombia (norma -> anexo)
--   EA Mejoras Monitor de conciliaciones (norma -> anexo)
--   Anexo: Criterios para el mantenimiento del Surtido (norma -> anexo)
--   Copia de Instructivo - Uso del DM de Fletes (instructivo -> anexo)
UPDATE public.documents SET doc_type = 'anexo'::public.doc_type
WHERE id IN ('b0d6d623-b8ad-4ed1-82e8-394970dedd1b', '987e9c3e-7fad-4bfc-816b-3d5d616e9249', 'c36aabb3-3520-4f93-ae10-6ab73ec41d11', '01f707c7-8749-49e6-9f74-973dbff1b8f6', '7506305d-f14e-4a2a-b807-5b9114e2614a', '260e543e-543f-4ff5-9e5a-baf41c07b0a2', '90b80e7b-6f6e-4e78-9ce5-e1de95922d99', '66103a34-954d-479c-81ce-03c0bb150f27', '849ce63a-0373-44f8-a738-ba3197f352e7', 'b35c5de2-af99-4b51-b2b4-0436137440ab', '9f37794c-6dee-4c1d-9525-919dcb9ff57f', '28a046f4-647b-4adb-afb9-5b56bd555456', '442dffbc-fdbb-4c66-bdd9-6fb66c68a50c', 'feed3c29-db1e-4fe1-8a13-f2e4a242f69c', 'c9b22e9b-9c47-4f5f-9774-6652014a9e56', '31ed77ae-ff87-400c-9cea-c9af3edf8d7e', '5e91eff1-feb7-44a8-b3d4-75e99f759332', '9c9fae31-9b5f-41a1-b40a-ce861cc07a99', '6eeebde1-5175-4bec-9796-fdcf63bb4a3e', '7a5063c3-eb4c-4c18-bbff-b2d565ba3c86');

--   Solicitud de Inclusión de articulos (norma -> formato)
UPDATE public.documents SET doc_type = 'formato'::public.doc_type
WHERE id IN ('bef3619e-b5c6-425f-909f-c92717ca9505');

--   Acceso al SIM- Fabric (anexo -> instructivo)
--   Instructivos Pedidos Construplaza Manual (manual -> instructivo)
--   Instructivo Pedidos  Lagar, Gravilia, Papagayo (Manual)  (manual -> instructivo)
--   Creación de proveedores y mantenimiento de condiciones e información en el ERP (norma -> instructivo)
--   Proceso de creación de normas (1) (procedimiento -> instructivo)
--   Interfaces XRT - Estatus (norma -> instructivo)
--   Instructivo   Pedidos Almacenes El Colono - Mercado De Materiales El Tanque - Colonos la Jungla (Manual) (manual -> instructivo)
--   Instructivos Pedidos EPA Colones (Manual) (manual -> instructivo)
--   Instructivo  Cuentas Claves EPA CABLE (Manual) (manual -> instructivo)
UPDATE public.documents SET doc_type = 'instructivo'::public.doc_type
WHERE id IN ('21f6ebb8-7ab1-4153-88a0-e4ff371005fd', '80158cac-0634-478d-abc7-110718cf11d5', 'df279712-4b37-4c96-9b70-1972f4728318', '732ccf16-b02a-46e2-970c-5e4fce39fd36', '238e48d8-5d5f-4633-893a-fb0401dec67e', 'ecd1b42e-8617-4c71-b74f-dd7487b25afc', 'ae5e484e-ce6a-48e2-888b-b9509c451978', '043c2973-92e5-4839-97db-5fe545e2f163', 'f48afe35-9a85-49be-bbc4-ef53a792556d');

--   Glosario de Términos Reportería BI (anexo -> manual)
UPDATE public.documents SET doc_type = 'manual'::public.doc_type
WHERE id IN ('4a520f3b-519c-4d82-8e68-ab51f4b84b73');

--   Copia de Normas de pronósticos - Procesos - Rev 01 (procedimiento -> norma)
--   Norma Proceso de  Televentas (procedimiento -> norma)
--   Norma Proceso de Venta Agente de Cartera (procedimiento -> norma)
UPDATE public.documents SET doc_type = 'norma'::public.doc_type
WHERE id IN ('0e350fdd-09ba-40f6-8ba2-40344676522d', '238cb851-0a94-467c-b2ae-cf27921a5930', 'a8510e45-a9ab-4d9c-a82b-8d58d6c0f7b2');

--   Políticas Uso de los servicios de comunicaciones electrónicas (norma -> politica)
--   Políticas de Uso de Recursos tecnológicos (norma -> politica)
--   Política Credito y Cobranza Venzuela (norma -> politica)
--   Código de ética Sillaca (anexo -> politica)
--   Código de ética Mundipartes (anexo -> politica)
UPDATE public.documents SET doc_type = 'politica'::public.doc_type
WHERE id IN ('e77dbab1-62ce-4426-ad38-4f2874723fa1', 'ad2a76b3-c47d-4c0f-a79c-7684c4607f02', 'eed27a26-f42f-4e7c-8c91-7cdf711e00e9', '8b18f0ac-9b2f-45b4-a050-48adf71d1697', '87ec1104-4da8-4691-8ad7-16b89b9d94c1');

--   Unidades de Negocio Portafolio (norma -> presentacion_clave)
--   Requerimiento Gestion de Unidades de Negocio para Softland (norma -> presentacion_clave)
--   DM Escalas salariales. (presentacion -> presentacion_clave)
--   Casos de Implementación de IA en los procesos de Mayoreo y OLO (anexo -> presentacion_clave)
--   DM- Gestión de proyectos (presentacion -> presentacion_clave)
--   Creación de proveedores (anexo -> presentacion_clave)
--   Presentación Necesidades Gestion de Unidades de Negocio (norma -> presentacion_clave)
--   Taller de Elaboración de normas (presentacion -> presentacion_clave)
--   Copia de Creación de proveedores (anexo -> presentacion_clave)
UPDATE public.documents SET doc_type = 'presentacion_clave'::public.doc_type
WHERE id IN ('c25dfb3a-2df6-4f4a-829e-f3ab52fe88e9', 'cc6c729a-97ae-4678-a2c8-dc5795d98cb4', 'd860c46b-cddc-40fb-a2ef-b563db1f7112', '170bbaf3-57b1-47e0-8527-4d7561b7ff04', 'e0efe0b2-07d9-4643-bf3c-d8e47705a52c', '7267c4ac-188e-4b26-9d41-4c3509b5d5b2', 'fe251e67-b014-4283-842e-ac3ef4a02412', '5cf7717f-d99a-45de-a58e-91d277af5f3d', '7019e44f-2227-43f2-82f2-24fea57667bd');

--   Planner Logístico (anexo -> procedimiento)
UPDATE public.documents SET doc_type = 'procedimiento'::public.doc_type
WHERE id IN ('a4f58dbd-fb1b-453f-941e-f2f6a17dadd7');

-- D) 19 archivos que se mueven a la carpeta de su tipo (el Apps Script lo hace en su próxima corrida).
--   Procedimiento Administración de la cobranza - Cofersa (procedimiento, hoy en carpeta de norma)
--   Instructivo carga contable a Infor (instructivo, hoy en carpeta de manual)
--   Procedimiento para la Reactivación de Líneas Bancarias. (procedimiento, hoy en carpeta de norma)
--   Procedimiento para la Conciliación de Movimientos en Espera Bancarios en Sage XRT (Conciliación de Cobros) (procedimiento, hoy en carpeta de norma)
--   VE-SOP03-A4-T1-AN01-Anexo Formato de Ajustes de Inventario (formato, hoy en carpeta de anexo)
--   Formato EA (formato, hoy en carpeta de norma)
--   Instructivo Configuración Proveedores del exterior 4.4  - Cofersa (instructivo, hoy en carpeta de norma)
--   Procedimiento - Pagos a Proveedores  (procedimiento, hoy en carpeta de norma)
--   Instructivo - Control y registro de Préstamos (instructivo, hoy en carpeta de norma)
--   evaluación y revisión de irregularidades en cobranzas (procedimiento, hoy en carpeta de norma)
--   Anulación de Recibos (procedimiento, hoy en carpeta de norma)
--   Procedimiento de Evaluación del Desempeño de Proveedores (procedimiento, hoy en carpeta de norma)
--   Presupuesto de Compras (manual, hoy en carpeta de norma)
--   Remisiones (norma, hoy en carpeta de procedimiento)
--   Maquila (procedimiento, hoy en carpeta de anexo)
--   Cobranza Extrajudicial (procedimiento, hoy en carpeta de norma)
--   Manejo de Notas de Crédito y Débito. (procedimiento, hoy en carpeta de norma)
--   Depuración de ingresos por conciliar (procedimiento, hoy en carpeta de norma)
--   Gestión de tiquetes de reclamos y devoluciones clientes (procedimiento, hoy en Instructivos)
INSERT INTO public.drive_movimientos (document_id, drive_file_id)
SELECT id, drive_file_id FROM public.documents
WHERE id IN ('3f889a47-f8fe-47c5-88b9-1abf3c63bf49', '98606b38-16f4-40de-8fb0-90284464935f', '2f6222a7-a161-423e-89f3-2e7bacad4630', '8b4b2ae8-744f-4c51-a861-3b49f0182fbf', '1537da23-b4e9-4c76-bad0-05784e7c2fad', '63b56dff-2f48-4c7e-9ebc-b5a4b6bf03e3', '097c4e9e-a30b-4bea-abba-73d99454fbce', 'c0153ad3-f17e-4875-9e3c-536870e4bfc1', 'e5015bbc-ece2-4264-901c-1e6b786a11c9', '0abe4265-d8a4-407a-8db1-b768ffc79612', '92ec2649-92c8-4f7c-b49e-1a34b65a4704', '720a417d-e1af-400e-ae78-229d39afdb16', 'a23ebe08-35f4-40cf-8ad8-96e4fd9809dd', 'f6bada05-7cd7-48f7-b759-a137f68c14d4', '28912d90-70e7-4253-8860-242472298064', '5ea56639-487a-43f0-b5ad-90a1a7da1750', '5027a76c-a231-4fa7-ad60-f6b4fa59feeb', '85d7a983-6431-48dd-96b0-cd16ccb2e9e5', '2162ddc8-001b-4d33-915f-57ece723f629')
  AND drive_file_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.drive_movimientos m WHERE m.document_id = documents.id AND m.estado = 'pendiente');

COMMIT;
