ALTER TABLE public.incidencias ALTER COLUMN modulo TYPE text USING (
  CASE modulo::text
    WHEN 'nomina' THEN 'Nómina'
    WHEN 'ventas' THEN 'Ventas'
    WHEN 'compras' THEN 'Compras'
    WHEN 'inventario' THEN 'Inventario'
    WHEN 'contabilidad' THEN 'Contabilidad'
    ELSE modulo::text
  END
);
ALTER TABLE public.incidencias ALTER COLUMN modulo DROP NOT NULL;