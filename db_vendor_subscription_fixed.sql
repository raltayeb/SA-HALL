-- ============================================
-- Vendor Subscription & Lifetime Plans - FIXED
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add subscription tracking to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none' CHECK (subscription_status IN ('none', 'hall', 'service', 'both')),
ADD COLUMN IF NOT EXISTS subscription_paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_amount NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS has_active_subscription BOOLEAN DEFAULT FALSE;

-- 2. Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_type TEXT CHECK (subscription_type IN ('hall', 'service', 'both')),
    amount NUMERIC(10,2) NOT NULL,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    is_lifetime BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create featured_halls table
CREATE TABLE IF NOT EXISTS public.featured_halls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hall_id UUID REFERENCES halls(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_featured_halls_end_date ON featured_halls(end_date);
CREATE INDEX IF NOT EXISTS idx_featured_halls_active ON featured_halls(is_active) WHERE is_active = TRUE;

-- 5. Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    vendor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    customer_vat_number TEXT,
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    vat_rate NUMERIC(5,2) DEFAULT 15.00,
    vat_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL,
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid', 'partial', 'cancelled')),
    payment_method TEXT,
    payment_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice_number TEXT,
    expense_date DATE DEFAULT CURRENT_DATE,
    category TEXT CHECK (category IN ('rent', 'salaries', 'utilities', 'maintenance', 'marketing', 'supplies', 'zakat', 'tax', 'insurance', 'other')),
    supplier_name TEXT NOT NULL,
    supplier_vat_number TEXT,
    description TEXT,
    amount NUMERIC(12,2) NOT NULL,
    vat_amount NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL,
    payment_method TEXT,
    receipt_image TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create zakat_calculations table
CREATE TABLE IF NOT EXISTS public.zakat_calculations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    calculation_period_start DATE NOT NULL,
    calculation_period_end DATE NOT NULL,
    total_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_expenses NUMERIC(12,2) NOT NULL DEFAULT 0,
    net_income NUMERIC(12,2) NOT NULL DEFAULT 0,
    zakat_base NUMERIC(12,2) NOT NULL DEFAULT 0,
    zakat_rate NUMERIC(5,2) DEFAULT 2.50,
    zakat_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    vat_collected NUMERIC(12,2) DEFAULT 0,
    vat_paid NUMERIC(12,2) DEFAULT 0,
    vat_payable NUMERIC(12,2) DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'filed', 'paid')),
    filed_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Add featured flag to halls
ALTER TABLE public.halls
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE;

-- 9. Create function to auto-expire featured halls
CREATE OR REPLACE FUNCTION public.expire_featured_halls()
RETURNS void AS $$
BEGIN
    UPDATE halls
    SET is_featured = FALSE, featured_until = NULL
    WHERE featured_until IS NOT NULL 
    AND featured_until < NOW();
    
    UPDATE featured_halls
    SET is_active = FALSE
    WHERE end_date < NOW()
    AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger
CREATE OR REPLACE FUNCTION public.check_featured_expiry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.featured_until IS NOT NULL AND NEW.featured_until < NOW() THEN
        NEW.is_featured := FALSE;
        NEW.featured_until := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_featured_expiry
BEFORE UPDATE ON halls
FOR EACH ROW
EXECUTE FUNCTION public.check_featured_expiry();

-- 11. Insert system settings
INSERT INTO system_settings (key, value)
VALUES 
    ('zakat_config', '{"zakat_rate": 2.5, "vat_rate": 15.0, "fiscal_year_start": "01-01"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 12. Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE zakat_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_halls ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Vendors view own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Vendors view own invoices" ON invoices;
DROP POLICY IF EXISTS "Vendors view own expenses" ON expenses;
DROP POLICY IF EXISTS "Vendors view own zakat" ON zakat_calculations;
DROP POLICY IF EXISTS "Super admin view all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Super admin manage featured halls" ON featured_halls;

-- Create policies
CREATE POLICY "Vendors view own subscriptions" ON subscriptions
    FOR SELECT USING (vendor_id = auth.uid());

CREATE POLICY "Vendors view own invoices" ON invoices
    FOR SELECT USING (vendor_id = auth.uid());

CREATE POLICY "Vendors view own expenses" ON expenses
    FOR SELECT USING (vendor_id = auth.uid());

CREATE POLICY "Vendors view own zakat" ON zakat_calculations
    FOR SELECT USING (vendor_id = auth.uid());

CREATE POLICY "Super admin view all subscriptions" ON subscriptions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Super admin manage featured halls" ON featured_halls
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );
