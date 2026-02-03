
-- 1. Allow user_id to be NULL in bookings table for guest bookings
ALTER TABLE public.bookings ALTER COLUMN user_id DROP NOT NULL;

-- 2. Update RLS policies to allow anonymous inserts
-- Note: In a production environment, you might want more restrictive checks, 
-- but for ease of use as requested:
CREATE POLICY "Allow anonymous booking creation" ON public.bookings
FOR INSERT 
WITH CHECK (true);

-- 3. Ensure vendors can still see all bookings regardless of if they are guest or registered
-- This policy should already exist but ensuring it covers guest bookings too
DROP POLICY IF EXISTS "Vendors can view bookings for their assets" ON public.bookings;
CREATE POLICY "Vendors can view bookings for their assets" ON public.bookings
FOR SELECT 
USING (auth.uid() = vendor_id);
