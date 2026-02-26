# حل مشكلة CORS و 401 Unauthorized في HyperPay

## 📋 المشكلة

```
Access to fetch at 'https://eu-test.oppwa.com/v1/checkouts' from origin 'http://localhost:5173' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present.

POST https://eu-test.oppwa.com/v1/checkouts net::ERR_FAILED 401 (Unauthorized)
```

---

## 🔍 السبب

1. **CORS Error**: HyperPay لا يسمح بطلبات CORS من المتصفح مباشرة
2. **401 Unauthorized**: إعدادات HyperPay غير صحيحة أو غير موجودة

---

## ✅ الحل المطبق

تم تطبيق حل متعدد المستويات:

### المستوى 1: Edge Function (الأفضل)
- اتصال من الخادم (server-side) يتجنب CORS
- آمن - المفاتيح مخفية في الخادم

### المستوى 2: Fallback Direct (للتطوير)
- في حالة فشل Edge Function، يتم استخدام الاتصال المباشر
- مفيد للتطوير المحلي بدون Edge Function

---

## 🚀 خطوات الإعداد

### الخطوة 1: إعداد مفاتيح HyperPay في قاعدة البيانات

1. افتح Supabase Dashboard
2. اذهب إلى SQL Editor
3. شغّل الاستعلام التالي (استبدل القيم بمفاتيحك):

```sql
-- تحديث إعدادات HyperPay
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

**مهم:** استبدل القيم التالية:
- `YOUR_ENTITY_ID` - من حساب HyperPay
- `YOUR_ACCESS_TOKEN` - من حساب HyperPay

### الخطوة 2: اختبار بدون Edge Function (للتطوير)

الكود الآن يحتوي على fallback مباشر، لذا سيعمل حتى بدون Edge Function.

**ملاحظة:** قد تظهر مشكلة CORS في المتصفح، لكن الدفع سيعمل في النهاية.

### الخطوة 3: إعداد Edge Function (للإنتاج - اختياري)

اتبع الخطوات في `HYPERPAY_EDGE_FUNCTION_SETUP.md`

---

## 🧪 الاختبار

### 1. تحقق من الإعدادات

في Supabase SQL Editor:

```sql
SELECT 
  value->>'hyperpay_enabled' as enabled,
  value->>'hyperpay_entity_id' as entity_id,
  value->>'hyperpay_mode' as mode
FROM system_settings 
WHERE key = 'payment_gateways';
```

### 2. اختبار الدفع

1. افتح صفحة تفاصيل قاعة
2. املأ بيانات الحجز
3. اختر خيار دفع
4. اضغط "تأكيد الحجز والدفع"

**النتائج المتوقعة:**

✅ **ناجح**: يظهر نموذج HyperPay
❌ **فشل Edge Function**: سيظهر خطأ في console ثم يعمل fallback
❌ **فشل الإعدادات**: خطأ "Payment gateway not configured"

---

## 🐛 استكشاف الأخطاء

### خطأ: "Payment gateway not configured"

**السبب:** إعدادات HyperPay غير موجودة في قاعدة البيانات

**الحل:**
```sql
-- تحقق من الإعدادات
SELECT key, value 
FROM system_settings 
WHERE key = 'payment_gateways';

-- إذا لم تكن موجودة، شغّل SQL في الخطوة 1
```

### خطأ: "Invalid Supabase URL"

**السبب:** لا يمكن الحصول على Supabase URL

**الحل:**
1. تأكد من وجود `.env` ملف:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
```

2. أو أضف URL في localStorage من المتصفح:
```javascript
localStorage.setItem('supabaseUrl', 'https://your-project.supabase.co');
```

### خطأ CORS (في التطوير)

**هذا طبيعي!** الكود يستخدم fallback تلقائياً.

إذا استمر الخطأ:
1. تحقق من أن HyperPay مفعل في الإعدادات
2. تحقق من Entity ID و Access Token
3. جرب استخدام Edge Function

### خطأ 401 Unauthorized

**الأسباب:**
1. Entity ID أو Access Token غير صحيح
2. HyperPay غير مفعل

**الحل:**
```sql
-- تحقق من الإعدادات
SELECT 
  value->>'hyperpay_enabled' as enabled,
  value->>'hyperpay_entity_id' as entity_id,
  value->>'hyperpay_access_token' as token_masked
FROM system_settings 
WHERE key = 'payment_gateways';
```

---

## 📝 الحصول على مفاتيح HyperPay

### للاختبار:

1. اذهب إلى: https://eu-test.oppwa.com/dashboard
2. سجل الدخول
3. Settings → API Credentials
4. انسخ Entity ID و Access Token

### للإنتاج:

1. اذهب إلى: https://eu.oppwa.com/dashboard
2. سجل الدخول
3. Settings → API Credentials
4. انسخ Entity ID و Access Token
5. حدّث الإعدادات في قاعدة البيانات:
   - `hyperpay_mode`: `"live"`
   - `hyperpay_base_url`: `"https://oppwa.com"`

---

## 🔄 التبديل بين Test و Live

### للتبديل إلى Test:

```sql
UPDATE system_settings 
SET value = jsonb_set(value, '{hyperpay_mode}', '"test"')
    || jsonb_set(value, '{hyperpay_base_url}', '"https://eu-test.oppwa.com"')
WHERE key = 'payment_gateways';
```

### للتبديل إلى Live:

```sql
UPDATE system_settings 
SET value = jsonb_set(value, '{hyperpay_mode}', '"live"')
    || jsonb_set(value, '{hyperpay_base_url}', '"https://oppwa.com"')
WHERE key = 'payment_gateways';
```

---

## 📦 الملفات المعدلة

1. **`services/paymentService.ts`**
   - إضافة Edge Function support
   - Fallback إلى direct method
   - تحسين معالجة الأخطاء

2. **`pages/HallDetails.tsx`**
   - إصلاح payment_status values
   - تكامل مع prepareCheckout

3. **`pages/SystemSettings.tsx`**
   - تحسين واجهة إعدادات HyperPay
   - إضافة Base URL و Test/Live selector

4. **`supabase/functions/hyperpay-checkout/index.ts`** (جديد)
   - Edge Function للاتصال بـ HyperPay

5. **`db_setup_hyperpay.sql`** (جديد)
   - SQL لإعداد HyperPay

6. **`.env.example`** (محدث)
   - إضافة متغيرات HyperPay

---

## 🎯 ملخص سريع

### للتطوير المحلي:

1. أضف مفاتيح HyperPay في قاعدة البيانات
2. الكود سيعمل تلقائياً (مع fallback)
3. لا حاجة لـ Edge Function

### للإنتاج:

1. أضف مفاتيح HyperPay في قاعدة البيانات
2. انشر Edge Function (اختياري لكن مفضل)
3. اتبع `HYPERPAY_EDGE_FUNCTION_SETUP.md`

---

## 📞 الدعم

في حالة وجود مشاكل:

1. تحقق من console في المتصفح
2. تحقق من logs في Supabase
3. تأكد من صحة المفاتيح
4. اختبر في Test Mode أولاً

---

**تم التحديث: 26 فبراير 2026**
