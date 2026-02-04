
-- 1. Create Service Categories Table (For Dynamic Admin Management)
CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT, -- Lucide icon name or emoji
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert Default Categories
INSERT INTO public.service_categories (name, icon) VALUES
('ضيافة وطعام', 'Utensils'),
('تصوير فوتوغرافي', 'Camera'),
('تصوير فيديو', 'Video'),
('تنسيق زهور', 'Flower'),
('كوشة وتصميم', 'Armchair'),
('توزيعات وهدايا', 'Gift'),
('دي جي وصوت', 'Speaker'),
('زفة', 'Music'),
('إضاءة', 'Zap')
ON CONFLICT (name) DO NOTHING;

-- 3. RLS for Service Categories
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Categories" ON public.service_categories FOR SELECT USING (true);
CREATE POLICY "Admin Manage Categories" ON public.service_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- 4. FIX: Robust User Creation Trigger
-- This ensures that when a user signs up via Auth, their Profile is created immediately with the correct status.
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
BEGIN
  -- Extract metadata safely
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'user');
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', '');
  
  -- Set limits based on role/metadata or defaults
  v_hall_limit := COALESCE((new.raw_user_meta_data->>'hall_limit')::integer, 1);
  v_service_limit := COALESCE((new.raw_user_meta_data->>'service_limit')::integer, 3);

  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role, 
    status, -- Important: Vendors start as 'pending', Users as 'approved'
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
    v_full_name, -- Default business name to full name initially
    v_hall_limit,
    v_service_limit,
    COALESCE(new.raw_user_meta_data->>'subscription_plan', 'basic')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();
  RETURN new;
END;
$$;

-- Re-apply trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
