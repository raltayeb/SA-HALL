
-- 1. Create Upgrade Requests Table
CREATE TABLE IF NOT EXISTS public.upgrade_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  request_type TEXT CHECK (request_type IN ('hall', 'service')) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS Policies
ALTER TABLE public.upgrade_requests ENABLE ROW LEVEL SECURITY;

-- Vendors can view and create their own requests
CREATE POLICY "Vendors manage own requests" ON public.upgrade_requests
FOR ALL USING (auth.uid() = vendor_id);

-- Admins can view and update all requests
CREATE POLICY "Admins manage all requests" ON public.upgrade_requests
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
