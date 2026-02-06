
-- إضافة نوع الحجز (حجز عادي أو استشارة) وتفاصيل المنتجات الإضافية
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS booking_type TEXT CHECK (booking_type IN ('booking', 'consultation')) DEFAULT 'booking',
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb; -- لتخزين المنتجات والخدمات الإضافية

-- إضافة العنوان للقاعات
ALTER TABLE public.halls 
ADD COLUMN IF NOT EXISTS address TEXT;
