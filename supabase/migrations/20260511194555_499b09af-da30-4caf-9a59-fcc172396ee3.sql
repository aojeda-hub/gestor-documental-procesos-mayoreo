
-- Add columns to seguimientos
ALTER TABLE public.seguimientos
  ADD COLUMN IF NOT EXISTS fecha_inicio date,
  ADD COLUMN IF NOT EXISTS ubicacion text;

-- ============ CHECKLISTS ============
CREATE TABLE public.seguimiento_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seguimiento_id uuid NOT NULL REFERENCES public.seguimientos(id) ON DELETE CASCADE,
  titulo text NOT NULL DEFAULT 'Checklist',
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sc_seg ON public.seguimiento_checklists(seguimiento_id);
ALTER TABLE public.seguimiento_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner select sc" ON public.seguimiento_checklists FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.seguimientos s WHERE s.id = seguimiento_id AND s.user_id = auth.uid()));
CREATE POLICY "owner insert sc" ON public.seguimiento_checklists FOR INSERT TO authenticated
  WITH CHECK (EXISTS(SELECT 1 FROM public.seguimientos s WHERE s.id = seguimiento_id AND s.user_id = auth.uid()));
CREATE POLICY "owner update sc" ON public.seguimiento_checklists FOR UPDATE TO authenticated
  USING (EXISTS(SELECT 1 FROM public.seguimientos s WHERE s.id = seguimiento_id AND s.user_id = auth.uid()));
CREATE POLICY "owner delete sc" ON public.seguimiento_checklists FOR DELETE TO authenticated
  USING (EXISTS(SELECT 1 FROM public.seguimientos s WHERE s.id = seguimiento_id AND s.user_id = auth.uid()));

CREATE TABLE public.seguimiento_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.seguimiento_checklists(id) ON DELETE CASCADE,
  texto text NOT NULL,
  completado boolean NOT NULL DEFAULT false,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sci_cl ON public.seguimiento_checklist_items(checklist_id);
ALTER TABLE public.seguimiento_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner select sci" ON public.seguimiento_checklist_items FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.seguimiento_checklists c JOIN public.seguimientos s ON s.id = c.seguimiento_id WHERE c.id = checklist_id AND s.user_id = auth.uid()));
CREATE POLICY "owner insert sci" ON public.seguimiento_checklist_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS(SELECT 1 FROM public.seguimiento_checklists c JOIN public.seguimientos s ON s.id = c.seguimiento_id WHERE c.id = checklist_id AND s.user_id = auth.uid()));
CREATE POLICY "owner update sci" ON public.seguimiento_checklist_items FOR UPDATE TO authenticated
  USING (EXISTS(SELECT 1 FROM public.seguimiento_checklists c JOIN public.seguimientos s ON s.id = c.seguimiento_id WHERE c.id = checklist_id AND s.user_id = auth.uid()));
CREATE POLICY "owner delete sci" ON public.seguimiento_checklist_items FOR DELETE TO authenticated
  USING (EXISTS(SELECT 1 FROM public.seguimiento_checklists c JOIN public.seguimientos s ON s.id = c.seguimiento_id WHERE c.id = checklist_id AND s.user_id = auth.uid()));

-- ============ ADJUNTOS ============
CREATE TABLE public.seguimiento_adjuntos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seguimiento_id uuid NOT NULL REFERENCES public.seguimientos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  nombre text NOT NULL,
  storage_path text,
  enlace text,
  tamano_bytes bigint,
  tipo_mime text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sa_seg ON public.seguimiento_adjuntos(seguimiento_id);
ALTER TABLE public.seguimiento_adjuntos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner select sa" ON public.seguimiento_adjuntos FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.seguimientos s WHERE s.id = seguimiento_id AND s.user_id = auth.uid()));
CREATE POLICY "owner insert sa" ON public.seguimiento_adjuntos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS(SELECT 1 FROM public.seguimientos s WHERE s.id = seguimiento_id AND s.user_id = auth.uid()));
CREATE POLICY "owner delete sa" ON public.seguimiento_adjuntos FOR DELETE TO authenticated
  USING (EXISTS(SELECT 1 FROM public.seguimientos s WHERE s.id = seguimiento_id AND s.user_id = auth.uid()));

-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('seguimiento-adjuntos', 'seguimiento-adjuntos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "user select own seg attach" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'seguimiento-adjuntos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "user insert own seg attach" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'seguimiento-adjuntos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "user delete own seg attach" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'seguimiento-adjuntos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============ ETIQUETAS ============
CREATE TABLE public.seguimiento_etiquetas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nombre text NOT NULL,
  color text NOT NULL DEFAULT '#64748b',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seguimiento_etiquetas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user manage own etiquetas" ON public.seguimiento_etiquetas FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.seguimiento_etiqueta_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seguimiento_id uuid NOT NULL REFERENCES public.seguimientos(id) ON DELETE CASCADE,
  etiqueta_id uuid NOT NULL REFERENCES public.seguimiento_etiquetas(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(seguimiento_id, etiqueta_id)
);
CREATE INDEX idx_sei_seg ON public.seguimiento_etiqueta_items(seguimiento_id);
ALTER TABLE public.seguimiento_etiqueta_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner select sei" ON public.seguimiento_etiqueta_items FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.seguimientos s WHERE s.id = seguimiento_id AND s.user_id = auth.uid()));
CREATE POLICY "owner insert sei" ON public.seguimiento_etiqueta_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS(SELECT 1 FROM public.seguimientos s WHERE s.id = seguimiento_id AND s.user_id = auth.uid()));
CREATE POLICY "owner delete sei" ON public.seguimiento_etiqueta_items FOR DELETE TO authenticated
  USING (EXISTS(SELECT 1 FROM public.seguimientos s WHERE s.id = seguimiento_id AND s.user_id = auth.uid()));

-- ============ MIEMBROS ============
CREATE TABLE public.seguimiento_miembros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seguimiento_id uuid NOT NULL REFERENCES public.seguimientos(id) ON DELETE CASCADE,
  member_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(seguimiento_id, member_user_id)
);
CREATE INDEX idx_sm_seg ON public.seguimiento_miembros(seguimiento_id);
ALTER TABLE public.seguimiento_miembros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner select sm" ON public.seguimiento_miembros FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.seguimientos s WHERE s.id = seguimiento_id AND s.user_id = auth.uid()));
CREATE POLICY "owner insert sm" ON public.seguimiento_miembros FOR INSERT TO authenticated
  WITH CHECK (EXISTS(SELECT 1 FROM public.seguimientos s WHERE s.id = seguimiento_id AND s.user_id = auth.uid()));
CREATE POLICY "owner delete sm" ON public.seguimiento_miembros FOR DELETE TO authenticated
  USING (EXISTS(SELECT 1 FROM public.seguimientos s WHERE s.id = seguimiento_id AND s.user_id = auth.uid()));
