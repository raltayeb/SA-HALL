-- 1. DROP EXISTING RESTRICTIVE POLICIES ON PROFILES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 2. RE-CREATE POLICIES WITH SUPER ADMIN PRIVILEGES

-- Allow everyone to read profiles (needed for vendors/users to see basic info if needed, or restricting it further)
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Allow Super Admin to INSERT into profiles (Create Users)
CREATE POLICY "Super Admins can insert profiles" ON public.profiles FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Allow Super Admin to UPDATE any profile
CREATE POLICY "Super Admins can update any profile" ON public.profiles FOR UPDATE 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Allow Super Admin to DELETE any profile
CREATE POLICY "Super Admins can delete any profile" ON public.profiles FOR DELETE 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
