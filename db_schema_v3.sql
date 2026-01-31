
-- 1. Branding & Contact Columns for Vendors
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#8a2be2',
ADD COLUMN IF NOT EXISTS custom_logo_url TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS business_email TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;

-- 2. Enhance Notifications with Action Links
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS action_url TEXT;

-- 3. Create Storage for Logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vendor-logos', 'vendor-logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for Logos
CREATE POLICY "Public Access Logos" ON storage.objects FOR SELECT USING (bucket_id = 'vendor-logos');
CREATE POLICY "Vendors manage own logos" ON storage.objects FOR ALL USING (bucket_id = 'vendor-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
