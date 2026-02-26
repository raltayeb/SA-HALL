# إعداد HyperPay Edge Function - حل مشكلة CORS

## المشكلة
عند محاولة الاتصال بـ HyperPay مباشرة من المتصفح، تظهر مشكلة CORS وخطأ 401 Unauthorized.

**السبب:**
- HyperPay لا يسمح بطلبات CORS من المتصفح مباشرة
- الاتصال يجب أن يتم من الخادم (server-side)

---

## الحل: استخدام Supabase Edge Functions

تم إنشاء Edge Function للاتصال بـ HyperPay من الخادم بدلاً من المتصفح.

---

## 📋 خطوات الإعداد

### 1. تثبيت Supabase CLI

```bash
npm install -g supabase
```

### 2. تسجيل الدخول إلى Supabase

```bash
supabase login
```

### 3. ربط المشروع

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

يمكنك إيجاد Project Ref في إعدادات المشروع في Supabase Dashboard.

### 4. نشر Edge Function

```bash
supabase functions deploy hyperpay-checkout
```

### 5. إعداد مفاتيح HyperPay في قاعدة البيانات

قم بتشغيل ملف SQL التالي في Supabase SQL Editor:

```sql
-- تحديث إعدادات HyperPay
-- استبدل القيم بمفاتيحك الحقيقية من HyperPay

INSERT INTO system_settings (key, value, created_at, updated_at)
VALUES (
  'payment_gateways',
  '{
    "visa_enabled": true,
    "cash_enabled": true,
    "hyperpay_enabled": true,
    "hyperpay_entity_id": "YOUR_ENTITY_ID",
    "hyperpay_access_token": "YOUR_ACCESS_TOKEN",
    "hyperpay_base_url": "https://eu-test.oppwa.com",
    "hyperpay_mode": "test"
  }'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (key) 
DO UPDATE SET 
  value = '{
    "visa_enabled": true,
    "cash_enabled": true,
    "hyperpay_enabled": true,
    "hyperpay_entity_id": "YOUR_ENTITY_ID",
    "hyperpay_access_token": "YOUR_ACCESS_TOKEN",
    "hyperpay_base_url": "https://eu-test.oppwa.com",
    "hyperpay_mode": "test"
  }'::jsonb,
  updated_at = NOW();
```

**مهم:** استبدل القيم التالية بمفاتيحك الحقيقية:
- `YOUR_ENTITY_ID` - Entity ID من حساب HyperPay
- `YOUR_ACCESS_TOKEN` - Access Token من حساب HyperPay

---

## 🧪 اختبار Edge Function

### اختبار محلي:

```bash
supabase functions serve hyperpay-checkout
```

ثم أرسل طلب اختبار:

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/hyperpay-checkout' \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --data-raw '{
    "amount": 100,
    "merchantTransactionId": "TEST_001",
    "customerEmail": "test@example.com",
    "givenName": "Test",
    "surname": "User",
    "billingCity": "Riyadh",
    "billingCountry": "SA"
  }
```

### اختبار في الإنتاج:

استخدم نفس الطلب مع URL المشروع:

```bash
curl -i --location --request POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/hyperpay-checkout' \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --data-raw '{
    "amount": 100,
    "merchantTransactionId": "TEST_001"
  }'
```

---

## 🔧 استكشاف الأخطاء

### خطأ 401 Unauthorized

**الأسباب المحتملة:**
1. Entity ID أو Access Token غير صحيح
2. إعدادات HyperPay غير موجودة في قاعدة البيانات
3. HyperPay غير مفعل في الإعدادات

**الحل:**
```sql
-- تحقق من الإعدادات
SELECT key, value 
FROM system_settings 
WHERE key = 'payment_gateways';

-- تأكد من أن hyperpay_enabled = true
-- وتأكد من وجود entity_id و access_token
```

### خطأ CORS

**السبب:**
- Edge Function غير مثبت أو غير منشور

**الحل:**
```bash
# تأكد من نشر Edge Function
supabase functions deploy hyperpay-checkout

# تحقق من أن Edge Function تعمل
curl https://YOUR_PROJECT_REF.supabase.co/functions/v1/hyperpay-checkout
```

### خطأ Network Error

**الأسباب المحتملة:**
1. Supabase URL غير صحيح
2. مشكلة في الاتصال بالإنترنت

**الحل:**
```typescript
// تحقق من Supabase URL في الكود
console.log('Supabase URL:', supabase.supabaseUrl);
```

---

## 📝 الحصول على مفاتيح HyperPay

### للاختبار (Test Mode):

1. سجل دخول في [HyperPay Test Dashboard](https://eu-test.oppwa.com/dashboard)
2. اذهب إلى Settings → API Credentials
3. انسخ Entity ID و Access Token

### للإنتاج (Live Mode):

1. سجل دخول في [HyperPay Live Dashboard](https://eu.oppwa.com/dashboard)
2. اذهب إلى Settings → API Credentials
3. انسخ Entity ID و Access Token
4. حدّث الإعدادات:
   - `hyperpay_mode`: `"live"`
   - `hyperpay_base_url`: `"https://oppwa.com"`

---

## 🚀 التحديثات المستقبلية

للحفاظ على Edge Function محدثة:

```bash
# تحديث Edge Function بعد التعديل
supabase functions deploy hyperpay-checkout

# عرض logs
supabase functions logs hyperpay-checkout
```

---

## 📞 الدعم

في حالة وجود مشاكل:

1. تحقق من logs:
   ```bash
   supabase functions logs hyperpay-checkout --verbose
   ```

2. تحقق من إعدادات قاعدة البيانات:
   ```sql
   SELECT * FROM system_settings WHERE key = 'payment_gateways';
   ```

3. تأكد من أن Edge Function تعمل:
   ```bash
   curl https://YOUR_PROJECT_REF.supabase.co/functions/v1/hyperpay-checkout
   ```

---

**تم التحديث: 26 فبراير 2026**
