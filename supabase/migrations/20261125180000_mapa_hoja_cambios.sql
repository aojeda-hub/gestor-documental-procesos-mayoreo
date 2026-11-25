-- Espejo app -> Google Sheet del Mapa de Procesos.
--
-- Cuando una persona (desde la app) crea, edita o elimina un documento del Mapa
-- de Procesos, se anota el cambio en mapa_hoja_cambios. El Apps Script del Sheet
-- (supabase/functions/sync-mapa-sheet/apps-script.gs) lo recoge cada minuto, lo
-- escribe en la pestaña del silo (Logística, Personal, Compras, ...) y así la
-- pestaña "Index (dinámico)" queda igual que la app.
--
-- Solo se anotan cambios hechos por usuarios de la app (rol authenticated): lo que
-- escriben las sincronizaciones (service_role) o el SQL Editor no vuelve al Sheet,
-- así no hay ida y vuelta.
--
-- Además: si una persona elimina en la app un documento que tiene archivo en
-- Drive, el archivo queda en drive_sync_ignorados para que la sincronización de
-- Drive no lo vuelva a crear.

CREATE TABLE IF NOT EXISTS public.mapa_hoja_cambios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,                 -- sin FK: el documento puede ya no existir (eliminar)
  accion text NOT NULL,                      -- insertar | actualizar | eliminar
  antes jsonb,                               -- cómo está hoy la fila en el Sheet (para encontrarla)
  cambios jsonb NOT NULL DEFAULT '{}'::jsonb, -- campo -> valor nuevo (insertar: todos los campos)
  estado text NOT NULL DEFAULT 'pendiente',  -- pendiente | hecho | error
  detalle text,
  solicitado_por uuid,
  solicitado_at timestamptz NOT NULL DEFAULT now(),
  procesado_at timestamptz
);

-- Un solo cambio pendiente por documento: las ediciones seguidas se combinan.
CREATE UNIQUE INDEX IF NOT EXISTS idx_mapa_hoja_cambios_pendiente
  ON public.mapa_hoja_cambios (document_id) WHERE estado = 'pendiente';

ALTER TABLE public.mapa_hoja_cambios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins ven cambios al Sheet" ON public.mapa_hoja_cambios;
CREATE POLICY "Admins ven cambios al Sheet"
  ON public.mapa_hoja_cambios FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins borran cambios al Sheet" ON public.mapa_hoja_cambios;
CREATE POLICY "Admins borran cambios al Sheet"
  ON public.mapa_hoja_cambios FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Campos del documento que tienen columna en la pestaña del silo.
CREATE OR REPLACE FUNCTION public.mapa_hoja_campos(d public.documents)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'silo', d.silo,
    'macroproceso_codigo', d.macroproceso_codigo,
    'macroproceso', d.macroproceso,
    'mapeo_sistemico', d.mapeo_sistemico,
    'proceso_codigo', d.proceso_codigo,
    'proceso', d.proceso,
    'subproceso_codigo', d.subproceso_codigo,
    'subproceso', d.subproceso,
    'documento_codigo', d.documento_codigo,
    'doc_type', d.doc_type,
    'title', d.title,
    'estatus', d.estatus,
    'fecha_actualizacion', d.fecha_actualizacion,
    'observaciones', d.observaciones
  );
$$;

-- Lo necesario para ubicar la fila actual en el Sheet.
CREATE OR REPLACE FUNCTION public.mapa_hoja_ubicacion(d public.documents)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'silo', d.silo,
    'macroproceso_codigo', d.macroproceso_codigo,
    'proceso_codigo', d.proceso_codigo,
    'subproceso_codigo', d.subproceso_codigo,
    'documento_codigo', d.documento_codigo,
    'title', d.title,
    'orden_hoja', d.orden_hoja
  );
$$;

CREATE OR REPLACE FUNCTION public.documents_encolar_cambio_hoja()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  es_app boolean := coalesce(auth.role(), '') = 'authenticated';
  old_mapa boolean;
  new_mapa boolean;
  pend public.mapa_hoja_cambios%ROWTYPE;
  v_old jsonb;
  v_new jsonb;
  diff jsonb := '{}'::jsonb;
  k text;
BEGIN
  IF NOT es_app THEN
    RETURN coalesce(NEW, OLD);
  END IF;

  -- Documento eliminado en la app con archivo en Drive: que la sincronización
  -- de Drive no lo vuelva a registrar.
  IF TG_OP = 'DELETE' AND OLD.drive_file_id IS NOT NULL THEN
    INSERT INTO public.drive_sync_ignorados (drive_file_id, title, drive_path)
    VALUES (OLD.drive_file_id, OLD.title, OLD.drive_path)
    ON CONFLICT (drive_file_id) DO NOTHING;
  END IF;

  old_mapa := TG_OP <> 'INSERT' AND OLD.empresa = 'mayoreo' AND OLD.macroproceso_codigo IS NOT NULL;
  new_mapa := TG_OP <> 'DELETE' AND NEW.empresa = 'mayoreo' AND NEW.macroproceso_codigo IS NOT NULL;
  IF NOT old_mapa AND NOT new_mapa THEN
    RETURN coalesce(NEW, OLD);
  END IF;

  SELECT * INTO pend FROM public.mapa_hoja_cambios
   WHERE document_id = coalesce(NEW.id, OLD.id) AND estado = 'pendiente';

  -- Sale del mapa (eliminado, o le quitaron el código de macroproceso).
  IF old_mapa AND NOT new_mapa THEN
    IF pend.id IS NOT NULL AND pend.accion = 'insertar' THEN
      DELETE FROM public.mapa_hoja_cambios WHERE id = pend.id;   -- nunca llegó al Sheet
    ELSIF pend.id IS NOT NULL THEN
      UPDATE public.mapa_hoja_cambios
         SET accion = 'eliminar', cambios = '{}'::jsonb, solicitado_at = now(), solicitado_por = auth.uid()
       WHERE id = pend.id;
    ELSE
      INSERT INTO public.mapa_hoja_cambios (document_id, accion, antes, solicitado_por)
      VALUES (OLD.id, 'eliminar', public.mapa_hoja_ubicacion(OLD), auth.uid());
    END IF;
    RETURN coalesce(NEW, OLD);
  END IF;

  -- Entra al mapa (nuevo, o le pusieron código de macroproceso).
  IF new_mapa AND NOT old_mapa THEN
    IF pend.id IS NOT NULL THEN
      UPDATE public.mapa_hoja_cambios
         SET accion = 'insertar', antes = NULL, cambios = public.mapa_hoja_campos(NEW), solicitado_at = now()
       WHERE id = pend.id;
    ELSE
      INSERT INTO public.mapa_hoja_cambios (document_id, accion, cambios, solicitado_por)
      VALUES (NEW.id, 'insertar', public.mapa_hoja_campos(NEW), auth.uid());
    END IF;
    RETURN NEW;
  END IF;

  -- Sigue en el mapa: solo los campos que cambiaron.
  v_old := public.mapa_hoja_campos(OLD);
  v_new := public.mapa_hoja_campos(NEW);
  FOR k IN SELECT jsonb_object_keys(v_new) LOOP
    IF v_new -> k IS DISTINCT FROM v_old -> k THEN
      diff := diff || jsonb_build_object(k, v_new -> k);
    END IF;
  END LOOP;
  IF diff = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  IF pend.id IS NOT NULL THEN
    UPDATE public.mapa_hoja_cambios
       SET cambios = cambios || diff, solicitado_at = now(), solicitado_por = auth.uid()
     WHERE id = pend.id;
  ELSE
    INSERT INTO public.mapa_hoja_cambios (document_id, accion, antes, cambios, solicitado_por)
    VALUES (NEW.id, 'actualizar', public.mapa_hoja_ubicacion(OLD), diff, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_documents_encolar_cambio_hoja ON public.documents;
CREATE TRIGGER trg_documents_encolar_cambio_hoja
  AFTER INSERT OR UPDATE OR DELETE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.documents_encolar_cambio_hoja();
