
-- documents
DROP POLICY IF EXISTS "Admin or responsable same silo delete docs" ON public.documents;
DROP POLICY IF EXISTS "Admin or responsable delete docs" ON public.documents;
CREATE POLICY "Admin or responsable delete docs"
ON public.documents FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    public.has_role(auth.uid(), 'responsable_metodos'::app_role)
    AND (silo = 'sinsilo'::silo_type OR public.user_has_silo(auth.uid(), silo))
  )
);

-- document_versions: delete sigue regla del documento padre
DROP POLICY IF EXISTS "Editors/admins/responsables delete versions" ON public.document_versions;
CREATE POLICY "Delete versions follows doc policy"
ON public.document_versions FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_versions.document_id
      AND public.has_role(auth.uid(), 'responsable_metodos'::app_role)
      AND (d.silo = 'sinsilo'::silo_type OR public.user_has_silo(auth.uid(), d.silo))
  )
);

-- documentos
DROP POLICY IF EXISTS "Admin or responsable same silo delete documentos" ON public.documentos;
DROP POLICY IF EXISTS "Admin or responsable delete documentos" ON public.documentos;
CREATE POLICY "Admin or responsable delete documentos"
ON public.documentos FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    public.has_role(auth.uid(), 'responsable_metodos'::app_role)
    AND (silo = 'sinsilo' OR public.user_has_silo(auth.uid(), silo::silo_type))
  )
);
