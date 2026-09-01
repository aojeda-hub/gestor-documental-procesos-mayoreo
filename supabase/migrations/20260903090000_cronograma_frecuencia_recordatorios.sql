-- Dias de anticipacion para el recordatorio de las actividades de un proceso
-- (el "tipo" que diferencia el recordatorio es el proceso al que pertenece la
-- actividad, no se agrega un campo de tipo nuevo).
ALTER TABLE public.cronograma_procesos ADD COLUMN IF NOT EXISTS dias_recordatorio integer NOT NULL DEFAULT 7;

-- Guarda para que ciclo (formato 'YYYY-MM' del mes programado mas proximo) ya
-- se genero la notificacion de recordatorio, para no duplicarla cada vez que
-- alguien abre el cronograma.
ALTER TABLE public.cronograma_actividades ADD COLUMN IF NOT EXISTS recordatorio_para text;
