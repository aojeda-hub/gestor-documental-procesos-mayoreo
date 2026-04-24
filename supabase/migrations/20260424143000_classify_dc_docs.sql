-- Clasificar retroactivamente documentos que contienen "DC -"
-- Silo: 'personal'
-- Tipo: 'descripcion_cargo'

UPDATE public.documents
SET 
  silo = 'personal',
  doc_type = 'descripcion_cargo'
WHERE 
  title ILIKE '%DC -%';
