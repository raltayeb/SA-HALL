-- ============================================
-- إضافة قاعة مميزة للتجربة
-- Run this in Supabase SQL Editor
-- ============================================

-- الخطوة 1: اعرض القاعات المتاحة
SELECT id, name, city, is_active FROM halls WHERE is_active = true;

-- الخطوة 2: انسخ ID من القاعة اللي تريد
-- مثال: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'

-- الخطوة 3: اجعل القاعة مميزة (استبدل YOUR_HALL_ID بالـ ID الفعلي)
UPDATE halls 
SET 
  is_featured = true,
  featured_until = NOW() + INTERVAL '30 days'
WHERE id = 'YOUR_HALL_ID'; -- ← ضع ID القاعة هنا

-- الخطوة 4: أضف سجل في جدول featured_halls
INSERT INTO featured_halls (hall_id, vendor_id, end_date, created_by, is_active)
SELECT 
  id,
  vendor_id,
  NOW() + INTERVAL '30 days',
  vendor_id,
  true
FROM halls
WHERE id = 'YOUR_HALL_ID'; -- ← ضع ID القاعة هنا

-- الخطوة 5: تأكد من الإضافة
SELECT 
  h.name,
  h.is_featured,
  h.featured_until,
  fh.end_date,
  fh.is_active
FROM halls h
LEFT JOIN featured_halls fh ON h.id = fh.hall_id
WHERE h.is_featured = true;

-- الخطوة 6: اختبر الصفحة الرئيسية
SELECT 
  id,
  name,
  city,
  image_url,
  price_per_night,
  is_featured,
  featured_until
FROM halls
WHERE is_active = true
  AND is_featured = true
  AND featured_until > NOW()
LIMIT 3;
