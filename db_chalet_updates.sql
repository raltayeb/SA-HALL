
-- 1. تحديث جدول القاعات لدعم التسعير حسب الأفراد
ALTER TABLE public.halls 
ADD COLUMN IF NOT EXISTS price_per_adult DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_per_child DECIMAL(10, 2) DEFAULT 0;

-- 2. تحديث جدول الملفات الشخصية لدعم مميزات البائع الخاصة
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS vendor_amenities JSONB DEFAULT '[]'::jsonb;

-- 3. تحديث جدول الحجوزات لربط الضيف ببيانات الدخول
-- (تمت إضافتها سابقاً ولكن للتأكيد: guest_email, guest_phone)
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS guest_email TEXT;

-- 4. سياسات الأمان
-- السماح للضيوف بقراءة حجوزاتهم بناءً على البريد أو الهاتف (لصفحة الدخول)
CREATE INDEX IF NOT EXISTS idx_bookings_guest_email ON public.bookings(guest_email);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_phone ON public.bookings(guest_phone);
