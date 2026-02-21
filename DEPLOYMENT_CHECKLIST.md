# 🚀 Deployment Checklist - SA-HALL

## ✅ Pre-Deployment:

### 1. Environment Variables
- [x] `.env` file created with VITE_ prefix
- [x] `.env.example` template created
- [x] `.env` added to `.gitignore`
- [x] SupabaseClient.ts uses environment variables

### 2. Security
- [x] No hardcoded credentials
- [x] RLS policies on all tables
- [x] `.env` not committed to git
- [x] API keys secured

### 3. Database
- [ ] Run `db_vendor_subscription_fixed.sql` in Supabase
- [ ] Verify all tables exist
- [ ] Test RLS policies
- [ ] Backup database

### 4. Code Quality
- [x] TypeScript compilation passes
- [ ] All features tested locally
- [ ] No console errors
- [ ] Performance optimized

---

## 📦 Deployment Steps:

### Step 1: Clean and Build
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Test build
npm run build

# Verify no errors
npm run preview
```

### Step 2: Git Commit
```bash
git add .
git commit -m "chore: secure deployment with env variables"
git push origin main
```

### Step 3: Dokploy Deployment
1. Go to Dokploy Dashboard
2. Select your application
3. Click **Redeploy**
4. Wait for build to complete
5. Check logs for errors

### Step 4: Post-Deployment Testing
- [ ] Homepage loads
- [ ] Featured halls section appears
- [ ] Login/Registration works
- [ ] Vendor dashboard accessible
- [ ] Database queries work
- [ ] Images load correctly
- [ ] No console errors

---

## 🔧 Troubleshooting:

### Build Fails with `npm ci` Error:
```bash
# Fix: Regenerate package-lock.json
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "fix: sync package-lock.json"
git push origin main
```

### Environment Variables Not Working:
```bash
# Check .env file format
cat .env

# Should be:
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...

# NOT:
# NEXT_PUBLIC_SUPABASE_URL=...
```

### Database Connection Fails:
```sql
-- Verify Supabase URL and Key
SELECT current_setting('app.settings');

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'halls';
```

---

## 📊 Performance Optimization:

### 1. Bundle Size
```bash
# Analyze bundle
npm install -g source-map-explorer
source-map-explorer dist/assets/*.js
```

### 2. Image Optimization
- Use WebP format
- Compress with TinyPNG
- Lazy load images

### 3. Code Splitting
```typescript
// Lazy load heavy components
const VendorHalls = lazy(() => import('./pages/VendorHalls'));
```

### 4. Caching
- Enable CDN caching
- Use service workers
- Cache API responses

---

## 🔒 Security Hardening:

### 1. Headers (Vite Config)
```typescript
export default {
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    }
  }
}
```

### 2. Rate Limiting
- Enable Supabase rate limiting
- Add Edge Function for API limits
- Monitor usage

### 3. Monitoring
- Enable error logging
- Set up alerts
- Monitor database queries

---

## 📝 Files to Keep:

### Essential:
- ✅ `.env` (not committed)
- ✅ `.env.example`
- ✅ `supabaseClient.ts`
- ✅ `vite-env.d.ts`
- ✅ `SECURITY.md`
- ✅ `CLEANUP_GUIDE.md`

### Database:
- ✅ `db_vendor_subscription_fixed.sql`
- ✅ `add_featured_hall.sql`

### Safe to Remove:
- ❌ Old `db_*.sql` files (see CLEANUP_GUIDE.md)
- ❌ Debug files (`debug_*.sql`, `test_*.sql`)
- ❌ Old documentation (optional)

---

## 🎯 Post-Deployment Monitoring:

### Day 1:
- [ ] Check error logs
- [ ] Monitor database usage
- [ ] Test all critical paths
- [ ] Verify SSL/HTTPS

### Week 1:
- [ ] Review performance metrics
- [ ] Check user feedback
- [ ] Monitor error rates
- [ ] Optimize slow queries

### Ongoing:
- [ ] Weekly security updates
- [ ] Monthly dependency updates
- [ ] Quarterly security audit
- [ ] Regular backups

---

## 📞 Support:

If you encounter issues:
1. Check logs in Dokploy
2. Review error messages
3. Test locally first
4. Check Supabase dashboard
5. Review RLS policies

---

**Good luck with your deployment! 🚀**
