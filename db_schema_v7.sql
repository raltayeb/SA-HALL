
-- إضافة عمود لتخزين المعرفات المستهدفة للكوبون (قاعات، خدمات، منتجات)
ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS target_ids JSONB DEFAULT '[]'::jsonb;

-- إضافة تفاصيل الكوبون في جدول الحجوزات لتوثيق الخصم في الفاتورة
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS applied_coupon TEXT,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0;
