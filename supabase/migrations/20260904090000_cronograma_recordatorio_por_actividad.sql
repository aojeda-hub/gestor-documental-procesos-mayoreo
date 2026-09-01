-- El recordatorio se configura por actividad (no por proceso): cada
-- actividad define sus propios dias de anticipacion y con que frecuencia se
-- repite el aviso mientras dura la ventana de anticipacion.
ALTER TABLE public.cronograma_procesos DROP COLUMN IF EXISTS dias_recordatorio;

ALTER TABLE public.cronograma_actividades ADD COLUMN IF NOT EXISTS dias_recordatorio integer NOT NULL DEFAULT 7;
ALTER TABLE public.cronograma_actividades ADD COLUMN IF NOT EXISTS frecuencia_recordatorio text NOT NULL DEFAULT 'una_vez'
  CHECK (frecuencia_recordatorio IN ('una_vez', 'diario', 'semanal'));
ALTER TABLE public.cronograma_actividades ADD COLUMN IF NOT EXISTS recordatorio_ultimo_envio timestamptz;

-- recordatorio_para ("YYYY-MM") ahora identifica el ciclo/ocurrencia que se
-- esta recordando; recordatorio_ultimo_envio guarda cuando fue el ultimo
-- aviso dentro de ese ciclo, para poder repetir segun la frecuencia elegida.
