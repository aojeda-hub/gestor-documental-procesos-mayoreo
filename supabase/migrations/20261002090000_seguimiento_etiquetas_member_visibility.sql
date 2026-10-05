-- Una etiqueta (nombre + color) hoy solo la ve quien la creó. La tabla que
-- dice "qué etiquetas tiene esta tarjeta" (seguimiento_etiqueta_items) ya se
-- amplió hace meses para que cualquier miembro la vea, pero el JOIN hacia la
-- etiqueta misma seguía bloqueado por su propia política (solo el creador),
-- así que a los demás miembros les llegaba la etiqueta "vacía" (sin nombre
-- ni color) en vez de ocultarse del todo — por eso parecía un bug visual.
--
-- Crear/renombrar/borrar una etiqueta de la paleta personal sigue siendo solo
-- del creador; lo que se amplía es poder VER una etiqueta ya puesta en una
-- tarjeta a la que el usuario ya tiene acceso (dueño o miembro), sin importar
-- quién la creó originalmente.

DROP POLICY IF EXISTS "user manage own etiquetas" ON public.seguimiento_etiquetas;

CREATE POLICY "Insert own etiquetas" ON public.seguimiento_etiquetas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own etiquetas" ON public.seguimiento_etiquetas
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own etiquetas" ON public.seguimiento_etiquetas
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- La sub-consulta se apoya en la política ya existente de
-- seguimiento_etiqueta_items (owner o miembro), así queda sincronizada con
-- ella automáticamente si esa regla cambia más adelante.
CREATE POLICY "View etiquetas (own or attached to accessible card)" ON public.seguimiento_etiquetas
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.seguimiento_etiqueta_items sei WHERE sei.etiqueta_id = seguimiento_etiquetas.id)
  );
