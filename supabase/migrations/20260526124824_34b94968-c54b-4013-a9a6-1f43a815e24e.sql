
DROP POLICY IF EXISTS "owner insert sm" ON public.seguimiento_miembros;
DROP POLICY IF EXISTS "owner delete sm" ON public.seguimiento_miembros;
DROP POLICY IF EXISTS "View miembros (owner or member)" ON public.seguimiento_miembros;

CREATE POLICY "View miembros (owner, member or board member)"
ON public.seguimiento_miembros FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.seguimientos s
          WHERE s.id = seguimiento_miembros.seguimiento_id
            AND (s.user_id = auth.uid()
                 OR (s.board_id IS NOT NULL AND public.is_board_member(s.board_id, auth.uid()))))
  OR member_user_id = auth.uid()
);

CREATE POLICY "Insert miembros (owner or board member)"
ON public.seguimiento_miembros FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.seguimientos s
          WHERE s.id = seguimiento_miembros.seguimiento_id
            AND (s.user_id = auth.uid()
                 OR (s.board_id IS NOT NULL AND public.is_board_member(s.board_id, auth.uid()))))
);

CREATE POLICY "Delete miembros (owner or board member)"
ON public.seguimiento_miembros FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.seguimientos s
          WHERE s.id = seguimiento_miembros.seguimiento_id
            AND (s.user_id = auth.uid()
                 OR (s.board_id IS NOT NULL AND public.is_board_member(s.board_id, auth.uid()))))
);
