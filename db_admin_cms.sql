
-- 1. Create Content Pages Table
CREATE TABLE IF NOT EXISTS public.content_pages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL, -- e.g., 'about-us', 'terms', 'privacy'
  title TEXT NOT NULL,
  content TEXT,
  is_published BOOLEAN DEFAULT true,
  last_updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert Default Pages
INSERT INTO public.content_pages (slug, title, content) VALUES
('about-us', 'من نحن', 'نحن منصة رائدة في مجال حجز القاعات...'),
('terms', 'الشروط والأحكام', 'يجب الالتزام بالقوانين التالية...'),
('privacy', 'سياسة الخصوصية', 'نحن نحترم خصوصيتك وبياناتك...'),
('hero-title', 'عنوان الصفحة الرئيسية', 'اكتشف قاعة أحلامك المثالية'),
('hero-subtitle', 'وصف الصفحة الرئيسية', 'سواء كنت تبحث عن ملاذ هادئ أو قاعة زفاف فسيحة، نحن هنا لإرشادك.')
ON CONFLICT (slug) DO NOTHING;

-- 3. RLS Policies for Content
ALTER TABLE public.content_pages ENABLE ROW LEVEL SECURITY;

-- Public read access
DROP POLICY IF EXISTS "Public can view published pages" ON public.content_pages;
CREATE POLICY "Public can view published pages" ON public.content_pages FOR SELECT USING (is_published = true);

-- Admin write access
DROP POLICY IF EXISTS "Admins can manage pages" ON public.content_pages;
CREATE POLICY "Admins can manage pages" ON public.content_pages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
