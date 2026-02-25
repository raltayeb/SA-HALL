-- =====================================================
-- Admin Features: Hall Visibility & Popup Announcements
-- =====================================================

-- 1. CREATE POPUP ANNOUNCEMENTS TABLE
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

-- 2. ADD HALL VISIBILITY CONTROL TABLE (Many-to-Many: Halls <-> Subscribers)
CREATE TABLE IF NOT EXISTS public.hall_visibility (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hall_id UUID REFERENCES public.halls(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hall_id, user_id)
);

-- 3. ADD DEFAULT VISIBILITY FOR EXISTING USERS
-- Make all existing halls visible to all existing users by default
INSERT INTO public.hall_visibility (hall_id, user_id, is_visible)
SELECT h.id, p.id, true
FROM public.halls h
CROSS JOIN public.profiles p
WHERE p.role IN ('user', 'vendor')
ON CONFLICT (hall_id, user_id) DO NOTHING;

-- 4. ENABLE RLS
ALTER TABLE public.popup_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hall_visibility ENABLE ROW LEVEL SECURITY;

-- 5. CREATE POLICIES FOR POPUP ANNOUNCEMENTS
-- Everyone can view active announcements
CREATE POLICY "Active announcements are viewable by everyone" 
ON public.popup_announcements 
FOR SELECT 
USING (is_active = true);

-- Only admins can insert/update/delete announcements
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

-- 6. CREATE POLICIES FOR HALL VISIBILITY
-- Users can view their own visibility settings
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

-- Admins can manage all visibility settings
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

-- Vendors can view visibility for their own halls
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

-- 7. CREATE FUNCTION TO GET VISIBLE HALLS FOR USER
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

-- 8. CREATE FUNCTION TO CHECK IF HALL IS VISIBLE TO USER
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

-- 9. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_hall_visibility_hall ON public.hall_visibility(hall_id);
CREATE INDEX IF NOT EXISTS idx_hall_visibility_user ON public.hall_visibility(user_id);
CREATE INDEX IF NOT EXISTS idx_popup_announcements_active ON public.popup_announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_popup_announcements_priority ON public.popup_announcements(priority DESC);

-- 10. CREATE TRIGGER FOR UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_popup_announcements_updated_at
  BEFORE UPDATE ON public.popup_announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hall_visibility_updated_at
  BEFORE UPDATE ON public.hall_visibility
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 11. INSERT SAMPLE POPUP ANNOUNCEMENT (Optional)
-- INSERT INTO public.popup_announcements (title, content, image_url, button_text, priority, target_audience)
-- VALUES (
--   'عرض خاص!',
--   'احصل على خصم 20% على حجوزات القاعات هذا الشهر',
--   'https://example.com/promo.jpg',
--   'احجز الآن',
--   1,
--   'all'
-- );

COMMENT ON TABLE public.popup_announcements IS 'Popup announcements shown to users on page load';
COMMENT ON TABLE public.hall_visibility IS 'Controls which halls are visible to which users';
