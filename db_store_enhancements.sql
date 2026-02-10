
-- 1. Create Store Categories Table (Managed by Super Admin)
CREATE TABLE IF NOT EXISTS public.store_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert Default Store Categories
INSERT INTO public.store_categories (name) VALUES 
('تجهيزات ومعدات'), 
('ضيافة ومشروبات'), 
('زينة وديكور'), 
('هدايا وتوزيعات'), 
('إضاءة وصوتيات')
ON CONFLICT (name) DO NOTHING;

-- 3. Add 'is_featured' to POS Items for the Carousel
ALTER TABLE public.pos_items 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- 4. RLS Policies
ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;

-- Public Read
CREATE POLICY "Public Read Store Categories" ON public.store_categories FOR SELECT USING (true);

-- Admin Manage
CREATE POLICY "Admin Manage Store Categories" ON public.store_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
