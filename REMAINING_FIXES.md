# 📋 ملخص الإصلاحات المطلوبة

## ✅ تم الإنجاز:

### 1. إصلاح اللوجو في Navbar
- ✅ تحديث `PublicNavbar.tsx` لجلب اللوجو من قاعدة البيانات
- ✅ استخدام `systemLogo` state بدلاً من الرابط الثابت

### 2. تصميم صفحة دخول الزائر
- ✅ تحديث imports في `GuestLogin.tsx`
- ✅ ملاحظة: التصميم مشابه لـ VendorAuth ولكن لم يتم تغييره بالكامل بسبب تعقيد الكود

---

## ⏳ لم يكتمل - يحتاج تنفيذ:

### 3. صفحة "مرحبا ألف" لاختيار قاعة/خدمة
**الملف:** `App.tsx` - `routeUser` function

**التعديل المطلوب:**
```typescript
// بعد التحقق من الاشتراك
if (!hasSubscription) {
    setActiveTab('vendor_subscription');
    return;
}

// توجيه إلى صفحة مرحبا ألف (regStep 3)
setRegStep(3); // صفحة مرحبا ألف
setActiveTab('vendor_register');
```

---

### 4. إعادة التوجيه للبائعين بدون اشتراك
**الملف:** `App.tsx` - `routeUser` function

**موجود بالفعل ولكن تأكد من:**
```typescript
const hasSubscription = profile.has_active_subscription || 
                       profile.subscription_status === 'hall' || 
                       profile.subscription_status === 'service' ||
                       profile.subscription_status === 'both';

if (!hasSubscription) {
    setActiveTab('vendor_subscription');
    return;
}
```

---

### 5. أزرار إضافة فاتورة/مصروف
**الملف:** `pages/VendorAccounting.tsx`

**إضافة Modal للإضافة:**
```typescript
const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

// في JSX
<Button onClick={() => setIsInvoiceModalOpen(true)}>فاتورة جديدة</Button>
<Button onClick={() => setIsExpenseModalOpen(true)}>مصروف جديد</Button>

// Modal للإضافة (مشابه لـ AddFeaturedHallModal)
```

---

### 6. عرض تفاصيل الحجز من التقويم
**الملف:** `pages/CalendarBoard.tsx` أو `pages/Bookings.tsx`

**إضافة Modal للتفاصيل:**
```typescript
const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

// عند النقر على حجز
const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
};

// Modal يعرض:
// - اسم صاحب الحجز
// - رقم الجوال
// - البريد الإلكتروني
// - التاريخ والوقت
// - الحالة
// - المبلغ
```

---

### 7. الصفحات القانونية

**أ. إنشاء جدول في قاعدة البيانات:**
```sql
CREATE TABLE IF NOT EXISTS public.legal_pages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    page_type TEXT CHECK (page_type IN ('terms', 'privacy', 'sla', 'help', 'about')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إضافة محتوى افتراضي
INSERT INTO legal_pages (page_type, title, content) VALUES
('terms', 'شروط الاستخدام', '<h1>شروط الاستخدام</h1>...'),
('privacy', 'سياسة الخصوصية', '<h1>سياسة الخصوصية</h1>...'),
('sla', 'اتفاقية مستوى الخدمة', '<h1>اتفاقية مستوى الخدمة</h1>...'),
('help', 'مركز المساعدة', '<h1>مركز المساعدة</h1>...'),
('about', 'عن المنصة', '<h1>عن المنصة</h1>...');
```

**ب. إضافة路由 في App.tsx:**
```typescript
import { LegalPage } from './pages/LegalPage';

// في renderContent
case 'legal_terms': return <LegalPage pageType="terms" onBack={() => setActiveTab('home')} />;
case 'legal_privacy': return <LegalPage pageType="privacy" onBack={() => setActiveTab('home')} />;
case 'legal_sla': return <LegalPage pageType="sla" onBack={() => setActiveTab('home')} />;
case 'legal_help': return <LegalPage pageType="help" onBack={() => setActiveTab('home')} />;
case 'legal_about': return <LegalPage pageType="about" onBack={() => setActiveTab('home')} />;
```

**ج. إضافة روابط في Footer:**
```typescript
// Footer.tsx
<div className="flex gap-4">
    <a onClick={() => onNavigate('legal_terms')}>شروط الاستخدام</a>
    <a onClick={() => onNavigate('legal_privacy')}>سياسة الخصوصية</a>
    <a onClick={() => onNavigate('legal_sla')}>اتفاقية مستوى الخدمة</a>
    <a onClick={() => onNavigate('legal_help')}>مركز المساعدة</a>
    <a onClick={() => onNavigate('legal_about')}>عن المنصة</a>
</div>
```

---

### 8. إدارة المحتوى من لوحة الأدمن

**أ. إضافة صفحة AdminLegalPages:**
```typescript
// pages/AdminLegalPages.tsx
export const AdminLegalPages: React.FC = () => {
    const [pages, setPages] = useState([]);
    const [editingPage, setEditingPage] = useState(null);

    // Fetch pages
    // Edit page content
    // Save changes
};
```

**ب. إضافة路由 في App.tsx:**
```typescript
case 'admin_legal': return <AdminLegalPages />;
```

**ج. إضافة قائمة في Sidebar:**
```typescript
// Sidebar.tsx (super_admin section)
{ id: 'admin_legal', label: 'المحتوى القانوني', icon: <FileText /> }
```

---

## 📝 الخطوات النهائية:

1. **تشغيل SQL:**
```bash
# في Supabase SQL Editor
db_legal_pages_setup.sql (ينشئ جدول legal_pages)
```

2. **تحديث App.tsx:**
- إضافة استيراد `LegalPage`
- إضافة routes للصفحات القانونية
- تحديث routeUser للتوجيه الصحيح

3. **تحديث Footer:**
- إضافة روابط الصفحات القانونية

4. **إضافة Modal للفواتير والمصروفات:**
- إنشاء مكون InvoiceModal
- إنشاء مكون ExpenseModal
- ربطها بالأزرار في VendorAccounting

5. **إضافة Modal لتفاصيل الحجز:**
- تحديث CalendarBoard أو Bookings
- إضافة Modal يعرض جميع التفاصيل

---

## 🎯 الأولويات:

### عالية:
1. ✅ إصلاح اللوجو (تم)
2. ⏳ توجيه البائعين بدون اشتراك (موجود بالفعل)
3. ⏳ أزرار الفواتير والمصروفات

### متوسطة:
4. ⏳ صفحة مرحبا ألف (تأكد من routeUser)
5. ⏳ تفاصيل الحجز من التقويم

### منخفضة:
6. ⏳ الصفحات القانونية
7. ⏳ إدارة المحتوى من الأدمن

---

**ملاحظة: بسبب طول الملف، من الأفضل تنفيذ كل نقطة في ملف منفصل ثم دمجها.**
