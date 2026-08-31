-- Cada tablero de Reunion Operativa se etiqueta con un silo (Personal, Ventas,
-- etc.) en vez de tener el silo fijo en el nombre. Nullable: no afecta a los
-- tableros personalizados normales, que no usan este campo.
ALTER TABLE public.seguimiento_boards ADD COLUMN IF NOT EXISTS silo text;
