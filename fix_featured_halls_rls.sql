-- ============================================
-- إصلاح: السماح بقراءة القاعات المميزة للجميع
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. تأكد من أن هناك قاعات مميزة في قاعدة البيانات
SELECT 
  h.id,
  h.name,
  h.is_featured,
  h.featured_until,
  h.is_active,
  fh.id as fh_id,
  fh.end_date,
  fh.is_active as fh_active
FROM halls h
LEFT JOIN featured_halls fh ON h.id = fh.hall_id
WHERE h.is_featured = true OR fh.is_active = true;

-- 2. إذا لم تظهر نتائج، أضف قاعة مميزة للتجربة
-- أولاً اعرض القاعات المتاحة
SELECT id, name, vendor_id FROM halls WHERE is_active = true LIMIT 1;

-- 3. استبدل YOUR_HALL_ID بالـ ID من الخطوة السابقة
-- ثم شغّل هذا الكود:
/*
-- تحديث القاعة
UPDATE halls 
SET is_featured = true, 
    featured_until = NOW() + INTERVAL '30 days'
WHERE id = 'YOUR_HALL_ID';

-- إضافة سجل في featured_halls
INSERT INTO featured_halls (hall_id, vendor_id, end_date, is_active, created_by)
SELECT 
  id, 
  vendor_id, 
  NOW() + INTERVAL '30 days', 
  true,
  vendor_id
FROM halls 
WHERE id = 'YOUR_HALL_ID';
*/

-- 4. أصلح RLS Policies - السماح للجميع بقراءة القاعات المميزة
DROP POLICY IF EXISTS "Anyone can view featured halls" ON halls;

CREATE POLICY "Anyone can view featured halls" ON halls
  FOR SELECT
  USING (
    is_featured = true 
    AND is_active = true 
    AND featured_until > NOW()
  );

-- 5. تأكد من أن السياسات الأخرى لا تمنع القراءة
DROP POLICY IF EXISTS "Super admin manage featured halls" ON featured_halls;

CREATE POLICY "Super admin manage featured halls" ON featured_halls
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. أضف سياسة قراءة عامة لـ featured_halls
DROP POLICY IF EXISTS "Anyone can view featured halls list" ON featured_halls;

CREATE POLICY "Anyone can view featured halls list" ON featured_halls
  FOR SELECT
  USING (is_active = true);

-- 7. اختبر الاستعلام
SELECT 
  h.id,
  h.name,
  h.city,
  h.image_url,
  h.price_per_night,
  h.is_featured,
  h.featured_until
FROM halls h
WHERE h.is_active = true
  AND h.is_featured = true
  AND h.featured_until > NOW()
LIMIT 3;

-- 8. تأكد من عدد القاعات المميزة
SELECT COUNT(*) as featured_count
FROM halls
WHERE is_active = true
  AND is_featured = true
  AND featured_until > NOW();
