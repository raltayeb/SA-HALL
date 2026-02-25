-- Create or Update Coupons Table
-- Run this in Supabase SQL Editor

-- Create table if not exists
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')) NOT NULL,
  discount_value DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN 
  -- Add min_purchase column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'coupons' 
      AND column_name = 'min_purchase'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN min_purchase DECIMAL(10, 2) DEFAULT 0;
  END IF;

  -- Add max_discount column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'coupons' 
      AND column_name = 'max_discount'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN max_discount DECIMAL(10, 2);
  END IF;

  -- Add usage_limit column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'coupons' 
      AND column_name = 'usage_limit'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN usage_limit INTEGER;
  END IF;

  -- Add usage_count column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'coupons' 
      AND column_name = 'usage_count'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN usage_count INTEGER DEFAULT 0;
  END IF;

  -- Add start_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'coupons' 
      AND column_name = 'start_date'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN start_date TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Add end_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'coupons' 
      AND column_name = 'end_date'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN end_date TIMESTAMPTZ;
  END IF;

  -- Add is_active column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'coupons' 
      AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;

  -- Add applicable_to column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'coupons' 
      AND column_name = 'applicable_to'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN applicable_to TEXT CHECK (applicable_to IN ('all', 'halls', 'services')) DEFAULT 'all';
  END IF;

  -- Add created_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'coupons' 
      AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN created_by UUID REFERENCES public.profiles(id);
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_dates ON public.coupons(start_date, end_date);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "super_admins_all_access_coupons" ON public.coupons;
DROP POLICY IF EXISTS "everyone_view_active_coupons" ON public.coupons;
DROP POLICY IF EXISTS "vendors_view_own_coupons" ON public.coupons;
DROP POLICY IF EXISTS "vendors_create_coupons" ON public.coupons;
DROP POLICY IF EXISTS "vendors_update_own_coupons" ON public.coupons;

-- Create policies
CREATE POLICY "super_admins_all_access_coupons" ON public.coupons
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

CREATE POLICY "vendors_view_own_coupons" ON public.coupons
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'vendor'
  )
  AND is_active = true
  AND (end_date IS NULL OR end_date > NOW())
);

CREATE POLICY "vendors_create_coupons" ON public.coupons
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'super_admin' OR profiles.role = 'vendor')
  )
);

CREATE POLICY "vendors_update_own_coupons" ON public.coupons
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'super_admin' OR profiles.role = 'vendor')
  )
);

-- Create trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS update_coupons_updated_at ON public.coupons;
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.coupons IS 'Discount coupons for halls and services subscriptions';
COMMENT ON COLUMN public.coupons.discount_type IS 'percentage: % discount, fixed: fixed amount';
COMMENT ON COLUMN public.coupons.discount_value IS 'Discount value (percentage or fixed amount)';
COMMENT ON COLUMN public.coupons.min_purchase IS 'Minimum purchase amount to use coupon';
COMMENT ON COLUMN public.coupons.max_discount IS 'Maximum discount cap (for percentage discounts)';
COMMENT ON COLUMN public.coupons.usage_limit IS 'Maximum number of times coupon can be used (NULL = unlimited)';
COMMENT ON COLUMN public.coupons.usage_count IS 'Current usage count';
COMMENT ON COLUMN public.coupons.applicable_to IS 'all: both halls and services, halls: only halls, services: only services';
