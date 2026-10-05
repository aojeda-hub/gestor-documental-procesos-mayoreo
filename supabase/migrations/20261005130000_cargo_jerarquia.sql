-- Jerarquía (organigrama) de las Descripciones de Cargo: para cada (depto, cargo)
-- del catálogo existente, guarda a qué cargo reporta dentro del mismo departamento.
-- parent_cargo = NULL significa "nivel superior / sin jefe" dentro de ese depto.
CREATE TABLE IF NOT EXISTS public.cargo_jerarquia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  depto text NOT NULL,
  cargo text NOT NULL,
  parent_cargo text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (depto, cargo)
);

ALTER TABLE public.cargo_jerarquia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View jerarquia" ON public.cargo_jerarquia
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Editors set jerarquia" ON public.cargo_jerarquia
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'editor'::app_role)
    OR public.has_role(auth.uid(), 'responsable_metodos'::app_role)
  );

CREATE POLICY "Editors update jerarquia" ON public.cargo_jerarquia
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'editor'::app_role)
    OR public.has_role(auth.uid(), 'responsable_metodos'::app_role)
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'editor'::app_role)
    OR public.has_role(auth.uid(), 'responsable_metodos'::app_role)
  );
