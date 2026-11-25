-- Sincronización app -> Drive: cuando en la app cambia el tipo, silo, empresa o
-- confidencialidad de un documento que tiene archivo en Drive, se anota un
-- movimiento pendiente. El Apps Script (supabase/functions/sync-drive/apps-script.gs)
-- lo recoge en su siguiente corrida, mueve el archivo a la carpeta que
-- corresponde (creándola si no existe) y reporta el resultado.

CREATE TABLE IF NOT EXISTS public.drive_movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  drive_file_id text NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente',   -- pendiente | hecho | sin_cambio | error
  detalle text,                                -- ruta destino o mensaje de error
  solicitado_por uuid,
  solicitado_at timestamptz NOT NULL DEFAULT now(),
  procesado_at timestamptz
);

-- Un solo movimiento pendiente por documento (el último cambio manda).
CREATE UNIQUE INDEX IF NOT EXISTS idx_drive_movimientos_pendiente
  ON public.drive_movimientos (document_id) WHERE estado = 'pendiente';

ALTER TABLE public.drive_movimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins ven movimientos de Drive" ON public.drive_movimientos;
CREATE POLICY "Admins ven movimientos de Drive"
  ON public.drive_movimientos FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins borran movimientos de Drive" ON public.drive_movimientos;
CREATE POLICY "Admins borran movimientos de Drive"
  ON public.drive_movimientos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.documents_encolar_movimiento_drive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo documentos vinculados a un archivo vigente de las unidades sincronizadas.
  IF NEW.drive_file_id IS NULL OR NEW.drive_visto_at IS NULL OR NEW.drive_eliminado_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  -- Si en la misma actualización cambió drive_path, el cambio viene de la
  -- sincronización (el archivo ya se movió en Drive): no hay nada que mover.
  IF NEW.drive_path IS DISTINCT FROM OLD.drive_path THEN
    RETURN NEW;
  END IF;
  IF NEW.doc_type IS DISTINCT FROM OLD.doc_type
     OR NEW.silo IS DISTINCT FROM OLD.silo
     OR NEW.empresa IS DISTINCT FROM OLD.empresa
     OR NEW.confidential IS DISTINCT FROM OLD.confidential THEN
    DELETE FROM public.drive_movimientos WHERE document_id = NEW.id AND estado = 'pendiente';
    INSERT INTO public.drive_movimientos (document_id, drive_file_id, solicitado_por)
    VALUES (NEW.id, NEW.drive_file_id, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_documents_encolar_movimiento_drive ON public.documents;
CREATE TRIGGER trg_documents_encolar_movimiento_drive
  AFTER UPDATE OF doc_type, silo, empresa, confidential ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.documents_encolar_movimiento_drive();
