-- Agrega "Nombre del proyecto" como campo opcional de los seguimientos,
-- para poder mostrarlo en la plantilla de registro y en la tarjeta del
-- tablero.

ALTER TABLE public.seguimientos ADD COLUMN IF NOT EXISTS proyecto text;
