
-- Add paid_amount to track deposits
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10, 2) DEFAULT 0;

-- Ensure time columns exist (if missed in previous updates)
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME;
