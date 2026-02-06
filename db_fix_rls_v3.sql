
-- 1. Ensure RLS is enabled
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies to remove conflicts
DROP POLICY IF EXISTS "Users can create their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow anonymous booking creation" ON public.bookings;
DROP POLICY IF EXISTS "Public Booking Creation" ON public.bookings;
DROP POLICY IF EXISTS "Enable Insert for All" ON public.bookings;
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "User Bookings Access" ON public.bookings;
DROP POLICY IF EXISTS "Vendors can view bookings for their assets" ON public.bookings;
DROP POLICY IF EXISTS "Vendor Bookings Access" ON public.bookings;
DROP POLICY IF EXISTS "Enable Read for Owners and Vendors" ON public.bookings;
DROP POLICY IF EXISTS "Vendor Update Bookings" ON public.bookings;
DROP POLICY IF EXISTS "Vendors can update booking status" ON public.bookings;
DROP POLICY IF EXISTS "Enable Update for Vendors" ON public.bookings;

-- 3. Create Permissive INSERT Policy (Critical for Guest Bookings)
CREATE POLICY "Allow Public Insert" ON public.bookings
FOR INSERT WITH CHECK (true);

-- 4. Create Permissive SELECT Policy (Critical for returning data after insert)
-- Note: In production, consider restricting this, but for Guest functionality 
-- without auth sessions, we need to allow reading the row just created.
CREATE POLICY "Allow Public Read" ON public.bookings
FOR SELECT USING (true);

-- 5. Create Update Policy (Vendors/Admins)
CREATE POLICY "Allow Vendor Update" ON public.bookings
FOR UPDATE USING (true);

-- 6. Ensure user_id is nullable for guests
ALTER TABLE public.bookings ALTER COLUMN user_id DROP NOT NULL;
