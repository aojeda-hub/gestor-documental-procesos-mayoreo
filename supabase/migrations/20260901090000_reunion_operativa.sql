-- Distinguir el tablero especial de Reunion Operativa de los personalizados normales.
ALTER TABLE public.seguimiento_boards ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'personalizado';

-- Rondas de reunion (cada "Nueva Reunion" crea una fila).
CREATE TABLE public.reunion_operativa_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.seguimiento_boards(id) ON DELETE CASCADE,
  numero integer NOT NULL,
  titulo text NOT NULL,
  fecha date NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reunion_operativa_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View meetings (board access)" ON public.reunion_operativa_meetings FOR SELECT TO authenticated
  USING (public.is_board_member(board_id, auth.uid()));
CREATE POLICY "Manage meetings (board access)" ON public.reunion_operativa_meetings FOR ALL TO authenticated
  USING (public.is_board_member(board_id, auth.uid())) WITH CHECK (public.is_board_member(board_id, auth.uid()));

-- A que reunion pertenece cada punto (nullable: no afecta tableros normales).
ALTER TABLE public.seguimientos ADD COLUMN IF NOT EXISTS reunion_id uuid REFERENCES public.reunion_operativa_meetings(id) ON DELETE SET NULL;

-- Cronograma anual de procesos (persiste entre reuniones, no se resetea).
CREATE TABLE public.cronograma_procesos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.seguimiento_boards(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cronograma_procesos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View procesos (board access)" ON public.cronograma_procesos FOR SELECT TO authenticated
  USING (public.is_board_member(board_id, auth.uid()));
CREATE POLICY "Manage procesos (board access)" ON public.cronograma_procesos FOR ALL TO authenticated
  USING (public.is_board_member(board_id, auth.uid())) WITH CHECK (public.is_board_member(board_id, auth.uid()));

CREATE TABLE public.cronograma_actividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id uuid NOT NULL REFERENCES public.cronograma_procesos(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  meses smallint[] NOT NULL DEFAULT '{}',
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','en_progreso','completado')),
  responsable_user_id uuid,
  seguimiento_id uuid REFERENCES public.seguimientos(id) ON DELETE SET NULL,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cronograma_actividades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View actividades (board access)" ON public.cronograma_actividades FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cronograma_procesos p WHERE p.id = proceso_id AND public.is_board_member(p.board_id, auth.uid())));
CREATE POLICY "Manage actividades (board access)" ON public.cronograma_actividades FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cronograma_procesos p WHERE p.id = proceso_id AND public.is_board_member(p.board_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cronograma_procesos p WHERE p.id = proceso_id AND public.is_board_member(p.board_id, auth.uid())));

-- Historial de cambios del cronograma (solo lectura/insercion, sin update/delete).
CREATE TABLE public.cronograma_historial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actividad_id uuid NOT NULL REFERENCES public.cronograma_actividades(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  campo text NOT NULL,
  valor_anterior text,
  valor_nuevo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cronograma_historial ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View historial (board access)" ON public.cronograma_historial FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cronograma_actividades a JOIN public.cronograma_procesos p ON p.id = a.proceso_id WHERE a.id = actividad_id AND public.is_board_member(p.board_id, auth.uid())));
CREATE POLICY "Insert historial (board access)" ON public.cronograma_historial FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.cronograma_actividades a JOIN public.cronograma_procesos p ON p.id = a.proceso_id WHERE a.id = actividad_id AND public.is_board_member(p.board_id, auth.uid())));
