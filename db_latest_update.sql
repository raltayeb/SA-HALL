
-- Latest Cumulative Update for Accounting, POS, and Bookings

-- 1. Enhanced Bookings Table (تحسين جدول الحجوزات)
-- إضافة أعمدة لحالة القراءة، تفاصيل الضيف، والمبالغ المدفوعة
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS guest_name TEXT,
ADD COLUMN IF NOT EXISTS guest_phone TEXT,
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status TEXT CHECK (payment_status IN ('paid', 'partial', 'unpaid')) DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Accounting: Expenses Table (جدول المصروفات)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category TEXT NOT NULL, -- 'salary', 'rent', etc.
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Accounting: External Invoices Table (جدول الإيرادات الخارجية)
CREATE TABLE IF NOT EXISTS public.external_invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  items JSONB DEFAULT '[]'::jsonb,
  total_amount DECIMAL(10, 2) NOT NULL,
  vat_amount DECIMAL(10, 2) NOT NULL,
  status TEXT CHECK (status IN ('paid', 'unpaid')) DEFAULT 'unpaid',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Payment Logs (سجل الدفعات للحجوزات)
CREATE TABLE IF NOT EXISTS public.payment_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  vendor_id UUID REFERENCES public.profiles(id) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'transfer')) DEFAULT 'cash',
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. POS Configuration in Profiles (إعدادات نقاط البيع)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pos_config JSONB DEFAULT '{
  "tax_rate": 15,
  "tax_id": "",
  "receipt_header": "",
  "receipt_footer": "شكراً لزيارتكم",
  "printer_width": "80mm",
  "auto_print": false
}'::jsonb;

-- 6. POS Items Enhancements (تحسين عناصر المتجر)
ALTER TABLE public.pos_items 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'عام',
ADD COLUMN IF NOT EXISTS barcode TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 7. RLS Policies (سياسات الأمان)
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- Drop old policies to prevent conflicts
DROP POLICY IF EXISTS "Vendor manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Vendor manage invoices" ON public.external_invoices;
DROP POLICY IF EXISTS "Vendor manage payment logs" ON public.payment_logs;

-- Create Policies
CREATE POLICY "Vendor manage expenses" ON public.expenses FOR ALL USING (auth.uid() = vendor_id);
CREATE POLICY "Vendor manage invoices" ON public.external_invoices FOR ALL USING (auth.uid() = vendor_id);
CREATE POLICY "Vendor manage payment logs" ON public.payment_logs FOR ALL USING (auth.uid() = vendor_id);

-- Ensure Booking RLS allows updates
DROP POLICY IF EXISTS "Vendors can update bookings" ON public.bookings;
CREATE POLICY "Vendors can update bookings" ON public.bookings FOR UPDATE USING (auth.uid() = vendor_id);
