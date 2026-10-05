-- Orden manual de los nodos del árbol de Mapa de Procesos (silo, macroproceso,
-- proceso, subproceso). node_key es la ruta completa del nodo tal como la arma
-- MapaTree.tsx (incluye el padre), así que identifica el nodo exacto dentro de
-- su grupo de hermanos. Si no hay fila para un nodo, se usa el orden natural
-- (código + nombre) como respaldo.
CREATE TABLE IF NOT EXISTS public.mapa_orden (
  node_key text PRIMARY KEY,
  orden integer NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mapa_orden ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View mapa orden" ON public.mapa_orden
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Editors set mapa orden" ON public.mapa_orden
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'editor'::app_role)
    OR public.has_role(auth.uid(), 'responsable_metodos'::app_role)
  );

CREATE POLICY "Editors update mapa orden" ON public.mapa_orden
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'editor'::app_role)
    OR public.has_role(auth.uid(), 'responsable_metodos'::app_role)
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'editor'::app_role)
    OR public.has_role(auth.uid(), 'responsable_metodos'::app_role)
  );
