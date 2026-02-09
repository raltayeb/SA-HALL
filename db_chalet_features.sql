
-- إضافة عمود السياسات والشروط للقاعات/الشاليهات
ALTER TABLE public.halls 
ADD COLUMN IF NOT EXISTS policies TEXT;

-- إضافة تاريخ المغادرة للحجوزات لدعم المبيت لعدة أيام
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS check_out_date DATE;

-- إضافة تفاصيل الضيوف (بالغين وأطفال)
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS guests_adults INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS guests_children INTEGER DEFAULT 0;
