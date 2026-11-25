-- Pantalla de revisión de la sincronización con Drive (Administración > Sincronización Drive).

-- Al resolver un caso, el admin lo quita de la lista sin esperar a la próxima
-- corrida (que solo ocurre si algo cambió en la unidad).
DROP POLICY IF EXISTS "Admins resuelven revisión de sync Drive" ON public.drive_sync_revision;
CREATE POLICY "Admins resuelven revisión de sync Drive"
  ON public.drive_sync_revision FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Archivos que un admin decidió no registrar (copias, borradores de prueba…).
-- La sincronización los salta para siempre, hasta que se quiten de aquí.
CREATE TABLE IF NOT EXISTS public.drive_sync_ignorados (
  drive_file_id text PRIMARY KEY,
  title text NOT NULL,
  drive_path text,
  ignorado_por uuid DEFAULT auth.uid(),
  ignorado_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.drive_sync_ignorados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins gestionan ignorados de sync Drive" ON public.drive_sync_ignorados;
CREATE POLICY "Admins gestionan ignorados de sync Drive"
  ON public.drive_sync_ignorados FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
