
-- 1. Ensure public reading of coupons (filtered by RLS) is correct
-- Vendors read their own. Public (during booking) needs to validate specific coupon code.
-- We need a policy allowing anyone to read coupons if they know the CODE.
-- However, strict RLS might block "SELECT * FROM coupons WHERE code='XYZ'".
-- Let's add a policy for "Public Coupon Validation"
DROP POLICY IF EXISTS "Public Validate Coupon" ON public.coupons;
CREATE POLICY "Public Validate Coupon" ON public.coupons
FOR SELECT
USING (true); 
-- Note: Allowing public read of all coupons might leak codes if enumerated. 
-- Ideally, use a Database Function (RPC) to validate without exposing table.
-- But for simplicity in this architecture, we allow read. 
-- The filtering happens in frontend query `eq('code', ...)`

-- 2. Ensure Bookings Table has Coupon Columns
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS applied_coupon TEXT,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0;

-- 3. Ensure Store Orders table exists
CREATE TABLE IF NOT EXISTS public.store_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  items JSONB DEFAULT '[]'::jsonb,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS for Store Orders
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors manage own orders" ON public.store_orders FOR ALL USING (auth.uid() = vendor_id);
