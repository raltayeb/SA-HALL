-- 1. DROP FK CONSTRAINT to allow creating profiles without Auth Users (Ghost Users)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. DROP EXISTING POLICIES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Super Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Super Admins can delete any profile" ON public.profiles;

-- 3. RE-CREATE POLICIES

-- Read: Everyone
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

-- Update: Self
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Super Admin: Full Access
-- Using a subquery for role check to verify the current user is an admin
CREATE POLICY "Super Admins can insert profiles" ON public.profiles FOR INSERT 
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

CREATE POLICY "Super Admins can update any profile" ON public.profiles FOR UPDATE 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

CREATE POLICY "Super Admins can delete any profile" ON public.profiles FOR DELETE 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

-- 4. DEV FIX: PROMOTE ALL EXISTING USERS TO SUPER_ADMIN
-- This ensures the developer's current user has access to test the management features.
UPDATE public.profiles SET role = 'super_admin';
