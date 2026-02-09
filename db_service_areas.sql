
-- Add service_areas column to services table to store cities/regions
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS service_areas JSONB DEFAULT '[]'::jsonb;
