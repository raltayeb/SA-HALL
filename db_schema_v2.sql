
-- 1. ENHANCE PROFILES TABLE
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT;

-- 2. ENHANCE HALLS TABLE
ALTER TABLE public.halls 
ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb; -- Ensuring images gallery column exists

-- 3. CREATE REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hall_id UUID REFERENCES public.halls(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast review lookup
CREATE INDEX IF NOT EXISTS idx_reviews_hall_id ON public.reviews(hall_id);

-- 4. ENHANCE BOOKINGS TABLE
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 5. RLS POLICIES FOR REVIEWS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Select: Everyone can see reviews
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Reviews are viewable by everyone') THEN
        CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);
    END IF;
END $$;

-- Insert: Authenticated users can review
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create reviews') THEN
        CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- Delete/Update: Only the owner
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own reviews') THEN
        CREATE POLICY "Users can manage their own reviews" ON public.reviews FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- 6. ADDITIONAL HELPER FUNCTION: Get Hall Rating
CREATE OR REPLACE FUNCTION get_hall_average_rating(hall_id_param UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (SELECT ROUND(AVG(rating)::numeric, 1) FROM public.reviews WHERE hall_id = hall_id_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
