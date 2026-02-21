# 🔍 التحقق من مشكلة القاعات المميزة

## الخطوات:

### 1️⃣ شغّل SQL للاختبار
في Supabase SQL Editor، شغّل:
```
debug_featured_halls.sql
```

### 2️⃣ افتح Console في المتصفح
1. افتح الصفحة الرئيسية
2. اضغط F12 أو Ctrl+Shift+I
3. اذهب إلى Console
4. ابحث عن:
   - `Featured halls: [...]`
   - `Featured halls count: X`

### 3️⃣ النتائج المتوقعة:

#### ✅ إذا كان كل شيء يعمل:
```
Featured halls: [
  {
    id: "xxx",
    name: "قاعة الرياض",
    is_featured: true,
    featured_until: "2026-03-23T...",
    ...
  }
]
Featured halls count: 1
```

#### ❌ إذا كانت المشكلة من قاعدة البيانات:
```
Featured halls: []
Featured halls count: 0
```

**الحل:** شغّل SQL لإضافة قاعة مميزة

#### ❌ إذا كانت المشكلة من RLS:
```
Featured halls error: { message: "new row violates row-level security policy" }
```

**الحل:** أصلح سياسات RLS

---

## 🔧 الإصلاحات الممكنة:

### المشكلة 1: البيانات لا تُحفظ
```sql
-- تأكد من أن الجدول موجود
SELECT * FROM featured_halls;

-- إذا لم يكن موجود، شغّل:
db_vendor_subscription_fixed.sql
```

### المشكلة 2: التاريخ منتهي
```sql
-- حدّث التاريخ
UPDATE halls
SET featured_until = NOW() + INTERVAL '30 days'
WHERE is_featured = true;

UPDATE featured_halls
SET end_date = NOW() + INTERVAL '30 days'
WHERE is_active = true;
```

### المشكلة 3: is_featured = false
```sql
-- تأكد من أن القاعة مميزة
UPDATE halls
SET is_featured = true
WHERE id IN (SELECT hall_id FROM featured_halls WHERE is_active = true);
```

### المشكلة 4: RLS يمنع البيانات
```sql
-- أضف سياسة قراءة عامة للقاعات المميزة
CREATE POLICY "Anyone can view featured halls" ON halls
  FOR SELECT
  USING (is_featured = true AND is_active = true);
```

---

## 🎯 اختبار سريع:

### في المتصفح (Console):
```javascript
// 1. اختبر الاتصال
const { data, error } = await supabase
  .from('halls')
  .select('*')
  .eq('is_featured', true)
  .eq('is_active', true);

console.log('Direct query:', data);
console.log('Error:', error);

// 2. اختبر بدون فلتر التاريخ
const { data: all } = await supabase
  .from('halls')
  .select('*')
  .eq('is_featured', true);

console.log('All featured (no date filter):', all);
```

### في Supabase SQL:
```sql
-- 1. تأكد من البيانات
SELECT 
  h.id,
  h.name,
  h.is_featured,
  h.featured_until,
  h.is_active,
  fh.end_date,
  fh.is_active as fh_active
FROM halls h
LEFT JOIN featured_halls fh ON h.id = fh.hall_id
WHERE h.is_featured = true OR fh.is_active = true;

-- 2. قارن التواريخ
SELECT 
  NOW() as now,
  featured_until,
  (featured_until > NOW()) as not_expired
FROM halls
WHERE is_featured = true;
```

---

## 📋 قائمة التحقق:

- [ ] جدول `featured_halls` موجود
- [ ] جدول `halls` يحتوي على `is_featured` و `featured_until`
- [ ] هناك سجلات في `featured_halls` مع `is_active = true`
- [ ] `featured_until` > NOW() (لم ينتهي)
- [ ] `is_featured = true` في جدول halls
- [ ] `is_active = true` في جدول halls
- [ ] RLS لا يمنع القراءة
- [ ] Console يظهر `Featured halls count: X` حيث X > 0

---

## 🚨 مشاكل شائعة:

### "Featured halls count: 0"
**السبب:** لا توجد بيانات أو التاريخ منتهي  
**الحل:**
```sql
UPDATE halls SET featured_until = NOW() + INTERVAL '30 days' WHERE is_featured = true;
```

### "Featured halls: null"
**السبب:** خطأ في الاستعلام  
**الحل:** تحقق من Console للأخطاء

### القسم لا يظهر رغم وجود بيانات
**السبب:** الشرط `featuredHalls.length > 0`  
**الحل:** تأكد أن `setFeaturedHalls` يُستدعى

---

## ✅ بعد الإصلاح:

1. حدّث الصفحة (Ctrl+F5)
2. تحقق من Console
3. يجب أن ترى قسم "قاعات مميزة"
4. يجب أن تظهر 3 قاعات كحد أقصى

---

**إذا استمرت المشكلة، أرسل لي:**
1. صورة من Console
2. نتيجة `debug_featured_halls.sql`
3. هل تظهر رسالة خطأ؟
