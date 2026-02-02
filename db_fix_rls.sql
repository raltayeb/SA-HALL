
-- 1. Enable RLS on bookings (already enabled in schema, but ensuring)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 2. Define INSERT policy for bookings
-- Allows any authenticated user to create a booking.
-- We check that the user_id in the row matches the person making the request.
CREATE POLICY "Users can create their own bookings" ON public.bookings
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. Define SELECT policy for bookings (Customers)
-- Users can see bookings they created.
CREATE POLICY "Users can view their own bookings" ON public.bookings
FOR SELECT 
USING (auth.uid() = user_id);

-- 4. Define SELECT policy for bookings (Vendors)
-- Vendors can see bookings assigned to them (where they are the vendor).
CREATE POLICY "Vendors can view bookings for their assets" ON public.bookings
FOR SELECT 
USING (auth.uid() = vendor_id);

-- 5. Define UPDATE/DELETE policies (Optional but recommended)
-- Usually only the vendor or an admin can confirm/cancel.
CREATE POLICY "Vendors can update booking status" ON public.bookings
FOR UPDATE
USING (auth.uid() = vendor_id);

-- 6. Ensure Profiles are viewable so the app can display names in lists
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
FOR SELECT
USING (true);
