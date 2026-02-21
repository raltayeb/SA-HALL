-- ============================================
-- Quick Test: Add Featured Hall
-- Run this to test featured halls on homepage
-- ============================================

-- 1. Find an active hall
SELECT id, name, city FROM halls WHERE is_active = true LIMIT 5;

-- 2. Copy one hall ID and replace YOUR_HALL_ID below
-- Example: '123e4567-e89b-12d3-a456-426614174000'

-- 3. Make it featured for 30 days
UPDATE halls 
SET is_featured = true, 
    featured_until = NOW() + INTERVAL '30 days'
WHERE id = 'YOUR_HALL_ID'; -- ← Replace this!

-- 4. Create featured_halls record
INSERT INTO featured_halls (hall_id, vendor_id, end_date, created_by)
SELECT 
  id, 
  vendor_id, 
  NOW() + INTERVAL '30 days',
  vendor_id
FROM halls 
WHERE id = 'YOUR_HALL_ID'; -- ← Replace this!

-- 5. Verify
SELECT h.name, h.is_featured, h.featured_until, fh.end_date
FROM halls h
LEFT JOIN featured_halls fh ON h.id = fh.hall_id
WHERE h.is_featured = true;

-- 6. Check homepage query
SELECT * FROM halls 
WHERE is_active = true 
AND is_featured = true 
AND featured_until > NOW() 
LIMIT 3;
