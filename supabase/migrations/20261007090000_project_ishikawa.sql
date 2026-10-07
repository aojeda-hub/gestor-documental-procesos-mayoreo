-- Análisis de Ishikawa (espina de pescado) por proyecto: un enunciado central
-- del problema/objetivo y una lista de causas por cada una de las 6 categorías
-- clásicas (6M). Mismo modelo de permisos que project_documents: dueño del
-- proyecto, admin o responsable de métodos.

CREATE TABLE public.project_ishikawa (
  project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  problema TEXT,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_ishikawa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View project ishikawa (owner/admin/responsable)"
ON public.project_ishikawa FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'responsable_metodos'::app_role)
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.created_by = auth.uid())
);

CREATE POLICY "Insert project ishikawa (owner/admin/responsable)"
ON public.project_ishikawa FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'responsable_metodos'::app_role)
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.created_by = auth.uid())
);

CREATE POLICY "Update project ishikawa (owner/admin/responsable)"
ON public.project_ishikawa FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'responsable_metodos'::app_role)
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.created_by = auth.uid())
);

CREATE TABLE public.project_ishikawa_causas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL CHECK (categoria IN ('medio_ambiente', 'tecnologia', 'personas', 'medicion', 'materiales', 'procesos')),
  texto TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_ishikawa_causas_project ON public.project_ishikawa_causas(project_id);

ALTER TABLE public.project_ishikawa_causas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View project ishikawa causas (owner/admin/responsable)"
ON public.project_ishikawa_causas FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'responsable_metodos'::app_role)
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.created_by = auth.uid())
);

CREATE POLICY "Insert project ishikawa causas (owner/admin/responsable)"
ON public.project_ishikawa_causas FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'responsable_metodos'::app_role)
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.created_by = auth.uid())
);

CREATE POLICY "Update project ishikawa causas (owner/admin/responsable)"
ON public.project_ishikawa_causas FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'responsable_metodos'::app_role)
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.created_by = auth.uid())
);

CREATE POLICY "Delete project ishikawa causas (owner/admin/responsable)"
ON public.project_ishikawa_causas FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'responsable_metodos'::app_role)
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.created_by = auth.uid())
);
