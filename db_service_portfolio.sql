
-- إضافة عمود الصور لجدول الخدمات لدعم معرض الأعمال (Portfolio)
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
