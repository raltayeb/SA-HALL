
-- Drop old policy if exists to recreate
DROP POLICY IF EXISTS "Enable Read for Owners and Vendors" ON public.bookings;

-- Create New Policy
-- Allows access if:
-- 1. User is the Vendor of the booking
-- 2. User is the registered owner (user_id)
-- 3. User's phone number matches guest_phone (For Guests)
CREATE POLICY "Enable Read for Owners and Vendors" ON public.bookings
FOR SELECT USING (
  auth.uid() = vendor_id 
  OR 
  (auth.uid() = user_id AND user_id IS NOT NULL)
  OR
  (guest_phone IS NOT NULL AND guest_phone = (SELECT phone_number FROM profiles WHERE id = auth.uid()))
);
