-- Update featured_halls table to support date ranges
-- Run this in Supabase SQL Editor

-- 1. Add start_date and end_date columns
DO $$ 
BEGIN 
  -- Add start_date if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'featured_halls' 
      AND column_name = 'start_date'
  ) THEN
    ALTER TABLE public.featured_halls ADD COLUMN start_date TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  -- Add end_date if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'featured_halls' 
      AND column_name = 'end_date'
  ) THEN
    ALTER TABLE public.featured_halls ADD COLUMN end_date TIMESTAMPTZ;
  END IF;
END $$;

-- 2. Drop NOT NULL constraint from end_date (make it optional)
ALTER TABLE public.featured_halls ALTER COLUMN end_date DROP NOT NULL;

-- 3. Drop old policies
DROP POLICY IF EXISTS "super_admins_all_access_featured" ON public.featured_halls;
DROP POLICY IF EXISTS "everyone_view_featured" ON public.featured_halls;

-- 4. Create new policies
ALTER TABLE public.featured_halls ENABLE ROW LEVEL SECURITY;

-- Super admins can do anything
CREATE POLICY "super_admins_all_access_featured" ON public.featured_halls
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Everyone can view currently active featured halls
CREATE POLICY "everyone_view_featured" ON public.featured_halls
FOR SELECT
USING (
  (end_date IS NULL OR end_date > NOW())
);

-- 5. Create index for performance
CREATE INDEX IF NOT EXISTS idx_featured_halls_dates ON public.featured_halls(start_date, end_date);

-- 6. Add comment
COMMENT ON TABLE public.featured_halls IS 'Featured halls with optional date ranges';
COMMENT ON COLUMN public.featured_halls.start_date IS 'When the hall becomes featured (default: now)';
COMMENT ON COLUMN public.featured_halls.end_date IS 'When the hall stops being featured (NULL = indefinite)';
