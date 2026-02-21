-- ============================================
-- إصلاح: السماح للأدمن بتحديث القاعات المميزة
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. أضف سياسة تسمح للسوبر أدمن بتحديث أي قاعة
DROP POLICY IF EXISTS "Super admin can update any hall" ON halls;

CREATE POLICY "Super admin can update any hall" ON halls
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = uid() 
      AND profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = uid() 
      AND profiles.role = 'super_admin'
    )
  );

-- 2. تأكد من أن السياسات الموجودة لا تتعارض
-- اعرض جميع السياسات لـ halls
SELECT 
  policyname,
  cmd,
  roles,
  qual IS NOT NULL as has_qual,
  with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE tablename = 'halls'
ORDER BY cmd, policyname;

-- 3. اختبر التحديث كـ super_admin
-- استبدل YOUR_HALL_ID بـ ID قاعة حقيقية
/*
UPDATE halls 
SET is_featured = true, featured_until = NOW() + INTERVAL '30 days'
WHERE id = 'YOUR_HALL_ID';
*/

-- 4. تأكد من أن التحديث نجح
SELECT 
  name,
  is_featured,
  featured_until
FROM halls
WHERE is_featured = true;

-- 5. أضف سياسة قراءة عامة (مهمة جداً)
DROP POLICY IF EXISTS "Featured halls public read" ON halls;

CREATE POLICY "Featured halls public read" ON halls
  FOR SELECT
  TO public
  USING (
    is_featured = true 
    AND is_active = true 
    AND featured_until > NOW()
  );

-- 6. سياسة القراءة لـ featured_halls
DROP POLICY IF EXISTS "Featured halls list public read" ON featured_halls;

CREATE POLICY "Featured halls list public read" ON featured_halls
  FOR SELECT
  TO public
  USING (is_active = true);

-- 7. اختبار نهائي
SELECT 
  h.id,
  h.name,
  h.is_featured,
  h.featured_until,
  fh.id as fh_id,
  fh.end_date,
  fh.is_active
FROM halls h
LEFT JOIN featured_halls fh ON h.id = fh.hall_id
WHERE h.is_featured = true OR fh.is_active = true;
