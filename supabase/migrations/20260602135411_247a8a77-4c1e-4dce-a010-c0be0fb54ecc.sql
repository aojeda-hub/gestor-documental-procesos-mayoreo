CREATE TYPE public.documento_estatus AS ENUM ('aprobado','revision','desactualizado','desincorporado','en_construccion','por_iniciar');

ALTER TABLE public.documents ADD COLUMN estatus public.documento_estatus NOT NULL DEFAULT 'por_iniciar';