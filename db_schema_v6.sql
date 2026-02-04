
-- Add Guest Details Columns to Bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS guest_name TEXT,
ADD COLUMN IF NOT EXISTS guest_phone TEXT;
