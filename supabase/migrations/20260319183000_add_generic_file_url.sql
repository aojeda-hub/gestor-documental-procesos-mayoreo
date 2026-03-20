-- Add url_file to document_versions to support generic formats (JPG, PNG, PPTX, etc.)
ALTER TABLE public.document_versions ADD COLUMN url_file TEXT;
