
-- 1. Add Category to POS Items
ALTER TABLE public.pos_items 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'عام',
ADD COLUMN IF NOT EXISTS barcode TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Index for barcode scanning speed
CREATE INDEX IF NOT EXISTS idx_pos_items_barcode ON public.pos_items(barcode);

-- 2. Add POS Configuration to Vendor Profile
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pos_config JSONB DEFAULT '{
  "tax_rate": 15,
  "tax_id": "",
  "receipt_header": "",
  "receipt_footer": "شكراً لزيارتكم",
  "printer_width": "80mm",
  "auto_print": false
}'::jsonb;

-- 3. Trigger to auto-create category list (Optional, handled in app logic usually)
