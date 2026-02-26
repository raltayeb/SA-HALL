-- إصلاح قيم payment_status الخاطئة في جدول bookings
-- التاريخ: 26 فبراير 2026

-- 1. تحديث أي سجلات تستخدم 'pending' إلى 'unpaid'
UPDATE bookings 
SET payment_status = 'unpaid' 
WHERE payment_status = 'pending';

-- 2. تحديث أي سجلات تستخدم 'failed' إلى 'unpaid'
UPDATE bookings 
SET payment_status = 'unpaid' 
WHERE payment_status = 'failed';

-- 3. التحقق من القيم الصحيحة
SELECT payment_status, COUNT(*) as count
FROM bookings
GROUP BY payment_status;

-- 4. عرض السجلات التي تم تحديثها (للتأكد)
SELECT id, booking_date, guest_name, payment_status, total_amount
FROM bookings
WHERE payment_status IN ('unpaid', 'paid', 'partial')
ORDER BY created_at DESC
LIMIT 20;
