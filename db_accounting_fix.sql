
-- 1. Add is_read column to bookings for "Inbox" functionality
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- 2. Ensure Expenses and Invoices tables exist with correct permissions
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category TEXT NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- 3. Fix RLS Policies (Drop old ones to be safe and recreate)
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendor manage expenses" ON public.expenses;
CREATE POLICY "Vendor manage expenses" ON public.expenses 
FOR ALL USING (auth.uid() = vendor_id);

DROP POLICY IF EXISTS "Vendor manage invoices" ON public.external_invoices;
CREATE POLICY "Vendor manage invoices" ON public.external_invoices 
FOR ALL USING (auth.uid() = vendor_id);

-- 4. Ensure Bookings Update Policy
DROP POLICY IF EXISTS "Vendors can update booking status" ON public.bookings;
CREATE POLICY "Vendors can update booking status" ON public.bookings
FOR UPDATE USING (auth.uid() = vendor_id);
