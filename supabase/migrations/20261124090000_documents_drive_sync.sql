-- Sincronización automática con la unidad compartida "Documentación" de Google Drive
-- (ver supabase/functions/sync-drive). Cada documento queda atado a su archivo
-- de Drive por el ID del archivo, que no cambia aunque lo renombren o lo muevan.

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS drive_file_id text,
  -- Ruta de carpetas dentro de la unidad, p. ej. "Mayoreo / Logística / Recepción / Normas"
  ADD COLUMN IF NOT EXISTS drive_path text,
  -- Nombre del archivo la última vez que se vio. Si cambia, lo renombraron en
  -- Drive y el título se actualiza; en el primer emparejamiento NO se toca el
  -- título que ya tenía el documento en la app.
  ADD COLUMN IF NOT EXISTS drive_nombre text,
  ADD COLUMN IF NOT EXISTS drive_modified_at timestamptz,
  -- Última vez que la sincronización vio el archivo en la unidad. Solo los
  -- documentos que la sincronización ha visto alguna vez pueden marcarse como
  -- desincorporados por ella (un enlace a un archivo de otra unidad nunca se toca).
  ADD COLUMN IF NOT EXISTS drive_visto_at timestamptz,
  -- Cuándo la sincronización detectó que el archivo ya no está (papelera / borrado).
  ADD COLUMN IF NOT EXISTS drive_eliminado_at timestamptz;

-- updated_at solo debe moverse cuando cambia el documento, no cuando la
-- sincronización anota datos de seguimiento de Drive (si no, cada vinculación
-- marcaría cientos de documentos como "modificados hoy").
CREATE OR REPLACE FUNCTION public.documents_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  cols_sync text[] := ARRAY['updated_at','drive_file_id','drive_path','drive_nombre',
                            'drive_modified_at','drive_visto_at','drive_eliminado_at'];
BEGIN
  IF (to_jsonb(NEW) - cols_sync) = (to_jsonb(OLD) - cols_sync) THEN
    NEW.updated_at := OLD.updated_at;
  ELSE
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.documents_set_updated_at();

-- No es UNIQUE a propósito: hoy hay documentos distintos de la app que apuntan
-- al mismo archivo de Drive. La sincronización los manda a revisión en vez de elegir uno.
CREATE INDEX IF NOT EXISTS idx_documents_drive_file_id ON public.documents (drive_file_id);

-- Rellena el ID de archivo desde los enlaces ya cargados a mano
-- (docs.google.com/.../d/<id>/..., drive.google.com/file/d/<id>/..., ...?id=<id>).
UPDATE public.documents
SET drive_file_id = substring(drive_link from '(?:/d/|[?&]id=)([a-zA-Z0-9_-]{20,})')
WHERE drive_file_id IS NULL
  AND drive_link IS NOT NULL
  AND substring(drive_link from '(?:/d/|[?&]id=)([a-zA-Z0-9_-]{20,})') IS NOT NULL;

-- Archivos de Drive que la sincronización no pudo resolver sola: coincidencia
-- ambigua con documentos existentes, tipo de documento no deducible, o varios
-- documentos de la app apuntando al mismo archivo. Se reescribe en cada corrida.
CREATE TABLE IF NOT EXISTS public.drive_sync_revision (
  drive_file_id text PRIMARY KEY,
  empresa public.empresa_type,
  silo public.silo_type,
  title text NOT NULL,
  drive_path text,
  drive_link text,
  mime_type text,
  motivo text NOT NULL,          -- 'coincidencia_ambigua' | 'sin_tipo' | 'enlace_repetido'
  candidatos jsonb,              -- documentos de la app que podrían ser este archivo
  detectado_at timestamptz NOT NULL DEFAULT now(),
  actualizado_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.drive_sync_revision ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins ven revisión de sync Drive" ON public.drive_sync_revision;
CREATE POLICY "Admins ven revisión de sync Drive"
  ON public.drive_sync_revision FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
