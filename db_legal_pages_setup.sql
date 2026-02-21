-- ============================================
-- Legal Pages Table Setup
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create legal_pages table
CREATE TABLE IF NOT EXISTS public.legal_pages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    page_type TEXT CHECK (page_type IN ('terms', 'privacy', 'sla', 'help', 'about')) UNIQUE NOT NULL,
    title_ar TEXT NOT NULL,
    title_en TEXT,
    content_ar TEXT NOT NULL,
    content_en TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insert default content
INSERT INTO legal_pages (page_type, title_ar, content_ar) VALUES
('terms', 'شروط الاستخدام', '
<h1>شروط الاستخدام</h1>

<h2>1. قبول الشروط</h2>
<p>باستخدامك لمنصة "القاعة"، فإنك توافق على الالتزام بهذه الشروط والأحكام.</p>

<h2>2. تعريف المنصة</h2>
<p>منصة "القاعة" هي منصة إلكترونية تربط بين أصحاب القاعات والخدمات والعملاء.</p>

<h2>3. الاشتراكات</h2>
<p>الاشتراك في المنصة يكون لمدة غير محددة (مدى الحياة) بعد دفع الرسوم لمرة واحدة.</p>
<ul>
<li>القاعات: 500 ر.س</li>
<li>الخدمات: 200 ر.س</li>
</ul>

<h2>4. المسؤوليات</h2>
<p>المنصة غير مسؤولة عن أي نزاعات بين العملاء ومقدمي الخدمات.</p>

<h2>5. التعديلات</h2>
<p>يحق للإدارة تعديل الشروط في أي وقت مع إشعار المستخدمين.</p>

<h2>6. الخصوصية</h2>
<p>نلتزم بحماية خصوصيتك وفقاً لسياسة الخصوصية المعلنة.</p>
'),

('privacy', 'سياسة الخصوصية', '
<h1>سياسة الخصوصية</h1>

<h2>1. جمع البيانات</h2>
<p>نجمع البيانات الشخصية اللازمة لتقديم الخدمة مثل الاسم والبريد الإلكتروني ورقم الجوال.</p>

<h2>2. استخدام البيانات</h2>
<p>تُستخدم البيانات للتواصل معك وإتمام الحجوزات وتحسين الخدمة.</p>

<h2>3. حماية البيانات</h2>
<p>نتخذ جميع الإجراءات الأمنية اللازمة لحماية بياناتك الشخصية.</p>

<h2>4. مشاركة البيانات</h2>
<p>لا نشارك بياناتك مع أطراف ثالثة إلا بموافقتك أو للضرورة القانونية.</p>

<h2>5. حقوقك</h2>
<p>لك الحق في الوصول إلى بياناتك أو تصحيحها أو حذفها في أي وقت.</p>

<h2>6. ملفات تعريف الارتباط</h2>
<p>نستخدم ملفات تعريف الارتباط لتحسين تجربة المستخدم.</p>
'),

('sla', 'اتفاقية مستوى الخدمة', '
<h1>اتفاقية مستوى الخدمة (SLA)</h1>

<h2>1. نسبة التوفر</h2>
<p>نلتزم بتوفر المنصة بنسبة 99% خلال الشهر.</p>

<h2>2. وقت الاستجابة</h2>
<p>نلتزم بالرد على الاستفسارات خلال 24 ساعة عمل.</p>

<h2>3. الصيانة</h2>
<p>يتم إشعار المستخدمين قبل أي صيانة مجدولة بـ 48 ساعة على الأقل.</p>

<h2>4. التعويضات</h2>
<p>في حال انخفاض التوفر عن 99%، يتم تعويض المشتركين بتمديد فترة الاشتراك.</p>

<h2>5. الدعم الفني</h2>
<p>يتوفر الدعم الفني عبر البريد الإلكتروني وواتساب خلال ساعات العمل.</p>

<h2>6. وقت التشغيل</h2>
<p>المنصة تعمل 24/7 مع استثناء فترات الصيانة المجدولة.</p>
'),

('help', 'مركز المساعدة', '
<h1>مركز المساعدة</h1>

<h2>الأسئلة الشائعة</h2>

<h3>كيف أسجل في المنصة؟</h3>
<p>اضغط على "بوابة الأعمال" ثم "انضم كشريك الآن" واتبع الخطوات.</p>

<h3>ما هي رسوم الاشتراك؟</h3>
<p>القاعات: 500 ر.س | الخدمات: 200 ر.س (لمرة واحدة مدى الحياة)</p>

<h3>كيف أضيف قاعة جديدة؟</h3>
<p>بعد الاشتراك، ستوجه إلى صفحة إضافة القاعة لملء البيانات.</p>

<h3>كيف أحجز قاعة؟</h3>
<p>تصفح القاعات في الصفحة الرئيسية، اختر القاعة، ثم احجز التاريخ المطلوب.</p>

<h3>كيف أدفع؟</h3>
<p>نقبل الدفع بالبطاقات الائتمانية عبر بوابات دفع آمنة.</p>

<h2>تواصل معنا</h2>
<p>البريد: support@hall.sa | واتساب: 966500000000+</p>
'),

('about', 'عن المنصة', '
<h1>عن المنصة</h1>

<h2>من نحن</h2>
<p>"القاعة" هي منصة سعودية متخصصة في حجز القاعات والخدمات للمناسبات.</p>

<h2>رؤيتنا</h2>
<p>أن نكون المنصة الأولى في المملكة لحجز مناسباتك.</p>

<h2>رسالتنا</h2>
<p>تسهيل عملية حجز القاعات والخدمات بجودة عالية وأسعار منافسة.</p>

<h2>قيمنا</h2>
<ul>
<li>الجودة والتميز</li>
<li>الشفافية والثقة</li>
<li>الابتكار المستمر</li>
<li>رضا العملاء</li>
</ul>

<h2>تواصل معنا</h2>
<p>البريد: info@hall.sa</p>
')
)
ON CONFLICT (page_type) DO NOTHING;

-- 3. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_legal_pages_type ON legal_pages(page_type);
CREATE INDEX IF NOT EXISTS idx_legal_pages_active ON legal_pages(is_active);

-- 4. Enable RLS
ALTER TABLE legal_pages ENABLE ROW LEVEL SECURITY;

-- 5. Create policies
DROP POLICY IF EXISTS "Anyone can view active legal pages" ON legal_pages;
CREATE POLICY "Anyone can view active legal pages" ON legal_pages
    FOR SELECT
    USING (is_active = true);

DROP POLICY IF EXISTS "Super admin can manage legal pages" ON legal_pages;
CREATE POLICY "Super admin can manage legal pages" ON legal_pages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'super_admin'
        )
    );

-- 6. Verify
SELECT page_type, title_ar, is_active FROM legal_pages;
