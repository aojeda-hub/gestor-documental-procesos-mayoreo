-- Crear enum para estado de indicadores
CREATE TYPE public.indicator_status AS ENUM (
  'Construccion',
  'Revision',
  'Pendiente aprobación RC',
  'Publicado SIM',
  'Publicado SIM/Fabric'
);

-- Agregar columna estado a indicators
ALTER TABLE public.indicators
ADD COLUMN estado public.indicator_status NOT NULL DEFAULT 'Construccion';
