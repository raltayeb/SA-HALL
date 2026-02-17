
-- =================================================================
-- SA HALL - LATEST COMPREHENSIVE SCHEMA UPDATE (V11)
-- =================================================================

-- 1. ENABLE UUID EXTENSION
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public View Settings" ON public.system_settings;
CREATE POLICY "Public View Settings" ON public.system_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Manage Settings" ON public.system_settings;
CREATE POLICY "Admin Manage Settings" ON public.system_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- 3. VENDOR CLIENTS
CREATE TABLE IF NOT EXISTS public.vendor_clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_vip BOOLEAN DEFAULT false,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.vendor_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendor Manage Clients" ON public.vendor_clients;
CREATE POLICY "Vendor Manage Clients" ON public.vendor_clients FOR ALL USING (auth.uid() = vendor_id);

-- 4. PROFILE TABLE UPDATES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hall_limit INTEGER DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS service_limit INTEGER DEFAULT 3;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'basic';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_logo_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vendor_amenities JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';

-- 5. ASSET TABLES UPDATES
ALTER TABLE public.halls ADD COLUMN IF NOT EXISTS capacity_men INTEGER DEFAULT 0;
ALTER TABLE public.halls ADD COLUMN IF NOT EXISTS capacity_women INTEGER DEFAULT 0;
ALTER TABLE public.halls ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE public.halls ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE public.halls ADD COLUMN IF NOT EXISTS policies TEXT;
ALTER TABLE public.halls ADD COLUMN IF NOT EXISTS seasonal_prices JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.halls ADD COLUMN IF NOT EXISTS addons JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.halls ADD COLUMN IF NOT EXISTS packages JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.halls ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'hall';

ALTER TABLE public.pos_items ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE public.pos_items ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'عام';
ALTER TABLE public.pos_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.pos_items ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- 6. STORE ORDERS
CREATE TABLE IF NOT EXISTS public.store_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  guest_info JSONB,
  items JSONB DEFAULT '[]'::jsonb,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending',
  delivery_status TEXT CHECK (delivery_status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')) DEFAULT 'pending',
  payment_method TEXT DEFAULT 'cod',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store Public Insert" ON public.store_orders;
CREATE POLICY "Store Public Insert" ON public.store_orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "View Own Orders" ON public.store_orders;
CREATE POLICY "View Own Orders" ON public.store_orders FOR SELECT USING (
  auth.uid() = vendor_id OR auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "Admin Manage Orders" ON public.store_orders;
CREATE POLICY "Admin Manage Orders" ON public.store_orders FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- 7. STORAGE
INSERT INTO storage.buckets (id, name, public) VALUES ('vendor-logos', 'vendor-logos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('hall-images', 'hall-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('service-images', 'service-images', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admin Upload Logos" ON storage.objects;
CREATE POLICY "Admin Upload Logos" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'vendor-logos' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- 8. USER CREATION TRIGGER (ROBUST FIX)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_full_name TEXT;
    v_status TEXT;
    v_hall_limit INTEGER;
    v_service_limit INTEGER;
BEGIN
  -- Safe extraction with defaults
  BEGIN
    v_role := COALESCE(new.raw_user_meta_data->>'role', 'user');
    v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', '');
    
    -- Parse integer limits safely
    v_hall_limit := (new.raw_user_meta_data->>'hall_limit')::integer;
    v_service_limit := (new.raw_user_meta_data->>'service_limit')::integer;
  EXCEPTION WHEN OTHERS THEN
    v_role := 'user';
    v_full_name := '';
    v_hall_limit := 1;
    v_service_limit := 3;
  END;

  -- Logic for Role Status
  IF v_role = 'vendor' THEN v_status := 'pending'; ELSE v_status := 'approved'; END IF;

  -- Ensure limits have values
  IF v_hall_limit IS NULL THEN v_hall_limit := 1; END IF;
  IF v_service_limit IS NULL THEN v_service_limit := 3; END IF;

  -- Check if profile already exists (race condition prevention)
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = new.id) THEN
      INSERT INTO public.profiles (
        id, email, full_name, role, status, is_enabled, business_name, hall_limit, service_limit, subscription_plan
      )
      VALUES (
        new.id, 
        new.email, 
        v_full_name, 
        v_role, 
        v_status, 
        true, 
        v_full_name,
        v_hall_limit,
        v_service_limit,
        'basic'
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role, -- Update role if changed
        updated_at = NOW();
  END IF;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log error but do not fail auth creation to prevent 500 error
  -- App will handle missing profile via manual insert
  RAISE WARNING 'Profile creation failed for user %: %', new.id, SQLERRM;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

