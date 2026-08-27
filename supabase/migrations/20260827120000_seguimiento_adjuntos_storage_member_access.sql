-- La politica de storage.objects para el bucket 'seguimiento-adjuntos' solo
-- permitia ver/descargar el archivo al usuario que lo subio (dueno de la
-- carpeta = primer segmento del path). La tabla seguimiento_adjuntos ya
-- permite verlos a cualquier miembro del seguimiento/tablero, pero el objeto
-- en Storage seguia bloqueado para el resto -> "Object not found" al hacer
-- clic en un adjunto subido por otro miembro.
DROP POLICY IF EXISTS "user select own seg attach" ON storage.objects;
CREATE POLICY "select seg attach (owner or member)" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'seguimiento-adjuntos' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.seguimiento_adjuntos sa
      JOIN public.seguimientos s ON s.id = sa.seguimiento_id
      WHERE sa.storage_path = storage.objects.name
        AND (s.user_id = auth.uid()
             OR public.is_seguimiento_member(s.id, auth.uid())
             OR (s.board_id IS NOT NULL AND public.is_board_member(s.board_id, auth.uid())))
    )
  )
);
