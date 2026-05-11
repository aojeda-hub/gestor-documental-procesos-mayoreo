ALTER TABLE public.project_tasks ADD COLUMN IF NOT EXISTS progress_percent integer NOT NULL DEFAULT 0 CHECK (progress_percent IN (0,25,50,75,100));

UPDATE public.project_tasks SET progress_percent = 100 WHERE status = 'Completada';