-- Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-documents', 'project-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Table
CREATE TABLE public.project_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_documents_project ON public.project_documents(project_id);

ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View project documents (owner/admin/responsable)"
ON public.project_documents FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'responsable_metodos'::app_role)
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.created_by = auth.uid())
);

CREATE POLICY "Insert project documents (owner/admin/responsable)"
ON public.project_documents FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = uploaded_by AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'responsable_metodos'::app_role)
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.created_by = auth.uid())
  )
);

CREATE POLICY "Delete project documents (owner/admin/responsable)"
ON public.project_documents FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'responsable_metodos'::app_role)
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.created_by = auth.uid())
);

-- Storage policies for bucket project-documents
CREATE POLICY "View files of own/admin/responsable projects"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-documents' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'responsable_metodos'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND p.created_by = auth.uid()
    )
  )
);

CREATE POLICY "Upload files to own/admin/responsable projects"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-documents' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'responsable_metodos'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND p.created_by = auth.uid()
    )
  )
);

CREATE POLICY "Delete files of own/admin/responsable projects"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'project-documents' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'responsable_metodos'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND p.created_by = auth.uid()
    )
  )
);