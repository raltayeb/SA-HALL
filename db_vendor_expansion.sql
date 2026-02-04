
-- 1. PAYMENT LOGS (For Bookings)
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

-- 2. EXPENSES (For Vendor Accounting)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category TEXT NOT NULL, -- salary, rent, etc.
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. EXTERNAL INVOICES (For Other Revenues)
CREATE TABLE IF NOT EXISTS public.external_invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  items JSONB DEFAULT '[]'::jsonb, -- Array of objects
  total_amount DECIMAL(10, 2) NOT NULL,
  vat_amount DECIMAL(10, 2) NOT NULL,
  status TEXT CHECK (status IN ('paid', 'unpaid')) DEFAULT 'unpaid',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS POLICIES
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_invoices ENABLE ROW LEVEL SECURITY;

-- Payment Logs Policies
CREATE POLICY "Vendor view payment logs" ON public.payment_logs FOR SELECT USING (auth.uid() = vendor_id);
CREATE POLICY "Vendor insert payment logs" ON public.payment_logs FOR INSERT WITH CHECK (auth.uid() = vendor_id);
CREATE POLICY "User view own booking payments" ON public.payment_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = payment_logs.booking_id AND bookings.user_id = auth.uid())
);

-- Expenses Policies
CREATE POLICY "Vendor manage expenses" ON public.expenses FOR ALL USING (auth.uid() = vendor_id);

-- External Invoices Policies
CREATE POLICY "Vendor manage invoices" ON public.external_invoices FOR ALL USING (auth.uid() = vendor_id);
