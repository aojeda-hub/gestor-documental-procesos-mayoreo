
CREATE OR REPLACE FUNCTION public.is_seguimiento_member(_seguimiento_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.seguimiento_miembros
    WHERE seguimiento_id = _seguimiento_id AND member_user_id = _user_id
  )
$$;

-- seguimientos
DROP POLICY IF EXISTS "View seguimientos (owner, board or member)" ON public.seguimientos;
DROP POLICY IF EXISTS "Update seguimientos (owner, board or member)" ON public.seguimientos;

CREATE POLICY "View seguimientos (owner, board or member)"
ON public.seguimientos FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR board_id IS NOT NULL
  OR public.is_seguimiento_member(id, auth.uid())
);

CREATE POLICY "Update seguimientos (owner, board or member)"
ON public.seguimientos FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR board_id IS NOT NULL
  OR public.is_seguimiento_member(id, auth.uid())
);

-- notas
DROP POLICY IF EXISTS "View notas (owner or member)" ON public.seguimiento_notas;
DROP POLICY IF EXISTS "Insert notas (owner or member)" ON public.seguimiento_notas;

CREATE POLICY "View notas (owner or member)"
ON public.seguimiento_notas FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.seguimientos s WHERE s.id = seguimiento_notas.seguimiento_id
    AND (s.user_id = auth.uid() OR public.is_seguimiento_member(s.id, auth.uid())))
);

CREATE POLICY "Insert notas (owner or member)"
ON public.seguimiento_notas FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM public.seguimientos s WHERE s.id = seguimiento_notas.seguimiento_id
    AND (s.user_id = auth.uid() OR public.is_seguimiento_member(s.id, auth.uid())))
);

-- checklists
DROP POLICY IF EXISTS "View checklists (owner or member)" ON public.seguimiento_checklists;
CREATE POLICY "View checklists (owner or member)"
ON public.seguimiento_checklists FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.seguimientos s WHERE s.id = seguimiento_checklists.seguimiento_id
    AND (s.user_id = auth.uid() OR public.is_seguimiento_member(s.id, auth.uid())))
);

-- checklist items
DROP POLICY IF EXISTS "View checklist items (owner or member)" ON public.seguimiento_checklist_items;
CREATE POLICY "View checklist items (owner or member)"
ON public.seguimiento_checklist_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.seguimiento_checklists c
    JOIN public.seguimientos s ON s.id = c.seguimiento_id
    WHERE c.id = seguimiento_checklist_items.checklist_id
      AND (s.user_id = auth.uid() OR public.is_seguimiento_member(s.id, auth.uid()))
  )
);

-- adjuntos
DROP POLICY IF EXISTS "View adjuntos (owner or member)" ON public.seguimiento_adjuntos;
CREATE POLICY "View adjuntos (owner or member)"
ON public.seguimiento_adjuntos FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.seguimientos s WHERE s.id = seguimiento_adjuntos.seguimiento_id
    AND (s.user_id = auth.uid() OR public.is_seguimiento_member(s.id, auth.uid())))
);

-- etiqueta items
DROP POLICY IF EXISTS "View etiqueta items (owner or member)" ON public.seguimiento_etiqueta_items;
CREATE POLICY "View etiqueta items (owner or member)"
ON public.seguimiento_etiqueta_items FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.seguimientos s WHERE s.id = seguimiento_etiqueta_items.seguimiento_id
    AND (s.user_id = auth.uid() OR public.is_seguimiento_member(s.id, auth.uid())))
);
