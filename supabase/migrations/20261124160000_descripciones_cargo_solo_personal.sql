-- Las descripciones de cargo pertenecen solo al silo Personal (decisión de
-- Procesos, 2026-11-24). La sincronización con Drive ya aplica la regla para
-- lo nuevo; esto corrige lo que ya estaba cargado.

-- 1) Descripciones de cargo reales guardadas en carpetas "Descripción de cargo"
--    de otros silos (Ventas, Logística / Reposición): pasan a Personal y el
--    silo/área de origen queda como área (subarea).
UPDATE public.documents
SET silo = 'personal',
    subarea = COALESCE(substring(drive_path from '^[^/]+ / (.+?) / [Dd]escripci'), subarea)
WHERE doc_type = 'descripcion_cargo'
  AND silo <> 'personal'
  AND drive_path ~* 'descripci[oó]n(es)? de cargo';

-- 2) Documentos que estaban mal tipificados como "descripción de cargo" pero cuyo
--    archivo de Drive está en una carpeta de otro tipo: toman el tipo de su carpeta.
UPDATE public.documents
SET doc_type = CASE
      WHEN drive_path ~* '/ manuales$' THEN 'manual'::public.doc_type
      WHEN drive_path ~* '/ normas$'   THEN 'norma'::public.doc_type
      WHEN drive_path ~* '/ anexos$'   THEN 'anexo'::public.doc_type
    END
WHERE doc_type = 'descripcion_cargo'
  AND silo <> 'personal'
  AND drive_path ~* '/ (manuales|normas|anexos)$';
