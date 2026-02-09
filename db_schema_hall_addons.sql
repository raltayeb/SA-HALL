
-- Ensure addons column exists in halls table
ALTER TABLE public.halls 
ADD COLUMN IF NOT EXISTS addons JSONB DEFAULT '[]'::jsonb;
