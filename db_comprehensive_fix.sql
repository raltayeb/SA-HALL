
-- 1. Ensure Profiles table has all necessary logic columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='status') THEN
        ALTER TABLE public.profiles ADD COLUMN status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_enabled') THEN
        ALTER TABLE public.profiles ADD COLUMN is_enabled BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='hall_limit') THEN
        ALTER TABLE public.profiles ADD COLUMN hall_limit INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='service_limit') THEN
        ALTER TABLE public.profiles ADD COLUMN service_limit INTEGER DEFAULT 3;
    END IF;
END $$;

-- 2. Ensure vendor_id exists in critical tables
DO $$ 
BEGIN
    -- Fix Halls
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halls' AND column_name='vendor_id') THEN
        ALTER TABLE public.halls ADD COLUMN vendor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    -- Fix Services
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='vendor_id') THEN
        ALTER TABLE public.services ADD COLUMN vendor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    -- Fix Bookings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='vendor_id') THEN
        ALTER TABLE public.bookings ADD COLUMN vendor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Create Supporting Tables for POS and Coupons
CREATE TABLE IF NOT EXISTS public.pos_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  hall_id UUID REFERENCES public.halls(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')) NOT NULL,
  discount_value DECIMAL(10, 2) NOT NULL,
  applicable_to TEXT CHECK (applicable_to IN ('halls', 'services', 'both')) DEFAULT 'both',
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Clean and Rebuild RLS Policies (The Heart of the Visibility Fix)
ALTER TABLE public.halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all possible naming variations to ensure fresh apply
DROP POLICY IF EXISTS "Vendors manage own halls" ON public.halls;
DROP POLICY IF EXISTS "Vendors manage own services" ON public.services;
DROP POLICY IF EXISTS "Vendors see own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- New Robust Policies
CREATE POLICY "Vendor Halls Access" ON public.halls FOR ALL USING (auth.uid() = vendor_id);
CREATE POLICY "Vendor Services Access" ON public.services FOR ALL USING (auth.uid() = vendor_id);
CREATE POLICY "Vendor Bookings Access" ON public.bookings FOR SELECT USING (auth.uid() = vendor_id OR auth.uid() = user_id);
CREATE POLICY "Vendor POS Access" ON public.pos_items FOR ALL USING (auth.uid() = vendor_id);
CREATE POLICY "Vendor Coupons Access" ON public.coupons FOR ALL USING (auth.uid() = vendor_id);
CREATE POLICY "Profile Self Access" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Profiles Public View" ON public.profiles FOR SELECT USING (true);

-- 5. Force Approve Vendors for testing
UPDATE public.profiles SET status = 'approved', is_enabled = true WHERE role = 'vendor';
UPDATE public.profiles SET status = 'approved', is_enabled = true WHERE role = 'super_admin';
