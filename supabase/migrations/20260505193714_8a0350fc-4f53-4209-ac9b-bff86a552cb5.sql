-- 1. Tabla de silos por usuario
CREATE TABLE public.user_silos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  silo silo_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, silo)
);

ALTER TABLE public.user_silos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own silos"
ON public.user_silos FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage silos"
ON public.user_silos FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Migrar silos existentes de profiles
INSERT INTO public.user_silos (user_id, silo)
SELECT user_id, silo FROM public.profiles
WHERE silo IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. Función auxiliar
CREATE OR REPLACE FUNCTION public.user_has_silo(_user_id uuid, _silo silo_type)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_silos
    WHERE user_id = _user_id AND silo = _silo
  )
$$;

-- 4. Actualizar políticas que usaban silo único
DROP POLICY IF EXISTS "View documents" ON public.documents;
CREATE POLICY "View documents" ON public.documents
FOR SELECT TO authenticated
USING (
  (NOT confidential)
  OR public.user_has_silo(auth.uid(), silo)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Admin or responsable same silo delete docs" ON public.documents;
CREATE POLICY "Admin or responsable same silo delete docs" ON public.documents
FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (public.has_role(auth.uid(), 'responsable_metodos'::app_role)
      AND public.user_has_silo(auth.uid(), silo))
);

DROP POLICY IF EXISTS "Admin or responsable same silo delete documentos" ON public.documentos;
CREATE POLICY "Admin or responsable same silo delete documentos" ON public.documentos
FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (public.has_role(auth.uid(), 'responsable_metodos'::app_role)
      AND public.user_has_silo(auth.uid(), silo::silo_type))
);

DROP POLICY IF EXISTS "View versions follows doc policy" ON public.document_versions;
CREATE POLICY "View versions follows doc policy" ON public.document_versions
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.documents d
  WHERE d.id = document_versions.document_id
    AND ((NOT d.confidential)
         OR public.user_has_silo(auth.uid(), d.silo)
         OR public.has_role(auth.uid(), 'admin'::app_role))
));