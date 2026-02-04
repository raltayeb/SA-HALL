
-- 1. Add Booking Timing & Payment Details
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME,
ADD COLUMN IF NOT EXISTS payment_status TEXT CHECK (payment_status IN ('paid', 'partial', 'unpaid')) DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS package_name TEXT; -- Optional: To store specific package name if different from Hall name

-- 2. Update RLS to ensure vendors can update these new columns
-- (Existing policies usually cover 'UPDATE' on the whole row, but good to verify)
