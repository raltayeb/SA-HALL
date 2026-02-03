
-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles Table - Ensure all possible columns exist with safe defaults
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY, -- Removed explicit FK to auth.users temporarily to ensure trigger stability
  email TEXT UNIQUE NOT NULL,
  full_name TEXT DEFAULT '',
  role TEXT CHECK (role IN ('super_admin', 'vendor', 'user')) DEFAULT 'user',
  phone_number TEXT DEFAULT '',
  business_name TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  is_enabled BOOLEAN DEFAULT true,
  theme_color TEXT DEFAULT '#4B0082',
  custom_logo_url TEXT DEFAULT '',
  whatsapp_number TEXT DEFAULT '',
  business_email TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Resilient Trigger Function for New Users
-- This is designed to never fail so that auth.signUp succeeds
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  meta_full_name TEXT;
  meta_role TEXT;
  meta_is_enabled BOOLEAN;
BEGIN
  -- Safely extract metadata with defaults
  meta_full_name := COALESCE(new.raw_user_meta_data->>'full_name', '');
  meta_role := COALESCE(new.raw_user_meta_data->>'role', 'user');
  
  -- Safer boolean cast
  BEGIN
    meta_is_enabled := (new.raw_user_meta_data->>'is_enabled')::boolean;
  EXCEPTION WHEN OTHERS THEN
    meta_is_enabled := true;
  END;

  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role, 
    is_enabled,
    business_name
  )
  VALUES (
    new.id, 
    new.email, 
    meta_full_name, 
    meta_role,
    meta_is_enabled,
    meta_full_name -- Default business name to provided name
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE profiles.full_name END,
    role = EXCLUDED.role;
    
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log error locally if possible, but RETURN new to avoid blocking user creation
  RETURN new;
END;
$$;

-- 4. Re-create Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
