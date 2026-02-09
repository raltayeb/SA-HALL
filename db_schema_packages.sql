
-- 1. Add packages column to Halls
ALTER TABLE public.halls 
ADD COLUMN IF NOT EXISTS packages JSONB DEFAULT '[]'::jsonb;

-- 2. Add booking method and package tracking to Bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS booking_method TEXT CHECK (booking_method IN ('full', 'deposit', 'hold')),
ADD COLUMN IF NOT EXISTS package_name TEXT;

-- 3. Add status 'on_hold' to booking status enum check (if using check constraint)
-- Note: Modifying a check constraint in Postgres usually requires dropping and recreating it.
-- This block attempts to add it safely.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_status_check') THEN
    ALTER TABLE public.bookings DROP CONSTRAINT bookings_status_check;
  END IF;
  
  ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'on_hold'));
END $$;
