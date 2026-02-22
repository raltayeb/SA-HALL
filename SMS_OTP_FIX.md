# 🔧 SMS OTP Fix - "Failed to fetch" Error

## ❌ Problem:
When entering phone number `0545495924` and clicking "إرسال رمز التحقق SMS", getting "Failed to fetch" error.

## 🔍 Root Causes:

### 1. CORS Issue
The Infinito API doesn't allow CORS from browser.

### 2. Phone Formatting
Phone number needs to be in international format (966...).

### 3. Network Error
API might be unreachable or token expired.

---

## ✅ Fixes Applied:

### 1. Enable CORS Proxy
```typescript
const SMS_CONFIG = {
  useProxy: true,
  proxyURL: 'https://corsproxy.io/?'
};
```

**Now requests go through:**
```
https://corsproxy.io/?https://api.goinfinito.me/unified/v2/send
```

### 2. Better Phone Formatting
```typescript
let formattedPhone = phone;
if (phone.startsWith('0')) {
  formattedPhone = '966' + phone.substring(1);
} else if (!phone.startsWith('966')) {
  formattedPhone = '966' + phone;
}
```

**Examples:**
- `0545495924` → `966545495924`
- `545495924` → `966545495924`
- `966545495924` → `966545495924`

### 3. Fallback to Email
If SMS fails, automatically tries to send via email:
```typescript
if (!smsResult.success) {
  // Find email from bookings
  const { data } = await supabase
    .from('bookings')
    .select('guest_email')
    .eq('guest_phone', normalizedPhone)
    .maybeSingle();

  if (data?.guest_email) {
    // Send via email instead
    await supabase.auth.signInWithOtp({ email: data.guest_email });
  }
}
```

### 4. Better Error Messages
```typescript
if (error.message.includes('Failed to fetch')) {
  return {
    success: false,
    error: 'خطأ في الاتصال. يرجى التحقق من الاتصال بالإنترنت أو استخدام البريد الإلكتروني بدلاً من ذلك.'
  };
}
```

### 5. Detailed Logging
```typescript
console.log('📱 Sending SMS to:', formattedPhone);
console.log('📝 Message:', message);
console.log('📦 Request body:', JSON.stringify(requestBody));
console.log('🔗 Request URL:', url);
console.log('📡 Response status:', response.status);
console.log('✅ Response data:', data);
```

---

## 🧪 Testing:

### Open Browser Console (F12)
You should see:
```
📱 Sending SMS to: 966545495924
📝 Message: رمز التحقق الخاص بك هو: 123456
صالح لمدة 5 دقائق
📦 Request body: {...}
🔗 Request URL: https://corsproxy.io/?...
📡 Response status: 200
📡 Response OK: true
✅ Response data: {...}
```

### If SMS Fails:
```
❌ SMS API Error: ...
SMS failed, falling back to email lookup
تم إرسال رمز التحقق إلى بريدك الإلكتروني user@example.com
```

---

## 🎯 Current Flow:

### SMS Method (Primary):
```
1. Enter phone: 0545495924
2. Format to: 966545495924
3. Generate OTP: 123456
4. Send via Infinito API (through CORS proxy)
5. If success → Store OTP, show verification screen
6. If failed → Fallback to email
```

### Email Fallback:
```
1. Search bookings for phone
2. Find associated email
3. Send OTP via Supabase email
4. Show success message with email
```

---

## 🔧 Troubleshooting:

### Still Getting "Failed to fetch"?

**Check Console for:**
1. ❌ CORS error → Proxy is working, issue is API
2. ❌ 401 Unauthorized → Token expired
3. ❌ 404 Not Found → Wrong URL
4. ❌ Network error → API down

**Solutions:**

### 1. Check Token
```bash
curl -X POST 'https://api.goinfinito.me/unified/v2/send' \
  -H 'Authorization: eyJhbGciOiJIUzI1NiJ9...' \
  -H 'Content-Type: application/json' \
  -d '{...}'
```

### 2. Use Alternative Proxy
```typescript
proxyURL: 'https://api.allorigins.win/raw?url='
```

### 3. Backend Proxy
Create Supabase Edge Function to send SMS from server.

---

## 📝 Current Status:

- ✅ CORS proxy enabled
- ✅ Phone formatting fixed
- ✅ Email fallback added
- ✅ Better error messages
- ✅ Detailed logging
- ✅ Better error handling

**Try again and check browser console for detailed logs!**
