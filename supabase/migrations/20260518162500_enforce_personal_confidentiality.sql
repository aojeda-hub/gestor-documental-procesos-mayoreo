-- Enforce confidentiality of documents: only visible to admins and responsable_metodos in personal silo
DROP POLICY IF EXISTS "View documents" ON public.documents;
CREATE POLICY "View documents" ON public.documents
FOR SELECT TO authenticated
USING (
  (NOT confidential)
  OR (public.has_role(auth.uid(), 'responsable_metodos'::app_role) AND public.user_has_silo(auth.uid(), 'personal'::silo_type))
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Enforce confidentiality of document versions
DROP POLICY IF EXISTS "View versions follows doc policy" ON public.document_versions;
CREATE POLICY "View versions follows doc policy" ON public.document_versions
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.documents d
  WHERE d.id = document_versions.document_id
    AND ((NOT d.confidential)
         OR (public.has_role(auth.uid(), 'responsable_metodos'::app_role) AND public.user_has_silo(auth.uid(), 'personal'::silo_type))
         OR public.has_role(auth.uid(), 'admin'::app_role))
));
