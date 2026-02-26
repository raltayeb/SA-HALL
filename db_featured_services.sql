-- Create Featured Services Table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.featured_services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_featured_services_service ON public.featured_services(service_id);
CREATE INDEX IF NOT EXISTS idx_featured_services_created ON public.featured_services(created_at);

-- Enable RLS
ALTER TABLE public.featured_services ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "super_admins_all_access_featured_services" ON public.featured_services;
DROP POLICY IF EXISTS "everyone_view_featured_services" ON public.featured_services;

-- Super admins can do anything
CREATE POLICY "super_admins_all_access_featured_services" ON public.featured_services
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Everyone can view featured services
CREATE POLICY "everyone_view_featured_services" ON public.featured_services
FOR SELECT
USING (true);

-- Comment
COMMENT ON TABLE public.featured_services IS 'Featured services displayed on homepage';
