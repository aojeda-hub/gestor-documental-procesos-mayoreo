-- Catálogo de "Descripciones de Cargo" sin documento subido que el usuario
-- decidió quitar de la lista (cargos que ya no aplican / no se van a
-- documentar). La lista de cargos vive en código (DescripcionesCargo.tsx),
-- así que aquí solo se guarda qué pares (departamento, cargo) se ocultaron.
CREATE TABLE IF NOT EXISTS public.descripcion_cargo_ocultos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  depto text NOT NULL,
  cargo text NOT NULL,
  hidden_by uuid,
  hidden_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (depto, cargo)
);

ALTER TABLE public.descripcion_cargo_ocultos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View ocultos" ON public.descripcion_cargo_ocultos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Editors hide cargo" ON public.descripcion_cargo_ocultos
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'editor'::app_role)
    OR public.has_role(auth.uid(), 'responsable_metodos'::app_role)
  );

CREATE POLICY "Editors restore cargo" ON public.descripcion_cargo_ocultos
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'editor'::app_role)
    OR public.has_role(auth.uid(), 'responsable_metodos'::app_role)
  );
