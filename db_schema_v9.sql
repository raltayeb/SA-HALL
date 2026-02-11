
-- 1. Update Halls Table for Advanced Features
ALTER TABLE public.halls 
ADD COLUMN IF NOT EXISTS seasonal_prices JSONB DEFAULT '[]'::jsonb, -- [{ name, start_date, end_date, increase_percentage }]
ADD COLUMN IF NOT EXISTS policies TEXT; -- Terms & Conditions

-- 2. Update System Settings for Booking Rules
-- We assume the JSON structure in system_settings -> value -> booking_config
-- { deposit_fixed: 500, deposit_percent: 10, hold_price: 200, consultation_price: 150 }

-- 3. Update Bookings Table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS booking_option TEXT CHECK (booking_option IN ('deposit', 'hold_48h', 'consultation', 'full_payment')),
ADD COLUMN IF NOT EXISTS package_details JSONB; -- Snapshot of the selected package at booking time

-- 4. Ensure RLS allows vendors to update calendar/block dates (via bookings table usually)
-- (Existing policies usually cover this, but ensuring bookings status 'blocked' is handled)
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'on_hold', 'blocked'));
