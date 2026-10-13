-- El rol colaborador ya no ve ni edita la documentación ni el Mapa de
-- Procesos (que se construye sobre la tabla documents). Solo admin y
-- responsable_metodos acceden:
--   * admin: todo, incluidos confidenciales.
--   * responsable_metodos: no confidenciales de cualquier silo y
--     confidenciales de su propio silo; crea/edita/elimina en su silo.

-- Lectura de documentos
DROP POLICY IF EXISTS "View documents" ON public.documents;
CREATE POLICY "View documents" ON public.documents FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'responsable_metodos')
      AND (NOT confidential OR public.user_has_silo(auth.uid(), silo)))
);

-- Crear/editar: se quita colaborador
CREATE OR REPLACE FUNCTION public.can_edit_document_row(_user_id uuid, _silo silo_type, _confidential boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR (public.has_role(_user_id, 'responsable_metodos')
          AND (_silo = 'sinsilo' OR public.user_has_silo(_user_id, _silo)));
$$;

-- Eliminar: admin o responsable de su silo (el colaborador ya no tiene
-- documentos propios que gestionar).
CREATE OR REPLACE FUNCTION public.can_delete_document(_user_id uuid, _document_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.documents d
                 WHERE d.id = _document_id
                   AND (public.has_role(_user_id, 'admin')
                        OR (public.has_role(_user_id, 'responsable_metodos')
                            AND (d.silo = 'sinsilo' OR public.user_has_silo(_user_id, d.silo)))));
$$;

-- Mapa de Procesos (orden), jerarquía de cargos y cargos ocultos
DROP POLICY IF EXISTS "Editors set mapa orden" ON public.mapa_orden;
DROP POLICY IF EXISTS "Editors update mapa orden" ON public.mapa_orden;
CREATE POLICY "Editors set mapa orden" ON public.mapa_orden FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'responsable_metodos'));
CREATE POLICY "Editors update mapa orden" ON public.mapa_orden FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'responsable_metodos'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'responsable_metodos'));

DROP POLICY IF EXISTS "Editors set jerarquia" ON public.cargo_jerarquia;
DROP POLICY IF EXISTS "Editors update jerarquia" ON public.cargo_jerarquia;
CREATE POLICY "Editors set jerarquia" ON public.cargo_jerarquia FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'responsable_metodos'));
CREATE POLICY "Editors update jerarquia" ON public.cargo_jerarquia FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'responsable_metodos'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'responsable_metodos'));

DROP POLICY IF EXISTS "Editors hide cargo" ON public.descripcion_cargo_ocultos;
DROP POLICY IF EXISTS "Editors restore cargo" ON public.descripcion_cargo_ocultos;
CREATE POLICY "Editors hide cargo" ON public.descripcion_cargo_ocultos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'responsable_metodos'));
CREATE POLICY "Editors restore cargo" ON public.descripcion_cargo_ocultos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'responsable_metodos'));
