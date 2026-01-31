
-- 1. Create Buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('hall-images', 'hall-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies for Hall Images
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'hall-images' );

CREATE POLICY "Vendors can upload hall images" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'hall-images' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Vendors can delete own hall images" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'hall-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Storage Policies for Service Images
CREATE POLICY "Public Service Images" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'service-images' );

CREATE POLICY "Vendors can upload service images" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'service-images' AND 
  auth.role() = 'authenticated'
);
