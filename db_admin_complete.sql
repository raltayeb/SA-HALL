-- =====================================================
-- Admin Features: Complete Database Schema (FIXED)
-- Run this script in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. POPUP ANNOUNCEMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.popup_announcements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  button_text TEXT DEFAULT 'إغلاق',
  button_link TEXT,
  is_active BOOLEAN DEFAULT true,
  show_on_load BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  target_audience TEXT CHECK (target_audience IN ('all', 'users', 'vendors')) DEFAULT 'all',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- =====================================================
-- 2. HALL VISIBILITY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.hall_visibility (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hall_id UUID REFERENCES public.halls(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hall_id, user_id)
);

-- =====================================================
-- 3. FEATURED HALLS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.featured_halls (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hall_id UUID REFERENCES public.halls(id) ON DELETE CASCADE UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- =====================================================
-- 4. SERVICE CATEGORIES TABLE - FIXED
-- Add columns if table exists, create if not
-- =====================================================

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add is_active column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'service_categories' 
      AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.service_categories ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- =====================================================
-- 5. CREATE DEFAULT VISIBILITY FOR EXISTING USERS
-- =====================================================

INSERT INTO public.hall_visibility (hall_id, user_id, is_visible)
SELECT h.id, p.id, true
FROM public.halls h
CROSS JOIN public.profiles p
WHERE p.role IN ('user', 'vendor')
ON CONFLICT (hall_id, user_id) DO NOTHING;

-- =====================================================
-- 6. ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.popup_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hall_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. CREATE POLICIES FOR POPUP ANNOUNCEMENTS
-- =====================================================

DROP POLICY IF EXISTS "Active announcements are viewable by everyone" ON public.popup_announcements;
CREATE POLICY "Active announcements are viewable by everyone" 
ON public.popup_announcements 
FOR SELECT 
USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage announcements" ON public.popup_announcements;
CREATE POLICY "Admins can manage announcements" 
ON public.popup_announcements 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

-- =====================================================
-- 8. CREATE POLICIES FOR HALL VISIBILITY
-- =====================================================

DROP POLICY IF EXISTS "Users can view their hall visibility" ON public.hall_visibility;
CREATE POLICY "Users can view their hall visibility" 
ON public.hall_visibility 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

DROP POLICY IF EXISTS "Admins can manage hall visibility" ON public.hall_visibility;
CREATE POLICY "Admins can manage hall visibility" 
ON public.hall_visibility 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

DROP POLICY IF EXISTS "Vendors can view their hall visibility" ON public.hall_visibility;
CREATE POLICY "Vendors can view their hall visibility" 
ON public.hall_visibility 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.halls 
    WHERE halls.id = hall_visibility.hall_id 
    AND halls.vendor_id = auth.uid()
  )
);

-- =====================================================
-- 9. CREATE POLICIES FOR FEATURED HALLS
-- =====================================================

DROP POLICY IF EXISTS "Featured halls are viewable by everyone" ON public.featured_halls;
CREATE POLICY "Featured halls are viewable by everyone" 
ON public.featured_halls 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Admins can manage featured halls" ON public.featured_halls;
CREATE POLICY "Admins can manage featured halls" 
ON public.featured_halls 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

-- =====================================================
-- 10. CREATE POLICIES FOR SERVICE CATEGORIES - FIXED
-- =====================================================

DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.service_categories;
CREATE POLICY "Categories are viewable by everyone" 
ON public.service_categories 
FOR SELECT 
USING (
  COALESCE(is_active, true) = true 
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.service_categories;
CREATE POLICY "Admins can manage categories" 
ON public.service_categories 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

-- =====================================================
-- 11. CREATE HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_visible_halls_for_user(user_uuid UUID)
RETURNS TABLE(hall_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT h.id
  FROM public.halls h
  LEFT JOIN public.hall_visibility hv ON h.id = hv.hall_id AND hv.user_id = user_uuid
  WHERE h.is_active = true
    AND (hv.is_visible IS NULL OR hv.is_visible = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_hall_visible_to_user(hall_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_visible BOOLEAN;
BEGIN
  SELECT COALESCE(hv.is_visible, true) INTO v_visible
  FROM public.hall_visibility hv
  WHERE hv.hall_id = hall_uuid AND hv.user_id = user_uuid;
  
  RETURN COALESCE(v_visible, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 12. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_hall_visibility_hall ON public.hall_visibility(hall_id);
CREATE INDEX IF NOT EXISTS idx_hall_visibility_user ON public.hall_visibility(user_id);
CREATE INDEX IF NOT EXISTS idx_popup_announcements_active ON public.popup_announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_popup_announcements_priority ON public.popup_announcements(priority DESC);
CREATE INDEX IF NOT EXISTS idx_popup_announcements_target ON public.popup_announcements(target_audience);
CREATE INDEX IF NOT EXISTS idx_featured_halls_hall ON public.featured_halls(hall_id);
CREATE INDEX IF NOT EXISTS idx_service_categories_active ON public.service_categories(is_active);

-- =====================================================
-- 13. CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_popup_announcements_updated_at ON public.popup_announcements;
CREATE TRIGGER update_popup_announcements_updated_at
  BEFORE UPDATE ON public.popup_announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hall_visibility_updated_at ON public.hall_visibility;
CREATE TRIGGER update_hall_visibility_updated_at
  BEFORE UPDATE ON public.hall_visibility
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_categories_updated_at ON public.service_categories;
CREATE TRIGGER update_service_categories_updated_at
  BEFORE UPDATE ON public.service_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 14. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.popup_announcements IS 'Popup announcements shown to users on page load';
COMMENT ON TABLE public.hall_visibility IS 'Controls which halls are visible to which users';
COMMENT ON TABLE public.featured_halls IS 'Halls marked as featured/premium';
COMMENT ON TABLE public.service_categories IS 'Categories for organizing services';

-- =====================================================
-- END OF SCRIPT
-- =====================================================
