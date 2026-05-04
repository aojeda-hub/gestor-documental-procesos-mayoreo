
-- Recreate views with security_invoker so RLS of querying user applies
DROP VIEW IF EXISTS public.documentos_activos;
CREATE VIEW public.documentos_activos
WITH (security_invoker = true) AS
SELECT id, nombre, tipo_mime, tamano_bytes, hash_sha256, storage_bucket, storage_path,
       origen_ingesta, drive_id_original, metadata_original, usuario_id, propietario_sistema,
       fecha_ingesta, fecha_actualizacion, eliminado, fecha_eliminacion
FROM public.documentos
WHERE eliminado = false AND storage_path IS NOT NULL;

DROP VIEW IF EXISTS public.normas;
CREATE VIEW public.normas
WITH (security_invoker = true) AS
SELECT nombre_norma AS titulo, fecha_creacion
FROM public.normas_personal;

-- Fix mutable search_path on update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- Revoke direct API execution of SECURITY DEFINER helpers
-- (RLS policies still run them as function owner internally)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.get_user_silo(uuid) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.soft_delete_documento(uuid) FROM anon, public;
-- soft_delete_documento needs to be callable by authenticated since it's the deletion entrypoint
GRANT EXECUTE ON FUNCTION public.soft_delete_documento(uuid) TO authenticated;
