-- Cualquier usuario autenticado puede cambiar el ESTADO de una incidencia.
-- La edición de los DATOS (título, prioridad, responsables, etc.) sigue
-- reservada al creador o a un admin: el trigger trg_restrict_incidencia_update
-- rechaza cualquier cambio distinto del estado (y fecha de solventado) cuando
-- quien edita no es el creador ni un admin.

DROP POLICY IF EXISTS "Owner, admin or responsable update incidencias" ON public.incidencias;
DROP POLICY IF EXISTS "Authenticated update incidencias" ON public.incidencias;

CREATE POLICY "Authenticated update incidencias" ON public.incidencias
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
