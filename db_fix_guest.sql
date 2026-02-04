
-- 1. Fix Bookings for Guests (Allow NULL user_id)
ALTER TABLE public.bookings ALTER COLUMN user_id DROP NOT NULL;

-- 2. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('booking_new', 'booking_update', 'system', 'payment')) DEFAULT 'system',
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Realtime for Notifications (Critical for Supabase)
-- Using a DO block to prevent error if table is already in publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- 4. RLS Policies for Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System insert notifications" ON public.notifications;
CREATE POLICY "System insert notifications" ON public.notifications
FOR INSERT WITH CHECK (true); -- Allow system/triggers to insert

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id);

-- 5. Fix Booking RLS to allow Guest Inserts
DROP POLICY IF EXISTS "Allow anonymous booking creation" ON public.bookings;
CREATE POLICY "Allow anonymous booking creation" ON public.bookings
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Vendors can view bookings for their assets" ON public.bookings;
CREATE POLICY "Vendors can view bookings for their assets" ON public.bookings
FOR SELECT USING (
  auth.uid() = vendor_id 
  OR 
  (auth.uid() = user_id AND user_id IS NOT NULL)
);

-- 6. Trigger to Create Notification on New Booking
CREATE OR REPLACE FUNCTION public.notify_new_booking()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vendor_name TEXT;
  v_client_name TEXT;
BEGIN
  -- Notify Vendor
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    NEW.vendor_id,
    'حجز جديد 🔔',
    'لديك طلب حجز جديد بانتظار الموافقة.',
    'booking_new',
    'hall_bookings'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_booking_created ON public.bookings;
CREATE TRIGGER on_booking_created
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE PROCEDURE public.notify_new_booking();
