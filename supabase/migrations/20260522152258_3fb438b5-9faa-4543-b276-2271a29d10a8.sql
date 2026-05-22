
-- Tabla de miembros de tableros personalizados
CREATE TABLE IF NOT EXISTS public.seguimiento_board_miembros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.seguimiento_boards(id) ON DELETE CASCADE,
  member_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (board_id, member_user_id)
);

ALTER TABLE public.seguimiento_board_miembros ENABLE ROW LEVEL SECURITY;

-- Security definer function: verifica si un usuario es miembro o creador del tablero
CREATE OR REPLACE FUNCTION public.is_board_member(_board_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.seguimiento_boards b
    WHERE b.id = _board_id AND b.created_by = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.seguimiento_board_miembros m
    WHERE m.board_id = _board_id AND m.member_user_id = _user_id
  );
$$;

-- Policies para seguimiento_board_miembros
CREATE POLICY "View board miembros (creator or member)"
  ON public.seguimiento_board_miembros FOR SELECT TO authenticated
  USING (public.is_board_member(board_id, auth.uid()));

CREATE POLICY "Creator manages board miembros"
  ON public.seguimiento_board_miembros FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.seguimiento_boards b WHERE b.id = board_id AND b.created_by = auth.uid()));

CREATE POLICY "Creator deletes board miembros"
  ON public.seguimiento_board_miembros FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.seguimiento_boards b WHERE b.id = board_id AND b.created_by = auth.uid()));

-- Reemplazar policies de seguimiento_boards para restringir a creador y miembros
DROP POLICY IF EXISTS "Everyone can view boards" ON public.seguimiento_boards;
DROP POLICY IF EXISTS "Owners can update boards" ON public.seguimiento_boards;

CREATE POLICY "View boards (creator or member)"
  ON public.seguimiento_boards FOR SELECT TO authenticated
  USING (public.is_board_member(id, auth.uid()));

CREATE POLICY "Update boards (creator or member)"
  ON public.seguimiento_boards FOR UPDATE TO authenticated
  USING (public.is_board_member(id, auth.uid()));

-- Reemplazar policies de seguimiento_columns
DROP POLICY IF EXISTS "Everyone can manage columns" ON public.seguimiento_columns;
DROP POLICY IF EXISTS "Everyone can view columns" ON public.seguimiento_columns;

CREATE POLICY "View columns (board access)"
  ON public.seguimiento_columns FOR SELECT TO authenticated
  USING (public.is_board_member(board_id, auth.uid()));

CREATE POLICY "Manage columns (board access)"
  ON public.seguimiento_columns FOR ALL TO authenticated
  USING (public.is_board_member(board_id, auth.uid()))
  WITH CHECK (public.is_board_member(board_id, auth.uid()));

-- Actualizar policies de seguimientos para que board_id implique pertenencia al tablero
DROP POLICY IF EXISTS "View seguimientos (owner, board or member)" ON public.seguimientos;
DROP POLICY IF EXISTS "Update seguimientos (owner, board or member)" ON public.seguimientos;

CREATE POLICY "View seguimientos (owner, board or member)"
  ON public.seguimientos FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR (board_id IS NOT NULL AND public.is_board_member(board_id, auth.uid()))
    OR public.is_seguimiento_member(id, auth.uid())
  );

CREATE POLICY "Update seguimientos (owner, board or member)"
  ON public.seguimientos FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR (board_id IS NOT NULL AND public.is_board_member(board_id, auth.uid()))
    OR public.is_seguimiento_member(id, auth.uid())
  );

-- Permitir que miembros del seguimiento o del tablero también puedan eliminar tareas del tablero
DROP POLICY IF EXISTS "Users delete own seguimientos" ON public.seguimientos;
CREATE POLICY "Delete seguimientos (owner or board member)"
  ON public.seguimientos FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR (board_id IS NOT NULL AND public.is_board_member(board_id, auth.uid()))
  );

-- Permitir que miembros del seguimiento puedan gestionar checklists / items / adjuntos
DROP POLICY IF EXISTS "owner insert sc" ON public.seguimiento_checklists;
DROP POLICY IF EXISTS "owner update sc" ON public.seguimiento_checklists;
DROP POLICY IF EXISTS "owner delete sc" ON public.seguimiento_checklists;

CREATE POLICY "Insert checklists (owner or member)"
  ON public.seguimiento_checklists FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.seguimientos s
    WHERE s.id = seguimiento_id
      AND (s.user_id = auth.uid() OR public.is_seguimiento_member(s.id, auth.uid())
           OR (s.board_id IS NOT NULL AND public.is_board_member(s.board_id, auth.uid())))
  ));

CREATE POLICY "Update checklists (owner or member)"
  ON public.seguimiento_checklists FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.seguimientos s
    WHERE s.id = seguimiento_id
      AND (s.user_id = auth.uid() OR public.is_seguimiento_member(s.id, auth.uid())
           OR (s.board_id IS NOT NULL AND public.is_board_member(s.board_id, auth.uid())))
  ));

CREATE POLICY "Delete checklists (owner or member)"
  ON public.seguimiento_checklists FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.seguimientos s
    WHERE s.id = seguimiento_id
      AND (s.user_id = auth.uid() OR public.is_seguimiento_member(s.id, auth.uid())
           OR (s.board_id IS NOT NULL AND public.is_board_member(s.board_id, auth.uid())))
  ));

DROP POLICY IF EXISTS "owner insert sci" ON public.seguimiento_checklist_items;
DROP POLICY IF EXISTS "owner update sci" ON public.seguimiento_checklist_items;
DROP POLICY IF EXISTS "owner delete sci" ON public.seguimiento_checklist_items;

CREATE POLICY "Insert checklist items (owner or member)"
  ON public.seguimiento_checklist_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.seguimiento_checklists c
    JOIN public.seguimientos s ON s.id = c.seguimiento_id
    WHERE c.id = checklist_id
      AND (s.user_id = auth.uid() OR public.is_seguimiento_member(s.id, auth.uid())
           OR (s.board_id IS NOT NULL AND public.is_board_member(s.board_id, auth.uid())))
  ));

CREATE POLICY "Update checklist items (owner or member)"
  ON public.seguimiento_checklist_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.seguimiento_checklists c
    JOIN public.seguimientos s ON s.id = c.seguimiento_id
    WHERE c.id = checklist_id
      AND (s.user_id = auth.uid() OR public.is_seguimiento_member(s.id, auth.uid())
           OR (s.board_id IS NOT NULL AND public.is_board_member(s.board_id, auth.uid())))
  ));

CREATE POLICY "Delete checklist items (owner or member)"
  ON public.seguimiento_checklist_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.seguimiento_checklists c
    JOIN public.seguimientos s ON s.id = c.seguimiento_id
    WHERE c.id = checklist_id
      AND (s.user_id = auth.uid() OR public.is_seguimiento_member(s.id, auth.uid())
           OR (s.board_id IS NOT NULL AND public.is_board_member(s.board_id, auth.uid())))
  ));

DROP POLICY IF EXISTS "owner insert sa" ON public.seguimiento_adjuntos;
DROP POLICY IF EXISTS "owner delete sa" ON public.seguimiento_adjuntos;

CREATE POLICY "Insert adjuntos (owner or member)"
  ON public.seguimiento_adjuntos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.seguimientos s
    WHERE s.id = seguimiento_id
      AND (s.user_id = auth.uid() OR public.is_seguimiento_member(s.id, auth.uid())
           OR (s.board_id IS NOT NULL AND public.is_board_member(s.board_id, auth.uid())))
  ));

CREATE POLICY "Delete adjuntos (owner or uploader)"
  ON public.seguimiento_adjuntos FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.seguimientos s
    WHERE s.id = seguimiento_id AND s.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "owner insert sei" ON public.seguimiento_etiqueta_items;
DROP POLICY IF EXISTS "owner delete sei" ON public.seguimiento_etiqueta_items;

CREATE POLICY "Insert etiqueta items (owner or member)"
  ON public.seguimiento_etiqueta_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.seguimientos s
    WHERE s.id = seguimiento_id
      AND (s.user_id = auth.uid() OR public.is_seguimiento_member(s.id, auth.uid())
           OR (s.board_id IS NOT NULL AND public.is_board_member(s.board_id, auth.uid())))
  ));

CREATE POLICY "Delete etiqueta items (owner or member)"
  ON public.seguimiento_etiqueta_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.seguimientos s
    WHERE s.id = seguimiento_id
      AND (s.user_id = auth.uid() OR public.is_seguimiento_member(s.id, auth.uid())
           OR (s.board_id IS NOT NULL AND public.is_board_member(s.board_id, auth.uid())))
  ));
