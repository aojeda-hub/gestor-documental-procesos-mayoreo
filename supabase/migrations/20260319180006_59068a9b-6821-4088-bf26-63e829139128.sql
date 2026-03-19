
-- Enums
CREATE TYPE public.doc_type AS ENUM ('norma', 'manual', 'procedimiento', 'anexo', 'formato', 'diagrama');
CREATE TYPE public.silo_type AS ENUM ('compras', 'logistica', 'ventas', 'personal', 'control', 'mercadeo', 'sistemas');
CREATE TYPE public.indicator_type AS ENUM ('eficiencia', 'eficacia', 'efectividad', 'calidad', 'productividad', 'cumplimiento');
CREATE TYPE public.frequency_type AS ENUM ('diario', 'semanal', 'quincenal', 'mensual', 'trimestral', 'semestral', 'anual');
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'viewer');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  silo silo_type,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Admin policy for user_roles
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  doc_type doc_type NOT NULL,
  silo silo_type NOT NULL,
  confidential BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Docs visible: non-confidential to all, confidential only to same silo
CREATE POLICY "View documents" ON public.documents FOR SELECT TO authenticated USING (
  NOT confidential
  OR silo = (SELECT p.silo FROM public.profiles p WHERE p.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Editors/admins insert docs" ON public.documents FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor')
);
CREATE POLICY "Editors/admins update docs" ON public.documents FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor')
);
CREATE POLICY "Admins delete docs" ON public.documents FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
);

-- Document versions
CREATE TABLE public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  description TEXT,
  authors TEXT,
  approver TEXT,
  url_word TEXT,
  url_pdf TEXT,
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, version_number)
);
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View versions follows doc policy" ON public.document_versions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id)
);
CREATE POLICY "Editors/admins insert versions" ON public.document_versions FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor')
);
CREATE POLICY "Editors/admins update versions" ON public.document_versions FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor')
);

-- Indicators (KPIs)
CREATE TABLE public.indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  silo silo_type NOT NULL,
  related_process TEXT,
  indicator_type indicator_type NOT NULL,
  definition TEXT,
  formula TEXT,
  unit TEXT,
  frequency frequency_type NOT NULL,
  data_source TEXT,
  responsible TEXT,
  goals TEXT,
  action_plan TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can view indicators" ON public.indicators FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors/admins insert indicators" ON public.indicators FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor')
);
CREATE POLICY "Editors/admins update indicators" ON public.indicators FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor')
);
CREATE POLICY "Admins delete indicators" ON public.indicators FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
);

-- Document-Indicator many-to-many
CREATE TABLE public.document_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  indicator_id UUID NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  UNIQUE(document_id, indicator_id)
);
ALTER TABLE public.document_indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View doc-indicator links" ON public.document_indicators FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors manage doc-indicator links" ON public.document_indicators FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor')
);

-- Review alerts for Normas
CREATE TABLE public.review_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.review_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View alerts" ON public.review_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors manage alerts" ON public.review_alerts FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor')
);

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  -- Default role: viewer
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_indicators_updated_at BEFORE UPDATE ON public.indicators FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger: auto-create review alert for Normas (1 year from version creation)
CREATE OR REPLACE FUNCTION public.create_norma_review_alert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_current = true THEN
    IF EXISTS (SELECT 1 FROM public.documents WHERE id = NEW.document_id AND doc_type = 'norma') THEN
      INSERT INTO public.review_alerts (document_id, due_date)
      VALUES (NEW.document_id, (NEW.created_at + INTERVAL '1 year')::date)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_version_created AFTER INSERT ON public.document_versions FOR EACH ROW EXECUTE FUNCTION public.create_norma_review_alert();

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
CREATE POLICY "Authenticated users can read doc files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "Editors can upload doc files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
CREATE POLICY "Editors can update doc files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documents');
