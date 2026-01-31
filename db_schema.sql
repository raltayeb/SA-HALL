
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Users & Vendors)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('super_admin', 'vendor', 'user')) DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HALLS (Multi-vendor Venues)
CREATE TABLE IF NOT EXISTS public.halls (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  capacity INT NOT NULL DEFAULT 0,
  price_per_night DECIMAL(10, 2) NOT NULL,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indices for optimized filtering (Price, City, Capacity)
CREATE INDEX IF NOT EXISTS idx_halls_city ON public.halls(city);
CREATE INDEX IF NOT EXISTS idx_halls_price ON public.halls(price_per_night);
CREATE INDEX IF NOT EXISTS idx_halls_capacity ON public.halls(capacity);

-- 3. BOOKINGS
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hall_id UUID REFERENCES public.halls(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  vendor_id UUID REFERENCES public.profiles(id) NOT NULL,
  booking_date DATE NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  vat_amount DECIMAL(10, 2) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. AUDIT LOGS (Tracking every change)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  table_name TEXT NOT NULL,
  action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  record_id UUID NOT NULL,
  changed_by UUID REFERENCES public.profiles(id),
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS POLICIES (Row Level Security)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Public Read, Self Update
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Halls: Public Read, Vendor Management
DROP POLICY IF EXISTS "Halls are viewable by everyone" ON public.halls;
CREATE POLICY "Halls are viewable by everyone" ON public.halls FOR SELECT USING (true);
DROP POLICY IF EXISTS "Vendors can insert their own halls" ON public.halls;
CREATE POLICY "Vendors can insert their own halls" ON public.halls FOR INSERT WITH CHECK (auth.uid() = vendor_id);
DROP POLICY IF EXISTS "Vendors can update their own halls" ON public.halls;
CREATE POLICY "Vendors can update their own halls" ON public.halls FOR UPDATE USING (auth.uid() = vendor_id);

-- Bookings: User/Vendor/Admin access
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
CREATE POLICY "Users can view their own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Vendors can view bookings for their halls" ON public.bookings;
CREATE POLICY "Vendors can view bookings for their halls" ON public.bookings FOR SELECT USING (auth.uid() = vendor_id);
DROP POLICY IF EXISTS "Super Admin can view all bookings" ON public.bookings;
CREATE POLICY "Super Admin can view all bookings" ON public.bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- TRIGGERS & FUNCTIONS

-- Audit Logging Function
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_logs (table_name, action, record_id, changed_by, old_data)
    VALUES (TG_TABLE_NAME, TG_OP, OLD.id, auth.uid(), to_jsonb(OLD));
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_logs (table_name, action, record_id, changed_by, old_data, new_data)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs (table_name, action, record_id, changed_by, new_data)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, auth.uid(), to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Audit Trigger to Bookings
DROP TRIGGER IF EXISTS audit_bookings_trigger ON public.bookings;
CREATE TRIGGER audit_bookings_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.bookings
FOR EACH ROW EXECUTE PROCEDURE public.process_audit_log();

-- Attach Audit Trigger to Halls
DROP TRIGGER IF EXISTS audit_halls_trigger ON public.halls;
CREATE TRIGGER audit_halls_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.halls
FOR EACH ROW EXECUTE PROCEDURE public.process_audit_log();

-- Auto-Profile creation on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'مستخدم جديد'), 
    COALESCE(new.raw_user_meta_data->>'role', 'user')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
