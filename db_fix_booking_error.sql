
-- Enable RLS on bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Drop conflicting policies to ensure clean slate for INSERT permissions
DROP POLICY IF EXISTS "Users can create their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow anonymous booking creation" ON public.bookings;
DROP POLICY IF EXISTS "Public Booking Creation" ON public.bookings;

-- Create a permissive INSERT policy that allows:
-- 1. Guests (unauthenticated) to create bookings (user_id is null)
-- 2. Authenticated users to create bookings (user_id matches auth.uid)
-- 3. Vendors to create manual bookings
CREATE POLICY "Public Booking Creation" ON public.bookings
FOR INSERT
WITH CHECK (true);

-- Ensure vendors can see bookings for their halls/services
DROP POLICY IF EXISTS "Vendor Bookings Access" ON public.bookings;
CREATE POLICY "Vendor Bookings Access" ON public.bookings
FOR SELECT
USING (auth.uid() = vendor_id);

-- Ensure users can see their own bookings
DROP POLICY IF EXISTS "User Bookings Access" ON public.bookings;
CREATE POLICY "User Bookings Access" ON public.bookings
FOR SELECT
USING (auth.uid() = user_id);

-- Ensure vendors can update bookings (e.g. confirm, add payment logs)
DROP POLICY IF EXISTS "Vendor Update Bookings" ON public.bookings;
CREATE POLICY "Vendor Update Bookings" ON public.bookings
FOR UPDATE
USING (auth.uid() = vendor_id);
