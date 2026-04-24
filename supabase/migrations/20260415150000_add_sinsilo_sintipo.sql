-- Add sinsilo to silo_type enum
ALTER TYPE public.silo_type ADD VALUE IF NOT EXISTS 'sinsilo';

-- Add sintipo to doc_type enum
ALTER TYPE public.doc_type ADD VALUE IF NOT EXISTS 'sintipo';
