-- ============================================
-- اختبار: التحقق من القاعات المميزة
-- Run this to debug featured halls issues
-- ============================================

-- 1. تأكد من أن جدول featured_halls موجود
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'featured_halls';

-- 2. اعرض جميع القاعات المميزة
SELECT 
  fh.id,
  fh.hall_id,
  fh.end_date,
  fh.is_active,
  h.name as hall_name,
  h.is_featured,
  h.featured_until,
  h.is_active as hall_is_active
FROM featured_halls fh
LEFT JOIN halls h ON h.id = fh.hall_id
ORDER BY fh.created_at DESC;

-- 3. اعرض القاعات التي يجب أن تظهر في الصفحة الرئيسية
SELECT 
  id,
  name,
  city,
  image_url,
  price_per_night,
  is_featured,
  featured_until,
  is_active
FROM halls
WHERE is_active = true
  AND is_featured = true
  AND featured_until > NOW()
LIMIT 3;

-- 4. تحقق من التواريخ
SELECT 
  NOW() as current_time,
  featured_until,
  (featured_until > NOW()) as is_not_expired
FROM halls
WHERE is_featured = true;

-- 5. إذا لم تكن هناك قاعات، أضف واحدة للتجربة
-- أولاً اعرف ID قاعة موجودة
SELECT id, name, is_active FROM halls WHERE is_active = true LIMIT 1;

-- 6. تحديث قاعة لتكون مميزة (استبدل YOUR_ID بالـ ID الفعلي)
-- ملاحظة: لا تشغل هذا إلا بعد استبدال YOUR_ID
/*
UPDATE halls 
SET is_featured = true, 
    featured_until = NOW() + INTERVAL '30 days'
WHERE id = 'YOUR_ID';

INSERT INTO featured_halls (hall_id, vendor_id, end_date, is_active)
SELECT id, vendor_id, NOW() + INTERVAL '30 days', true
FROM halls
WHERE id = 'YOUR_ID';
*/

-- 7. تأكد من أن RLS لا يمنع البيانات
-- شغل هذا كـ super_admin أو anon
SELECT COUNT(*) as total_featured
FROM halls
WHERE is_active = true
  AND is_featured = true
  AND featured_until > NOW();
