
-- 1. Add Type column to Halls (if not exists) to distinguish between Halls, Chalets, Resorts
ALTER TABLE public.halls 
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('hall', 'chalet', 'resort', 'lounge')) DEFAULT 'hall';

-- 2. Create Orders Table for Platform Store (Vendors buying from Admin)
CREATE TABLE IF NOT EXISTS public.store_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- The buyer
  items JSONB DEFAULT '[]'::jsonb,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS Policies for POS Items (Allow public/vendors to see Admin products)
-- First, drop existing restrictive policy if strictly scoped to vendor_id
DROP POLICY IF EXISTS "Vendor POS Access" ON public.pos_items;

-- Allow Vendors to manage their own items (if any legacy), AND see Admin items
CREATE POLICY "Vendor Manage Own Items" ON public.pos_items 
FOR ALL USING (auth.uid() = vendor_id);

CREATE POLICY "Read Admin Items" ON public.pos_items 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = pos_items.vendor_id AND role = 'super_admin')
);

-- 4. RLS for Store Orders
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors manage own orders" ON public.store_orders FOR ALL USING (auth.uid() = vendor_id);
CREATE POLICY "Admins manage all orders" ON public.store_orders FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
