-- Amplía quién puede actualizar una incidencia (incluyendo su estado):
-- antes solo podían el creador o un admin, lo que bloqueaba silenciosamente
-- (sin error visible) al usuario asignado como "Responsable" cuando intentaba
-- marcarla como Solventado. Ahora también se permite si el nombre del
-- responsable coincide (sin distinguir mayúsculas/espacios) con el nombre de
-- perfil del usuario autenticado.
DROP POLICY IF EXISTS "Owner or admin update incidencias" ON public.incidencias;

CREATE POLICY "Owner, admin or responsable update incidencias" ON public.incidencias
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND incidencias.responsable IS NOT NULL
        AND lower(trim(incidencias.responsable)) = lower(trim(p.full_name))
    )
  )
  WITH CHECK (
    auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND incidencias.responsable IS NOT NULL
        AND lower(trim(incidencias.responsable)) = lower(trim(p.full_name))
    )
  );
