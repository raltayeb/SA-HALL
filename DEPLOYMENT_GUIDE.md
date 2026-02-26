# دليل النشر على Dokploy

## المشكلة

Dokploy يحاول بناء التطبيق باستخدام **Deno** بدلاً من **Node.js/Vite** بسبب:
1. وجود ملف `index.tsx` في المجلد الرئيسي
2. وجود مجلد `supabase-edge-functions`

## الحل

تم إنشاء الملفات التالية لإجبار Dokploy على استخدام Dockerfile:

### 1. `Dockerfile`
ملف Docker الرسمي لبناء التطبيق باستخدام Node.js + Vite

### 2. `.dockerignore`
يتجاهل الملفات غير الضرورية للبناء

### 3. `dokploy.yml`
ملف إعدادات Dokploy لتحديد طريقة البناء

---

## خطوات النشر على Dokploy

### الطريقة 1: استخدام Dockerfile (مفضل)

1. في لوحة تحكم Dokploy:
   - اذهب إلى التطبيق
   - Settings → Source
   - اختر **Dockerfile**

2. في قسم Build:
   - Dockerfile Path: `Dockerfile`
   - Build Context: `.`

3. في قسم Environment Variables:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   NODE_ENV=production
   ```

4. اضغط **Deploy**

### الطريقة 2: استخدام Docker Compose

1. في Dokploy، اختر **Docker Compose** كمصدر

2. الصق محتوى `dokploy.yml`:
   ```yaml
   version: '3.8'
   services:
     sa-hall:
       build:
         context: .
         dockerfile: Dockerfile
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
         - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
         - VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
   ```

3. أضف متغيرات البيئة:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

4. اضغط **Deploy**

---

## اختبار البناء محلياً

### بناء Docker image:

```bash
docker build -t sa-hall .
```

### تشغيل محلياً:

```bash
docker run -p 3000:3000 sa-hall
```

### فتح في المتصفح:

```
http://localhost:3000
```

---

## استكشاف الأخطاء

### خطأ: "Module not found"

**السبب:** Dokploy يستخدم Deno بدلاً من Node.js

**الحل:**
1. تأكد من اختيار **Dockerfile** كمصدر في Dokploy
2. أو استخدم `dokploy.yml`

### خطأ: "Environment variables not defined"

**الحل:**
1. اذهب إلى Settings → Environment Variables
2. أضف:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### خطأ: "Build failed"

**الحل:**
1. تحقق من logs في Dokploy
2. تأكد من أن `package.json` صحيح
3. جرب البناء محلياً: `docker build -t sa-hall .`

---

## ملاحظات هامة

1. **المنفذ:** التطبيق يعمل على المنفذ 3000
2. **البيئة:** Production build يستخدم Vite
3. **التبعيات:** يتم تثبيتها تلقائياً عبر `npm ci`
4. **البناء:** يتم عبر `npm run build`
5. **التشغيل:** يتم عبر `serve -s dist`

---

## تحديث التطبيق

بعد كل push إلى GitHub:

1. في Dokploy، اضغط **Deploy**
2. انتظر حتى يكتمل البناء
3. تحقق من Health Check
4. افتح التطبيق في المتصفح

---

## HyperPay Edge Functions

إذا كنت تريد استخدام Edge Functions لـ HyperPay:

1. انشر Edge Functions بشكل منفصل:
   ```bash
   cd supabase-edge-functions
   supabase functions deploy hyperpay-checkout
   ```

2. أو احذف المجلد إذا لم تكن تحتاجه:
   ```bash
   rm -rf supabase-edge-functions
   ```

**ملاحظة:** الكود يعمل بدون Edge Functions باستخدام fallback direct method.

---

## الملفات المهمة

- `Dockerfile` - Docker build configuration
- `.dockerignore` - Files to ignore in Docker build
- `dokploy.yml` - Dokploy deployment configuration
- `package.json` - Node.js dependencies
- `vite.config.ts` - Vite build configuration

---

**آخر تحديث:** 26 فبراير 2026
