# تعليمات تنفيذ ملف SQL

## لتنفيذ ملف قاعدة البيانات في Supabase:

### الطريقة 1: عبر واجهة Supabase (موصى به)

1. اذهب إلى [Supabase Dashboard](https://supabase.com/dashboard)
2. اختر مشروعك
3. انتقل إلى **SQL Editor** من القائمة الجانبية
4. انقر على **New Query**
5. انسخ محتويات ملف `db_vendor_subscription.sql` والصقها
6. انقر على **Run** لتنفيذ الاستعلام

### الطريقة 2: عبر Supabase CLI

```bash
# تثبيت Supabase CLI إذا لم يكن مثبتاً
npm install -g supabase

# تسجيل الدخول
supabase login

# ربط المشروع
supabase link --project-ref YOUR_PROJECT_REF

# تنفيذ الملف
supabase db execute --file db_vendor_subscription.sql
```

### الطريقة 3: عبر psql مباشرة

```bash
psql -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -f db_vendor_subscription.sql
```

---

## الجداول التي سيتم إنشاؤها:

### 1. **subscriptions** - تتبع اشتراكات البائعين
- `vendor_id`: معرف البائع
- `subscription_type`: نوع الاشتراك (hall/service/both)
- `amount`: المبلغ المدفوع
- `is_lifetime`: هل هو اشتراك مدى الحياة
- `payment_status`: حالة الدفع

### 2. **invoices** - الفواتير الضريبية
- `invoice_number`: رقم الفاتورة الفريد
- `customer_name`: اسم العميل
- `subtotal`: المجموع الفرعي
- `vat_amount`: ضريبة القيمة المضافة (15%)
- `total_amount`: الإجمالي الكلي

### 3. **expenses** - المصروفات
- `supplier_name`: اسم المورد
- `category`: التصنيف (rent/salaries/utilities/etc)
- `amount`: المبلغ
- `vat_amount`: ضريبة القيمة المضافة المدفوعة

### 4. **zakat_calculations** - حسابات الزكاة
- `calculation_period_start`: بداية الفترة
- `calculation_period_end`: نهاية الفترة
- `total_revenue`: إجمالي الإيرادات
- `total_expenses`: إجمالي المصروفات
- `zakat_amount`: مبلغ الزكاة (2.5%)
- `vat_payable`: صافي الضريبة المستحقة

### 5. **featured_halls** - القاعات المميزة
- `hall_id`: معرف القاعة
- `start_date`: تاريخ البدء
- `end_date`: تاريخ الانتهاء
- `is_active`: هل هي نشطة

### التعديلات على الجداول الموجودة:

#### user_profiles:
- `subscription_status`: حالة الاشتراك
- `subscription_paid_at`: تاريخ دفع الاشتراك
- `subscription_amount`: مبلغ الاشتراك
- `has_active_subscription`: هل لديه اشتراك نشط

#### halls:
- `is_featured`: هل القاعة مميزة
- `featured_until`: تنتهي في

---

## بعد التنفيذ:

1. **تحديث Policy RLS**: تمكين البائعين من رؤية بياناتهم فقط
2. **اختبار الاشتراك**: تسجيل بائع جديد والتحقق من التوجيه
3. **اختبار القاعات المميزة**: إضافة قاعة مميزة من لوحة السوبر أدمن
4. **اختبار الفواتير**: إنشاء فاتورة والتحقق من حساب الضريبة

---

## ملاحظات هامة:

- ✅ جميع الجداول تدعم RLS (Row Level Security)
- ✅ الاشتراكات مدى الحياة تلقائياً
- ✅ انتهاء تلقائي للقاعات المميزة
- ✅ متوافق مع هيئة الزكاة والضريبة السعودية
- ✅ ضريبة القيمة المضافة 15%
- ✅ الزكاة 2.5% من صافي الدخل
