
CREATE OR REPLACE FUNCTION public.soft_delete_documento(doc_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'responsable_metodos'::app_role)) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE documentos
  SET eliminado = TRUE,
      fecha_eliminacion = NOW()
  WHERE id = doc_id;

  RETURN TRUE;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.soft_delete_documento(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.soft_delete_documento(uuid) TO authenticated;
