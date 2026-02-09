
-- 1. FIX BOOKINGS CONSTRAINT (Allow NULL hall_id)
ALTER TABLE public.bookings ALTER COLUMN hall_id DROP NOT NULL;

-- 2. CREATE CHALETS TABLE (Separation)
CREATE TABLE IF NOT EXISTS public.chalets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  capacity INTEGER DEFAULT 0,
  price_per_night DECIMAL(10, 2) NOT NULL,
  price_per_adult DECIMAL(10, 2) DEFAULT 0,
  price_per_child DECIMAL(10, 2) DEFAULT 0,
  description TEXT,
  policies TEXT,
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  amenities JSONB DEFAULT '[]'::jsonb,
  addons JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MIGRATE DATA (Move Chalets/Resorts from Halls to Chalets)
INSERT INTO public.chalets (
  id, vendor_id, name, city, address, capacity, price_per_night, 
  price_per_adult, price_per_child, description, policies, image_url, images, amenities, addons, is_active, created_at
)
SELECT 
  id, vendor_id, name, city, address, capacity, price_per_night,
  price_per_adult, price_per_child, description, policies, image_url, images, amenities, addons, is_active, created_at
FROM public.halls 
WHERE type IN ('chalet', 'resort', 'lounge');

-- Delete moved items from halls
DELETE FROM public.halls WHERE type IN ('chalet', 'resort', 'lounge');

-- 4. UPDATE BOOKINGS TABLE
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS chalet_id UUID REFERENCES public.chalets(id) ON DELETE CASCADE;

-- Ensure logic constraint: Booking must target exactly one asset type
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS booking_target_check;
ALTER TABLE public.bookings ADD CONSTRAINT booking_target_check CHECK (
  (hall_id IS NOT NULL)::int + (service_id IS NOT NULL)::int + (chalet_id IS NOT NULL)::int = 1
);

-- 5. ENABLE REALTIME (For all main tables)
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.halls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chalets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_orders;

-- 6. RLS FOR CHALETS
ALTER TABLE public.chalets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Chalets" ON public.chalets FOR SELECT USING (true);
CREATE POLICY "Vendor Manage Chalets" ON public.chalets FOR ALL USING (auth.uid() = vendor_id);

-- 7. FIX MARKETPLACE VISIBILITY (Allow Vendors to see Admin Products)
DROP POLICY IF EXISTS "Read Admin Items" ON public.pos_items;
CREATE POLICY "Read Admin Items" ON public.pos_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = pos_items.vendor_id AND role = 'super_admin')
  OR auth.uid() = vendor_id
);

-- 8. FIX GUEST BOOKING VISIBILITY
DROP POLICY IF EXISTS "Enable Read for Owners and Vendors" ON public.bookings;
CREATE POLICY "Enable Read for Owners and Vendors" ON public.bookings
FOR SELECT USING (
  auth.uid() = vendor_id 
  OR (auth.uid() = user_id AND user_id IS NOT NULL)
  OR (guest_phone IS NOT NULL AND guest_phone = (SELECT phone_number FROM profiles WHERE id = auth.uid()))
);

-- 9. DATA REPLICATION FOR SELLER2 (Seeding)
DO $$
DECLARE
  v_seller2_id UUID;
  rec RECORD;
  new_hall_id UUID;
  new_chalet_id UUID;
BEGIN
  -- Check if seller2 exists or create dummy one (Assuming manual creation or lookup)
  -- For this script, we assume we want to duplicate for the CURRENT user executing this if they are a vendor, 
  -- OR you can replace auth.uid() with a specific UUID.
  -- Here we duplicate existing assets to the SAME vendor just for demo, appending '(Copy)'
  
  -- DUPLICATE HALLS
  FOR rec IN SELECT * FROM public.halls LOOP
    INSERT INTO public.halls (
      vendor_id, name, city, capacity, price_per_night, description, image_url, images, is_active
    ) VALUES (
      rec.vendor_id, rec.name || ' (مكرر)', rec.city, rec.capacity, rec.price_per_night, rec.description, rec.image_url, rec.images, true
    );
  END LOOP;

  -- DUPLICATE CHALETS
  FOR rec IN SELECT * FROM public.chalets LOOP
    INSERT INTO public.chalets (
      vendor_id, name, city, capacity, price_per_night, description, image_url, images, is_active
    ) VALUES (
      rec.vendor_id, rec.name || ' (مكرر)', rec.city, rec.capacity, rec.price_per_night, rec.description, rec.image_url, rec.images, true
    );
  END LOOP;
END $$;
