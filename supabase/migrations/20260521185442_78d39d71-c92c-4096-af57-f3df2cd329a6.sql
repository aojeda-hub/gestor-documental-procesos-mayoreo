
-- Permitir a miembros ver y actualizar seguimientos a los que fueron añadidos
DROP POLICY IF EXISTS "Users view own or board seguimientos" ON public.seguimientos;
DROP POLICY IF EXISTS "Users update own or board seguimientos" ON public.seguimientos;

CREATE POLICY "View seguimientos (owner, board or member)"
ON public.seguimientos FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR board_id IS NOT NULL
  OR EXISTS (SELECT 1 FROM public.seguimiento_miembros m WHERE m.seguimiento_id = seguimientos.id AND m.member_user_id = auth.uid())
);

CREATE POLICY "Update seguimientos (owner, board or member)"
ON public.seguimientos FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR board_id IS NOT NULL
  OR EXISTS (SELECT 1 FROM public.seguimiento_miembros m WHERE m.seguimiento_id = seguimientos.id AND m.member_user_id = auth.uid())
);

-- Permitir a miembros ver lista de miembros del seguimiento
DROP POLICY IF EXISTS "owner select sm" ON public.seguimiento_miembros;
CREATE POLICY "View miembros (owner or member)"
ON public.seguimiento_miembros FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.seguimientos s WHERE s.id = seguimiento_miembros.seguimiento_id AND s.user_id = auth.uid())
  OR member_user_id = auth.uid()
);

-- Permitir a miembros ver notas, checklists, items, adjuntos, etiquetas
DROP POLICY IF EXISTS "Users view notes of own seguimientos" ON public.seguimiento_notas;
CREATE POLICY "View notas (owner or member)"
ON public.seguimiento_notas FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.seguimientos s WHERE s.id = seguimiento_notas.seguimiento_id
    AND (s.user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.seguimiento_miembros m WHERE m.seguimiento_id = s.id AND m.member_user_id = auth.uid())))
);

DROP POLICY IF EXISTS "Users insert notes on own seguimientos" ON public.seguimiento_notas;
CREATE POLICY "Insert notas (owner or member)"
ON public.seguimiento_notas FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM public.seguimientos s WHERE s.id = seguimiento_notas.seguimiento_id
    AND (s.user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.seguimiento_miembros m WHERE m.seguimiento_id = s.id AND m.member_user_id = auth.uid())))
);

DROP POLICY IF EXISTS "owner select sc" ON public.seguimiento_checklists;
CREATE POLICY "View checklists (owner or member)"
ON public.seguimiento_checklists FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.seguimientos s WHERE s.id = seguimiento_checklists.seguimiento_id
    AND (s.user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.seguimiento_miembros m WHERE m.seguimiento_id = s.id AND m.member_user_id = auth.uid())))
);

DROP POLICY IF EXISTS "owner select sci" ON public.seguimiento_checklist_items;
CREATE POLICY "View checklist items (owner or member)"
ON public.seguimiento_checklist_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.seguimiento_checklists c
    JOIN public.seguimientos s ON s.id = c.seguimiento_id
    WHERE c.id = seguimiento_checklist_items.checklist_id
      AND (s.user_id = auth.uid()
           OR EXISTS (SELECT 1 FROM public.seguimiento_miembros m WHERE m.seguimiento_id = s.id AND m.member_user_id = auth.uid()))
  )
);

DROP POLICY IF EXISTS "owner select sa" ON public.seguimiento_adjuntos;
CREATE POLICY "View adjuntos (owner or member)"
ON public.seguimiento_adjuntos FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.seguimientos s WHERE s.id = seguimiento_adjuntos.seguimiento_id
    AND (s.user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.seguimiento_miembros m WHERE m.seguimiento_id = s.id AND m.member_user_id = auth.uid())))
);

DROP POLICY IF EXISTS "owner select sei" ON public.seguimiento_etiqueta_items;
CREATE POLICY "View etiqueta items (owner or member)"
ON public.seguimiento_etiqueta_items FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.seguimientos s WHERE s.id = seguimiento_etiqueta_items.seguimiento_id
    AND (s.user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.seguimiento_miembros m WHERE m.seguimiento_id = s.id AND m.member_user_id = auth.uid())))
);

-- Actualizar trigger para que el link de notificación abra la tarjeta directamente
CREATE OR REPLACE FUNCTION public.notify_seguimiento_miembro()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_titulo text;
  v_actor_name text;
BEGIN
  SELECT user_id, titulo INTO v_owner_id, v_titulo
  FROM public.seguimientos WHERE id = NEW.seguimiento_id;

  IF NEW.member_user_id = v_owner_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, email, 'Alguien') INTO v_actor_name
  FROM public.profiles WHERE user_id = v_owner_id LIMIT 1;

  INSERT INTO public.notificaciones (user_id, created_by, tipo, titulo, mensaje, link, metadata)
  VALUES (
    NEW.member_user_id,
    v_owner_id,
    'seguimiento_miembro',
    'Fuiste agregado a un seguimiento',
    COALESCE(v_actor_name, 'Alguien') || ' te agregó a "' || COALESCE(v_titulo, 'un seguimiento') || '" para colaborar.',
    '/seguimientos?card=' || NEW.seguimiento_id::text,
    jsonb_build_object('seguimiento_id', NEW.seguimiento_id)
  );

  RETURN NEW;
END;
$$;
