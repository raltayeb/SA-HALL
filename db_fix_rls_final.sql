
-- 1. Ensure RLS is on
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 2. Clean up existing overlapping policies (drop common variants)
DROP POLICY IF EXISTS "Users can create their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow anonymous booking creation" ON public.bookings;
DROP POLICY IF EXISTS "Public Booking Creation" ON public.bookings;
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "User Bookings Access" ON public.bookings;
DROP POLICY IF EXISTS "Vendors can view bookings for their assets" ON public.bookings;
DROP POLICY IF EXISTS "Vendor Bookings Access" ON public.bookings;
DROP POLICY IF EXISTS "Vendor Update Bookings" ON public.bookings;
DROP POLICY IF EXISTS "Vendors can update booking status" ON public.bookings;

-- 3. Create a clean, permissive INSERT policy
-- This allows ANYONE (guest or logged in) to insert a row.
CREATE POLICY "Enable Insert for All" ON public.bookings
FOR INSERT WITH CHECK (true);

-- 4. Create SELECT policy
-- - Vendors can see bookings assigned to them (vendor_id matches auth.uid())
-- - Users can see bookings they created (user_id matches auth.uid())
-- - Guests: Cannot see bookings after insertion by default via RLS (requires user_id match), 
--   but standard Supabase client usually handles the 'return' data of an INSERT 
--   if the user has permission to insert. If not, the application logic should rely 
--   on the success status rather than selecting back the row if auth is null.
CREATE POLICY "Enable Read for Owners and Vendors" ON public.bookings
FOR SELECT USING (
  auth.uid() = vendor_id 
  OR 
  (auth.uid() = user_id AND user_id IS NOT NULL)
);

-- 5. Create UPDATE policy for Vendors
CREATE POLICY "Enable Update for Vendors" ON public.bookings
FOR UPDATE USING (auth.uid() = vendor_id);

-- 6. Ensure user_id column is nullable (Double check)
ALTER TABLE public.bookings ALTER COLUMN user_id DROP NOT NULL;
