
-- 1. Update app_role enum
-- PostgreSQL doesn't allow ALTER TYPE ... ADD VALUE inside a transaction block safely in some envs.
-- But we can do it one by one.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'metodos';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'comercial';

-- 2. Update existing roles
UPDATE public.user_roles SET role = 'metodos' WHERE role = 'editor';
UPDATE public.user_roles SET role = 'comercial' WHERE role = 'viewer';

-- 3. Update handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  -- Default role: comercial
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'comercial');
  RETURN NEW;
END;
$$;

-- Documents: View documents (Allow admins and metodos to see all, others only same silo if confidential)
DROP POLICY IF EXISTS "View documents" ON public.documents;
CREATE POLICY "View documents" ON public.documents FOR SELECT TO authenticated USING (
  NOT confidential
  OR silo = (SELECT p.silo FROM public.profiles p WHERE p.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'metodos')
);

-- Documents: Editors/admins insert docs
DROP POLICY IF EXISTS "Editors/admins insert docs" ON public.documents;
CREATE POLICY "Admins/metodos insert docs" ON public.documents FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'metodos')
);

-- Documents: Editors/admins update docs
DROP POLICY IF EXISTS "Editors/admins update docs" ON public.documents;
CREATE POLICY "Admins/metodos update docs" ON public.documents FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'metodos')
);

-- Documents: Admins delete docs (Now also for metodos)
DROP POLICY IF EXISTS "Admins delete docs" ON public.documents;
CREATE POLICY "Admins/metodos delete docs" ON public.documents FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'metodos')
);

-- Document versions: Editors/admins insert versions
DROP POLICY IF EXISTS "Editors/admins insert versions" ON public.document_versions;
CREATE POLICY "Admins/metodos insert versions" ON public.document_versions FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'metodos')
);

-- Document versions: Editors/admins update versions
DROP POLICY IF EXISTS "Editors/admins update versions" ON public.document_versions;
CREATE POLICY "Admins/metodos update versions" ON public.document_versions FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'metodos')
);

-- Indicators: Editors/admins insert indicators
DROP POLICY IF EXISTS "Editors/admins insert indicators" ON public.indicators;
CREATE POLICY "Admins/metodos insert indicators" ON public.indicators FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'metodos')
);

-- Indicators: Editors/admins update indicators
DROP POLICY IF EXISTS "Editors/admins update indicators" ON public.indicators;
CREATE POLICY "Admins/metodos update indicators" ON public.indicators FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'metodos')
);

-- Indicators: Admins delete indicators (Keep it admin only or also metodos? User said "eliminar documentos", didn't specify indicators, but usually they go together)
-- I'll stick to documents for now as requested.

-- Document-indicator links: Editors manage doc-indicator links
DROP POLICY IF EXISTS "Editors manage doc-indicator links" ON public.document_indicators;
CREATE POLICY "Admins/metodos manage doc-indicator links" ON public.document_indicators FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'metodos')
);

-- Review alerts: Editors manage alerts
DROP POLICY IF EXISTS "Editors manage alerts" ON public.review_alerts;
CREATE POLICY "Admins/metodos manage alerts" ON public.review_alerts FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'metodos')
);

-- Storage bucket for documents
DROP POLICY IF EXISTS "Editors can upload doc files" ON storage.objects;
CREATE POLICY "Admins/metodos can upload doc files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'documents' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'metodos'))
);

DROP POLICY IF EXISTS "Editors can update doc files" ON storage.objects;
CREATE POLICY "Admins/metodos can update doc files" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'documents' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'metodos'))
);
