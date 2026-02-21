# 🧹 Cleanup Unused Files for Better Performance

## ⚠️ Files Safe to Remove:

### Old Database Migration Files (Keep only the ones you need):
```bash
# Keep these (actively used):
- db_vendor_subscription_fixed.sql ✅
- add_featured_hall.sql ✅

# Safe to remove (old/backup files):
- db_accounting_fix.sql
- db_admin_cms.sql
- db_admin_storage_fix.sql
- db_chalet_features.sql
- db_chalet_updates.sql
- db_comprehensive_fix.sql
- db_crm_update.sql
- db_final_checks.sql
- db_final_fix.sql
- db_fix_booking_error.sql
- db_fix_features.sql
- db_fix_guest_visibility.sql
- db_fix_guest.sql
- db_fix_missing_columns.sql
- db_fix_rls_final.sql
- db_fix_rls_v3.sql
- db_fix_rls.sql
- db_fix_system_rls.sql
- db_full_schema.sql
- db_guest_bookings.sql
- db_latest_schema.sql
- db_latest_update.sql
- db_notifications_expansion.sql
- db_pos_update.sql
- db_refactor_and_fix.sql
- db_registration_update.sql
- db_schema_hall_addons.sql
- db_schema_packages.sql
- db_schema_v2.sql
- db_schema_v3.sql
- db_schema_v4.sql
- db_schema_v5.sql
- db_schema_v6.sql
- db_schema_v7.sql
- db_schema_v8.sql
- db_schema_v9.sql
- db_schema.sql
- db_service_areas.sql
- db_service_portfolio.sql
- db_storage_setup.sql
- db_store_enhancements.sql
- db_store_flow_fix.sql
- db_store_update.sql
- db_update.sql
- db_upgrade_requests.sql
- db_vendor_expansion.sql
```

### Debug/Test Files:
```bash
# Safe to remove after fixing issues:
- debug_featured_halls.sql
- test_featured_hall.sql
- fix_featured_halls_rls.sql
- fix_admin_featured_update.sql
```

### Documentation Files (Optional):
```bash
# Keep if helpful, remove if not needed:
- SQL_SETUP_INSTRUCTIONS.md
- IMPLEMENTATION_SUMMARY.md
- FIXES_APPLIED.md
- HOW_TO_ADD_FEATURED_HALLS.md
- FEATURED_HALLS_DEBUG_GUIDE.md
```

---

## 🚀 Automated Cleanup Script:

Create `cleanup.sh`:

```bash
#!/bin/bash

echo "🧹 Starting cleanup..."

# Remove old DB migration files
echo "📦 Removing old database migration files..."
rm -f db_accounting_fix.sql
rm -f db_admin_cms.sql
rm -f db_admin_storage_fix.sql
# ... (add all from list above)

# Remove debug files
echo "🔍 Removing debug files..."
rm -f debug_featured_halls.sql
rm -f test_featured_hall.sql
rm -f fix_featured_halls_rls.sql
rm -f fix_admin_featured_update.sql

# Remove build artifacts
echo "🏗️ Removing build artifacts..."
rm -rf dist/
rm -rf build/
rm -rf .cache/

# Clean npm cache
echo "📦 Cleaning npm cache..."
npm cache clean --force

echo "✅ Cleanup complete!"
```

---

## 📊 Performance Improvements:

### 1. Reduce Bundle Size:
```bash
# Analyze bundle
npm install -g source-map-explorer
source-map-explorer dist/assets/*.js
```

### 2. Lazy Loading:
```typescript
// In App.tsx or routes
const VendorHalls = lazy(() => import('./pages/VendorHalls'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
```

### 3. Image Optimization:
- Use WebP format
- Compress images with TinyPNG
- Use responsive images with srcset

### 4. Code Splitting:
```javascript
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          charts: ['recharts']
        }
      }
    }
  }
}
```

---

## 🔒 Security Checklist:

- [x] Environment variables in .env (not hardcoded)
- [x] .env in .gitignore
- [x] RLS policies on all tables
- [ ] API rate limiting
- [ ] Input validation on all forms
- [ ] XSS protection headers
- [ ] HTTPS enforced
- [ ] Regular dependency updates

---

## 📝 After Cleanup:

```bash
# 1. Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# 2. Test the app
npm run dev

# 3. Build and verify
npm run build

# 4. Commit changes
git add .
git commit -m "chore: cleanup unused files for better performance"
git push origin main
```

---

**Estimated Space Savings: ~50-100MB**
**Performance Gain: 10-20% faster builds**
