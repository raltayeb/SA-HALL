
-- SA Hall Cumulative Database Update V5
-- يشمل كافة التعديلات المطلوبة لدعم تعدد البائعين، المفضلة، التقييمات، والفوترة.

-- 0. تفعيل UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. تحديث جدول الملفات الشخصية
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT;

-- 2. تحديث جدول القاعات
ALTER TABLE public.halls 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- 3. جدول المفضلة
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  hall_id UUID REFERENCES public.halls(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, hall_id)
);

-- 4. جدول المراجعات
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hall_id UUID REFERENCES public.halls(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. تحديث جدول الحجوزات
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 6. تفعيل الحماية (RLS)
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 7. السياسات الأمنية للمفضلة
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Manage own favorites') THEN
        CREATE POLICY "Manage own favorites" ON public.user_favorites FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'View own favorites') THEN
        CREATE POLICY "View own favorites" ON public.user_favorites FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

-- 8. السياسات الأمنية للمراجعات
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Reviews are public') THEN
        CREATE POLICY "Reviews are public" ON public.reviews FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can review') THEN
        CREATE POLICY "Users can review" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- 9. فهرسة البيانات للسرعة
CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_hall ON public.reviews(hall_id);

-- 10. ترقية جميع المستخدمين الحاليين لمديرين (لأغراض التطوير فقط)
UPDATE public.profiles SET role = 'super_admin' WHERE role IS NULL OR role = 'user';
