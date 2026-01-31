
-- 1. Branding & Contact Columns for Vendors
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#8a2be2',
ADD COLUMN IF NOT EXISTS custom_logo_url TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS business_email TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;

-- 2. Fix Bookings Table (Ensuring service_id exists)
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id) ON DELETE SET NULL;

-- 3. Reconcile Notifications (Ensure action_url exists)
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS action_url TEXT;

-- 4. Create Storage for Logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vendor-logos', 'vendor-logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for Logos
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Logos') THEN
        CREATE POLICY "Public Access Logos" ON storage.objects FOR SELECT USING (bucket_id = 'vendor-logos');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Vendors manage own logos') THEN
        CREATE POLICY "Vendors manage own logos" ON storage.objects FOR ALL USING (bucket_id = 'vendor-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
    END IF;
END $$;
