
-- 1. Ensure all columns exist in public.profiles with correct defaults
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hall_limit INTEGER DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS service_limit INTEGER DEFAULT 3;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'basic';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_name TEXT;

-- 2. Drop existing trigger to ensure clean slate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Recreate the handler function with robust error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_full_name TEXT;
    v_hall_limit INTEGER;
    v_service_limit INTEGER;
    v_sub_plan TEXT;
BEGIN
  -- Extract metadata safely with fallbacks
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'user');
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', '');
  v_sub_plan := COALESCE(new.raw_user_meta_data->>'subscription_plan', 'basic');
  
  -- Parse limits safely
  BEGIN
    v_hall_limit := (new.raw_user_meta_data->>'hall_limit')::integer;
  EXCEPTION WHEN OTHERS THEN
    v_hall_limit := 1;
  END;
  
  BEGIN
    v_service_limit := (new.raw_user_meta_data->>'service_limit')::integer;
  EXCEPTION WHEN OTHERS THEN
    v_service_limit := 3;
  END;

  -- Default limits if null
  IF v_hall_limit IS NULL THEN v_hall_limit := 1; END IF;
  IF v_service_limit IS NULL THEN v_service_limit := 3; END IF;

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
    v_full_name, -- Use full name as default business name initially
    v_hall_limit,
    v_service_limit,
    v_sub_plan
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    hall_limit = EXCLUDED.hall_limit,
    service_limit = EXCLUDED.service_limit,
    subscription_plan = EXCLUDED.subscription_plan,
    updated_at = NOW();
    
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log error but allow user creation to proceed (prevents 500 error on sign up)
  -- The app should handle missing profile by trying to insert it manually if needed
  RAISE WARNING 'Trigger handle_new_user failed: %', SQLERRM;
  RETURN new;
END;
$$;

-- 4. Re-attach trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
