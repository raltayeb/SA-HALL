
-- 1. Fix System Settings RLS
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow PUBLIC read access (so the app can load theme/logo before login)
DROP POLICY IF EXISTS "Public can view system settings" ON public.system_settings;
CREATE POLICY "Public can view system settings" ON public.system_settings
FOR SELECT USING (true);

-- Allow SUPER ADMINS to insert/update settings
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
CREATE POLICY "Admins can manage system settings" ON public.system_settings
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- 2. Fix Storage RLS for 'vendor-logos' (used for Admin Logo too)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vendor-logos', 'vendor-logos', true) 
ON CONFLICT (id) DO NOTHING;

-- Admin Upload Policy
DROP POLICY IF EXISTS "Admins can upload logos" ON storage.objects;
CREATE POLICY "Admins can upload logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'vendor-logos' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Admin Update Policy
DROP POLICY IF EXISTS "Admins can update logos" ON storage.objects;
CREATE POLICY "Admins can update logos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'vendor-logos' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Admin Delete Policy
DROP POLICY IF EXISTS "Admins can delete logos" ON storage.objects;
CREATE POLICY "Admins can delete logos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'vendor-logos' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Public Read Policy
DROP POLICY IF EXISTS "Public Access Logos" ON storage.objects;
CREATE POLICY "Public Access Logos" ON storage.objects
FOR SELECT USING (bucket_id = 'vendor-logos');
