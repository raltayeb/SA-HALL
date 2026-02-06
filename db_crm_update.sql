
-- 1. Create Vendor Clients Table (Simple CRM)
CREATE TABLE IF NOT EXISTS public.vendor_clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_vip BOOLEAN DEFAULT false,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Link to registered user if exists
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Update External Invoices to link to Clients and Halls
ALTER TABLE public.external_invoices 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.vendor_clients(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS hall_id UUID REFERENCES public.halls(id) ON DELETE SET NULL;

-- 3. RLS Policies for Clients
ALTER TABLE public.vendor_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors manage own clients" ON public.vendor_clients
FOR ALL USING (auth.uid() = vendor_id);

-- 4. Trigger to sync registered bookings to vendor_clients (Optional but helpful)
-- When a booking is made by a registered user, ensure they exist in vendor_clients
CREATE OR REPLACE FUNCTION public.sync_booking_to_crm()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.vendor_clients (vendor_id, full_name, phone_number, profile_id)
    SELECT 
      NEW.vendor_id, 
      COALESCE(NEW.guest_name, (SELECT full_name FROM profiles WHERE id = NEW.user_id)),
      COALESCE(NEW.guest_phone, (SELECT phone_number FROM profiles WHERE id = NEW.user_id)),
      NEW.user_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.vendor_clients 
      WHERE vendor_id = NEW.vendor_id AND profile_id = NEW.user_id
    );
  ELSIF NEW.guest_name IS NOT NULL THEN
     -- For guest bookings (manual), try to insert if phone doesn't exist
     INSERT INTO public.vendor_clients (vendor_id, full_name, phone_number)
     SELECT NEW.vendor_id, NEW.guest_name, NEW.guest_phone
     WHERE NOT EXISTS (
        SELECT 1 FROM public.vendor_clients 
        WHERE vendor_id = NEW.vendor_id AND phone_number = NEW.guest_phone
     );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_booking_crm_sync ON public.bookings;
CREATE TRIGGER on_booking_crm_sync
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE PROCEDURE public.sync_booking_to_crm();
