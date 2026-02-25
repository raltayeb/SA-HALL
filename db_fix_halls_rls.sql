-- =====================================================
-- Fix RLS Policies for Halls Table
-- This allows super admins to update any hall
-- =====================================================

-- Drop existing policies that might be blocking updates
DROP POLICY IF EXISTS "Super admin can update any hall" ON public.halls;
DROP POLICY IF EXISTS "Admins can update halls" ON public.halls;
DROP POLICY IF EXISTS "Vendors can update their own halls" ON public.halls;
DROP POLICY IF EXISTS "Users can view active halls" ON public.halls;

-- Create new policies

-- 1. Super admins can do anything with halls
CREATE POLICY "Super admin can do anything" ON public.halls
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- 2. Vendors can update their own halls
CREATE POLICY "Vendors can update their own halls" ON public.halls
FOR UPDATE
USING (
  auth.uid() = vendor_id
);

-- 3. Vendors can insert halls
CREATE POLICY "Vendors can insert halls" ON public.halls
FOR INSERT
WITH CHECK (
  auth.uid() = vendor_id
);

-- 4. Everyone can view active halls
CREATE POLICY "Everyone can view active halls" ON public.halls
FOR SELECT
USING (is_active = true);

-- 5. Vendors can view their own halls (even inactive)
CREATE POLICY "Vendors can view their own halls" ON public.halls
FOR SELECT
USING (
  auth.uid() = vendor_id OR is_active = true
);

-- =====================================================
-- Enable Realtime for halls
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.halls;

-- =====================================================
-- Verify policies
-- =====================================================

-- Run this to check if policies were created:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = 'halls';
