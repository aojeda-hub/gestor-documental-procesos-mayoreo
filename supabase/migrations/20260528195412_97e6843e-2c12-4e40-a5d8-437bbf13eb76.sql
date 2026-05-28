
-- seguimiento_checklists SELECT
DROP POLICY IF EXISTS "View checklists (owner or member)" ON public.seguimiento_checklists;
CREATE POLICY "View checklists (owner or member)" ON public.seguimiento_checklists
FOR SELECT USING (EXISTS (
  SELECT 1 FROM seguimientos s
  WHERE s.id = seguimiento_checklists.seguimiento_id
    AND (s.user_id = auth.uid()
         OR is_seguimiento_member(s.id, auth.uid())
         OR (s.board_id IS NOT NULL AND is_board_member(s.board_id, auth.uid())))
));

-- seguimiento_checklist_items SELECT
DROP POLICY IF EXISTS "View checklist items (owner or member)" ON public.seguimiento_checklist_items;
CREATE POLICY "View checklist items (owner or member)" ON public.seguimiento_checklist_items
FOR SELECT USING (EXISTS (
  SELECT 1 FROM seguimiento_checklists c
  JOIN seguimientos s ON s.id = c.seguimiento_id
  WHERE c.id = seguimiento_checklist_items.checklist_id
    AND (s.user_id = auth.uid()
         OR is_seguimiento_member(s.id, auth.uid())
         OR (s.board_id IS NOT NULL AND is_board_member(s.board_id, auth.uid())))
));

-- seguimiento_adjuntos SELECT + DELETE
DROP POLICY IF EXISTS "View adjuntos (owner or member)" ON public.seguimiento_adjuntos;
CREATE POLICY "View adjuntos (owner or member)" ON public.seguimiento_adjuntos
FOR SELECT USING (EXISTS (
  SELECT 1 FROM seguimientos s
  WHERE s.id = seguimiento_adjuntos.seguimiento_id
    AND (s.user_id = auth.uid()
         OR is_seguimiento_member(s.id, auth.uid())
         OR (s.board_id IS NOT NULL AND is_board_member(s.board_id, auth.uid())))
));

DROP POLICY IF EXISTS "Delete adjuntos (owner or uploader)" ON public.seguimiento_adjuntos;
CREATE POLICY "Delete adjuntos (owner or uploader)" ON public.seguimiento_adjuntos
FOR DELETE USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM seguimientos s
    WHERE s.id = seguimiento_adjuntos.seguimiento_id
      AND (s.user_id = auth.uid()
           OR (s.board_id IS NOT NULL AND is_board_member(s.board_id, auth.uid())))
  )
);

-- seguimiento_etiqueta_items SELECT
DROP POLICY IF EXISTS "View etiqueta items (owner or member)" ON public.seguimiento_etiqueta_items;
CREATE POLICY "View etiqueta items (owner or member)" ON public.seguimiento_etiqueta_items
FOR SELECT USING (EXISTS (
  SELECT 1 FROM seguimientos s
  WHERE s.id = seguimiento_etiqueta_items.seguimiento_id
    AND (s.user_id = auth.uid()
         OR is_seguimiento_member(s.id, auth.uid())
         OR (s.board_id IS NOT NULL AND is_board_member(s.board_id, auth.uid())))
));

-- seguimiento_notas SELECT + INSERT
DROP POLICY IF EXISTS "View notas (owner or member)" ON public.seguimiento_notas;
CREATE POLICY "View notas (owner or member)" ON public.seguimiento_notas
FOR SELECT USING (EXISTS (
  SELECT 1 FROM seguimientos s
  WHERE s.id = seguimiento_notas.seguimiento_id
    AND (s.user_id = auth.uid()
         OR is_seguimiento_member(s.id, auth.uid())
         OR (s.board_id IS NOT NULL AND is_board_member(s.board_id, auth.uid())))
));

DROP POLICY IF EXISTS "Insert notas (owner or member)" ON public.seguimiento_notas;
CREATE POLICY "Insert notas (owner or member)" ON public.seguimiento_notas
FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM seguimientos s
    WHERE s.id = seguimiento_notas.seguimiento_id
      AND (s.user_id = auth.uid()
           OR is_seguimiento_member(s.id, auth.uid())
           OR (s.board_id IS NOT NULL AND is_board_member(s.board_id, auth.uid())))
  )
);
