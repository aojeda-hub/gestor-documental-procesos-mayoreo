-- Create empresa enum
CREATE TYPE public.empresa_type AS ENUM ('mayoreo', 'beconsult', 'epa');

-- Add empresa column to documents with default 'mayoreo' (all existing docs go to Mayoreo)
ALTER TABLE public.documents ADD COLUMN empresa public.empresa_type NOT NULL DEFAULT 'mayoreo';