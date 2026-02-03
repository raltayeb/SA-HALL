
-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles Table Enhanced
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT DEFAULT '',
  role TEXT CHECK (role IN ('super_admin', 'vendor', 'user')) DEFAULT 'user',
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  business_name TEXT DEFAULT '',
  is_enabled BOOLEAN DEFAULT true,
  hall_limit INTEGER DEFAULT 1,
  service_limit INTEGER DEFAULT 3,
  subscription_plan TEXT DEFAULT 'basic',
  payment_status TEXT DEFAULT 'unpaid',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Payment Settings Table
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Robust Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_full_name TEXT;
BEGIN
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'user');
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', '');

  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role, 
    status, 
    is_enabled, 
    business_name,
    hall_limit,
    service_limit,
    subscription_plan
  )
  VALUES (
    new.id, 
    new.email, 
    v_full_name, 
    v_role,
    CASE WHEN v_role = 'vendor' THEN 'pending' ELSE 'approved' END,
    true,
    v_full_name,
    COALESCE((new.raw_user_meta_data->>'hall_limit')::integer, 1),
    COALESCE((new.raw_user_meta_data->>'service_limit')::integer, 3),
    COALESCE(new.raw_user_meta_data->>'subscription_plan', 'basic')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log error or handle silently to prevent auth failure
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can do anything" ON public.profiles;
CREATE POLICY "Admins can do anything" ON public.profiles FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
