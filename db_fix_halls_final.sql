-- FIX HALLS TABLE - Complete Schema and Policies
-- Run this in Supabase SQL Editor

-- 1. ADD updated_at COLUMN (if not exists)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'halls' 
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.halls ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 2. CREATE TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. APPLY TRIGGER TO halls TABLE
DROP TRIGGER IF EXISTS update_halls_updated_at ON public.halls;
CREATE TRIGGER update_halls_updated_at
  BEFORE UPDATE ON public.halls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. DROP OLD POLICIES
DROP POLICY IF EXISTS "super_admins_all_access" ON public.halls;
DROP POLICY IF EXISTS "vendors_update_own_halls" ON public.halls;
DROP POLICY IF EXISTS "vendors_insert_own_halls" ON public.halls;
DROP POLICY IF EXISTS "everyone_view_active_halls" ON public.halls;
DROP POLICY IF EXISTS "vendors_view_own_halls" ON public.halls;

-- 5. CREATE NEW RLS POLICIES

-- Enable RLS
ALTER TABLE public.halls ENABLE ROW LEVEL SECURITY;

-- Super admins can do anything with any hall
CREATE POLICY "super_admins_all_access" ON public.halls
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Vendors can update their own halls
CREATE POLICY "vendors_update_own_halls" ON public.halls
FOR UPDATE
USING (
  auth.uid() = vendor_id
);

-- Vendors can insert their own halls
CREATE POLICY "vendors_insert_own_halls" ON public.halls
FOR INSERT
WITH CHECK (
  auth.uid() = vendor_id
);

-- Everyone can view active halls
CREATE POLICY "everyone_view_active_halls" ON public.halls
FOR SELECT
USING (is_active = true);

-- Vendors can view their own halls (even inactive)
CREATE POLICY "vendors_view_own_halls" ON public.halls
FOR SELECT
USING (
  auth.uid() = vendor_id OR is_active = true
);

-- 6. ENABLE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.halls;
