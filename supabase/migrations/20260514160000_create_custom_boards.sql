
-- ============ TABLEROS PERSONALIZADOS ============
CREATE TABLE public.seguimiento_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  nombre text NOT NULL,
  descripcion text,
  color text DEFAULT '#0f172a',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.seguimiento_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.seguimiento_boards(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  orden integer NOT NULL DEFAULT 0,
  color text DEFAULT '#64748b',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Modificar tabla principal para referenciar tableros y columnas
ALTER TABLE public.seguimientos 
  ADD COLUMN IF NOT EXISTS board_id uuid REFERENCES public.seguimiento_boards(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS column_id uuid REFERENCES public.seguimiento_columns(id) ON DELETE SET NULL;

-- Habilitar RLS
ALTER TABLE public.seguimiento_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seguimiento_columns ENABLE ROW LEVEL SECURITY;

-- Políticas para Tableros (Compartidos con el equipo)
CREATE POLICY "Everyone can view boards" ON public.seguimiento_boards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create boards" ON public.seguimiento_boards FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owners can update boards" ON public.seguimiento_boards FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Owners can delete boards" ON public.seguimiento_boards FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Políticas para Columnas
CREATE POLICY "Everyone can view columns" ON public.seguimiento_columns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Everyone can manage columns" ON public.seguimiento_columns FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Actualizar política de Seguimientos para que si están en un tablero, todos los vean
DROP POLICY IF EXISTS "Users view own seguimientos" ON public.seguimientos;
CREATE POLICY "Users view own or board seguimientos" ON public.seguimientos
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR board_id IS NOT NULL);

-- Permitir actualización si es el dueño o si está en un tablero (para que el equipo colabore)
DROP POLICY IF EXISTS "Users update own seguimientos" ON public.seguimientos;
CREATE POLICY "Users update own or board seguimientos" ON public.seguimientos
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR board_id IS NOT NULL);

-- Triggers para updated_at
CREATE TRIGGER set_seguimiento_boards_updated_at
  BEFORE UPDATE ON public.seguimiento_boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
