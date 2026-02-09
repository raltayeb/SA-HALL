
-- إصلاح النقص في أعمدة جدول القاعات
ALTER TABLE public.halls 
ADD COLUMN IF NOT EXISTS capacity_men INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS capacity_women INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS name_en TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT;

-- تحديث السعة الإجمالية تلقائياً إذا كانت 0 (اختياري للصيانة)
UPDATE public.halls 
SET capacity = COALESCE(capacity_men, 0) + COALESCE(capacity_women, 0)
WHERE capacity = 0 AND (capacity_men > 0 OR capacity_women > 0);
