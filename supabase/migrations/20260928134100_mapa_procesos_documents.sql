-- Mapa de procesos: ubica cada documento en la jerarquía
-- Silo → Macroproceso → Proceso → Subproceso → Documento (reemplaza el Excel "Mapa de procesos Mayoreo")

ALTER TYPE public.documento_estatus ADD VALUE IF NOT EXISTS 'por_aprobar' AFTER 'revision';

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS subarea text,
  ADD COLUMN IF NOT EXISTS macroproceso_codigo text,
  ADD COLUMN IF NOT EXISTS macroproceso text,
  ADD COLUMN IF NOT EXISTS mapeo_sistemico text,
  ADD COLUMN IF NOT EXISTS proceso_codigo text,
  ADD COLUMN IF NOT EXISTS proceso text,
  ADD COLUMN IF NOT EXISTS subproceso_codigo text,
  ADD COLUMN IF NOT EXISTS subproceso text,
  ADD COLUMN IF NOT EXISTS documento_codigo text,
  ADD COLUMN IF NOT EXISTS fecha_actualizacion date,
  ADD COLUMN IF NOT EXISTS observaciones text;

-- Código completo, p. ej. CVP06-A1-T1-PR01
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS codigo text GENERATED ALWAYS AS (
    CASE WHEN macroproceso_codigo IS NOT NULL THEN
      macroproceso_codigo
      || COALESCE('-' || proceso_codigo, '')
      || COALESCE('-' || subproceso_codigo, '')
      || COALESCE('-' || documento_codigo, '')
    END
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_documents_silo_macro ON public.documents (silo, macroproceso_codigo, proceso_codigo, subproceso_codigo);

-- Historial de cambios de estatus
CREATE TABLE IF NOT EXISTS public.documento_estatus_historial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  estatus_anterior public.documento_estatus,
  estatus_nuevo public.documento_estatus NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_estatus_hist_doc ON public.documento_estatus_historial (document_id, changed_at DESC);

ALTER TABLE public.documento_estatus_historial ENABLE ROW LEVEL SECURITY;

-- Visible si el documento es visible (la subconsulta aplica la RLS de documents)
DROP POLICY IF EXISTS "Historial visible si el documento es visible" ON public.documento_estatus_historial;
CREATE POLICY "Historial visible si el documento es visible"
  ON public.documento_estatus_historial FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id));

CREATE OR REPLACE FUNCTION public.log_documento_estatus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.estatus IS DISTINCT FROM OLD.estatus THEN
    INSERT INTO public.documento_estatus_historial (document_id, estatus_anterior, estatus_nuevo, changed_by)
    VALUES (NEW.id, CASE WHEN TG_OP = 'UPDATE' THEN OLD.estatus END, NEW.estatus, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_documento_estatus ON public.documents;
CREATE TRIGGER trg_log_documento_estatus
  AFTER INSERT OR UPDATE OF estatus ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.log_documento_estatus();
