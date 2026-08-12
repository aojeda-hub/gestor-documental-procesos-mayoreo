-- ============================================================
-- Migration: Add schedule baseline fields (planned vs actual tracking)
-- ============================================================

ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS baseline_start_date DATE,
  ADD COLUMN IF NOT EXISTS baseline_end_date DATE;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS baseline_captured_at TIMESTAMP WITH TIME ZONE;
