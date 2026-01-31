
-- 1. تفعيل الإضافات الأساسية
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. جدول الملفات الشخصية (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY, -- مرتبط بـ auth.users.id
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('super_admin', 'vendor', 'user')) DEFAULT 'user',
  phone_number TEXT,
  business_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. جدول اشتراكات البائعين (SaaS Subscriptions)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT CHECK (plan_type IN ('basic', 'pro', 'enterprise')) DEFAULT 'basic',
  status TEXT CHECK (status IN ('active', 'expired', 'trial')) DEFAULT 'active',
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. جدول القاعات (Halls)
CREATE TABLE IF NOT EXISTS public.halls (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  capacity INT NOT NULL DEFAULT 0,
  price_per_night DECIMAL(10, 2) NOT NULL,
  description TEXT,
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  amenities JSONB DEFAULT '[]'::jsonb,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. جدول الخدمات الإضافية (Services)
CREATE TABLE IF NOT EXISTS public.services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. جدول الحجوزات (Bookings)
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hall_id UUID REFERENCES public.halls(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  vendor_id UUID REFERENCES public.profiles(id) NOT NULL,
  booking_date DATE NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  vat_amount DECIMAL(10, 2) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled')) DEFAULT 'pending',
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. جدول المفضلة (Favorites)
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  hall_id UUID REFERENCES public.halls(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, hall_id)
);

-- 8. جدول إعدادات النظام (System Settings)
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إدخال إعدادات افتراضية
INSERT INTO public.system_settings (key, value) 
VALUES ('platform_config', '{"site_name": "SA Hall", "commission_rate": 0.10, "vat_enabled": true}')
ON CONFLICT (key) DO NOTHING;

-- 9. سياسات الحماية (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- سياسات مدير النظام (Super Admin can see everything for management)
CREATE POLICY "Super admin manages all profiles" ON public.profiles FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

CREATE POLICY "Super admin manages settings" ON public.system_settings FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

CREATE POLICY "Super admin manages subscriptions" ON public.subscriptions FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

-- سياسات البائعين (Vendors can only see their own bookings/halls)
CREATE POLICY "Vendors manage their own halls" ON public.halls FOR ALL USING (vendor_id = auth.uid());
CREATE POLICY "Vendors view their own bookings" ON public.bookings FOR SELECT USING (vendor_id = auth.uid());

-- سياسات المستخدمين
CREATE POLICY "Users view active halls" ON public.halls FOR SELECT USING (is_active = true);
CREATE POLICY "Users view their own bookings" ON public.bookings FOR SELECT USING (user_id = auth.uid());

-- 10. الفهارس (Indexes) لسرعة الأداء
CREATE INDEX IF NOT EXISTS idx_bookings_vendor ON public.bookings(vendor_id);
CREATE INDEX IF NOT EXISTS idx_halls_vendor ON public.halls(vendor_id);
CREATE INDEX IF NOT EXISTS idx_subs_vendor ON public.subscriptions(vendor_id);
