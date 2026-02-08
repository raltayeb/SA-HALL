
-- Get Super Admin ID (Assuming one exists or will be first)
DO $$
DECLARE
    admin_id UUID;
BEGIN
    SELECT id INTO admin_id FROM public.profiles WHERE role = 'super_admin' LIMIT 1;
    
    IF admin_id IS NOT NULL THEN
        -- Add Sample Inventory
        INSERT INTO public.pos_items (vendor_id, hall_id, name, price, stock, category, image_url) VALUES
        (admin_id, admin_id, 'نظام صوتي احترافي Bose', 2500, 10, 'إضاءة وصوت', 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&q=80&w=800'),
        (admin_id, admin_id, 'طقم كنب ملكي - 12 قطعة', 15000, 5, 'كوش', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800'),
        (admin_id, admin_id, 'جهاز بخار وليزر للحفلات', 800, 20, 'إضاءة وصوت', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800'),
        (admin_id, admin_id, 'سجاد أحمر ملكي - 20 متر', 1200, 15, 'عام', 'https://images.unsplash.com/photo-1517457373958-b7bdd458ad20?auto=format&fit=crop&q=80&w=800')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
