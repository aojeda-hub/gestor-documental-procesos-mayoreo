CREATE TABLE public.desarrollos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  url TEXT NOT NULL,
  descripcion TEXT,
  icono TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.desarrollos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view desarrollos"
ON public.desarrollos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert desarrollos"
ON public.desarrollos FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update desarrollos"
ON public.desarrollos FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete desarrollos"
ON public.desarrollos FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_desarrollos_updated_at
BEFORE UPDATE ON public.desarrollos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();