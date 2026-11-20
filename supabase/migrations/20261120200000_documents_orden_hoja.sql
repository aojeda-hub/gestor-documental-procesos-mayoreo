-- Guarda el número de fila que el documento tiene en su hoja de origen
-- (columna de conteo de la pestaña "Index (dinámico)" del Mapa de Procesos),
-- para poder mostrar la tabla/árbol en el mismo orden en que está la
-- información en el Sheet en vez de un orden alfabético que mezcla
-- macroprocesos distintos que reutilizan los mismos códigos de proceso/subproceso.
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS orden_hoja integer;
