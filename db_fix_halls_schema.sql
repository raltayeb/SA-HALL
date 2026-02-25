-- =====================================================
-- Add missing columns to halls table
-- =====================================================

-- Add updated_at column if it doesn't exist
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

-- Add trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_halls_updated_at ON public.halls;
CREATE TRIGGER update_halls_updated_at
  BEFORE UPDATE ON public.halls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Fix RLS Policies for Halls
-- =====================================================

DROP POLICY IF EXISTS "Super admin can do anything" ON public.halls;
DROP POLICY IF EXISTS "Vendors can update their own halls" ON public.halls;
DROP POLICY IF EXISTS "Vendors can insert halls" ON public.halls;
DROP POLICY IF EXISTS "Everyone can view active halls" ON public.halls;
DROP POLICY IF EXISTS "Vendors can view their own halls" ON public.halls;
DROP POLICY IF EXISTS "Auth users can update halls" ON public.halls;

-- Super admins can do anything
CREATE POLICY "Super admin can do anything" ON public.halls
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Vendors can update their own halls
CREATE POLICY "Vendors can update their own halls" ON public.halls
FOR UPDATE
USING (
  auth.uid() = vendor_id
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Vendors can insert halls
CREATE POLICY "Vendors can insert halls" ON public.halls
FOR INSERT
WITH CHECK (
  auth.uid() = vendor_id
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Everyone can view active halls
CREATE POLICY "Everyone can view active halls" ON public.halls
FOR SELECT
USING (is_active = true);

-- Vendors can view their own halls (even inactive)
CREATE POLICY "Vendors can view their own halls" ON public.halls
FOR SELECT
USING (
  auth.uid() = vendor_id 
  OR is_active = true
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.halls;
