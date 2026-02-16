
-- 1. Ensure bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vendor-logos', 'vendor-logos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Clean up potentially conflicting restrictive policies
-- Note: We are keeping "Vendors manage own logos" but adding a new one for Admins
DROP POLICY IF EXISTS "Admins can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete logos" ON storage.objects;

-- 3. Create Policy for Super Admins (INSERT)
-- Allows inserting any file into 'vendor-logos' if the user is a super_admin
CREATE POLICY "Admins can upload logos" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'vendor-logos' 
  AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- 4. Create Policy for Super Admins (UPDATE)
CREATE POLICY "Admins can update logos" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'vendor-logos' 
  AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- 5. Create Policy for Super Admins (DELETE)
CREATE POLICY "Admins can delete logos" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'vendor-logos' 
  AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- 6. Ensure public read access (if not already set)
DROP POLICY IF EXISTS "Public Access Logos" ON storage.objects;
CREATE POLICY "Public Access Logos" ON storage.objects
FOR SELECT
USING (bucket_id = 'vendor-logos');
