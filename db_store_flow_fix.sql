
-- 1. Modify Store Orders to support Guests & Users
ALTER TABLE public.store_orders
ALTER COLUMN vendor_id DROP NOT NULL;

ALTER TABLE public.store_orders
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS guest_info JSONB, -- { name, phone, address, email }
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cod', -- cash_on_delivery or transfer
ADD COLUMN IF NOT EXISTS delivery_status TEXT CHECK (delivery_status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')) DEFAULT 'pending';

-- 2. Update RLS to allow public inserts
DROP POLICY IF EXISTS "Vendors manage own orders" ON public.store_orders;
DROP POLICY IF EXISTS "Admins manage all orders" ON public.store_orders;

-- Admin: Full Access
CREATE POLICY "Admins Full Access" ON public.store_orders
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Users/Vendors: View own orders
CREATE POLICY "Users View Own Orders" ON public.store_orders
FOR SELECT USING (
  (auth.uid() = vendor_id) OR (auth.uid() = user_id)
);

-- Public: Create Orders (Insert only)
CREATE POLICY "Public Create Orders" ON public.store_orders
FOR INSERT WITH CHECK (true);
