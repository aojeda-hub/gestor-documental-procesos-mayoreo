-- Añade "Responsable Funcional" como campo opcional junto al "Responsable"
-- (ahora "Responsable Técnico"), y permite que también pueda cambiar el
-- estado de la incidencia. Además expone un directorio mínimo de usuarios
-- (solo user_id + nombre) para que los formularios ofrezcan una lista de
-- selección en vez de texto libre, sin reabrir el acceso de lectura
-- completo a la tabla profiles (restringido en una migración anterior).

ALTER TABLE public.incidencias ADD COLUMN IF NOT EXISTS responsable_funcional text;

CREATE OR REPLACE FUNCTION public.list_user_directory()
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id, p.full_name FROM public.profiles p ORDER BY p.full_name;
$$;

REVOKE EXECUTE ON FUNCTION public.list_user_directory() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.list_user_directory() TO authenticated;

DROP POLICY IF EXISTS "Owner, admin or responsable update incidencias" ON public.incidencias;

CREATE POLICY "Owner, admin or responsable update incidencias" ON public.incidencias
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (
          (incidencias.responsable IS NOT NULL AND lower(trim(incidencias.responsable)) = lower(trim(p.full_name)))
          OR (incidencias.responsable_funcional IS NOT NULL AND lower(trim(incidencias.responsable_funcional)) = lower(trim(p.full_name)))
        )
    )
  )
  WITH CHECK (
    auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (
          (incidencias.responsable IS NOT NULL AND lower(trim(incidencias.responsable)) = lower(trim(p.full_name)))
          OR (incidencias.responsable_funcional IS NOT NULL AND lower(trim(incidencias.responsable_funcional)) = lower(trim(p.full_name)))
        )
    )
  );
