# Admin Features: Hall Visibility & Popup Announcements

## Overview
This update adds two powerful admin control features:
1. **Hall Visibility Control** - Admins can control which halls are visible to each user
2. **Popup Announcements** - Admins can create popup announcements that show on page load

## Database Migration

Run the following SQL file to create the necessary tables and policies:

```bash
# In Supabase SQL Editor, run:
db_admin_features.sql
```

This creates:
- `popup_announcements` table for managing announcements
- `hall_visibility` table for controlling hall visibility per user
- Helper functions for visibility checks
- RLS policies for security

## Features

### 1. Popup Announcements

Admins can create rich popup announcements with:
- Title and content
- Image upload
- Custom button text and link
- Priority ordering
- Target audience (all, users only, vendors only)
- Active/inactive status
- Show on load toggle

**Usage:**
1. Go to **إعدادات المنصة** (Platform Settings) in admin sidebar
2. Click on **الإعلانات الظاهرة** (Popup Announcements) tab
3. Click **إضافة إعلان** to create a new announcement
4. Fill in the details and save

The announcement will automatically show to users on page load based on:
- `is_active` = true
- `show_on_load` = true
- Matching `target_audience` with user role

### 2. Hall Visibility Control

Admins can control which halls are visible to each user individually:

**Usage:**
1. Go to **إعدادات المنصة** (Platform Settings) in admin sidebar
2. Click on **ظهور القاعات** (Hall Visibility) tab
3. Select a hall from the dropdown
4. Toggle visibility for each user using the eye icon
5. Use **إظهار للجميع** or **إخفاء للجميع** for bulk actions

**Features:**
- Search users by name or email
- Visual indicators (green = visible, red = hidden)
- Bulk toggle buttons
- Default visibility is true for all users

## Component Integration

### PopupAnnouncements Component

The `<PopupAnnouncements />` component is automatically integrated in `App.tsx` and will:
- Fetch active announcements on load
- Filter by user role
- Display the highest priority announcement
- Handle dismiss and button click actions

## API Reference

### Popup Announcements Table

```sql
CREATE TABLE popup_announcements (
  id UUID,
  title TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  button_text TEXT DEFAULT 'إغلاق',
  button_link TEXT,
  is_active BOOLEAN DEFAULT true,
  show_on_load BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  target_audience TEXT CHECK (target_audience IN ('all', 'users', 'vendors')),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID
);
```

### Hall Visibility Table

```sql
CREATE TABLE hall_visibility (
  id UUID,
  hall_id UUID REFERENCES halls(id),
  user_id UUID REFERENCES profiles(id),
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(hall_id, user_id)
);
```

## Helper Functions

### Get Visible Halls for User
```sql
SELECT * FROM public.get_visible_halls_for_user('user-uuid');
```

### Check if Hall is Visible to User
```sql
SELECT public.is_hall_visible_to_user('hall-uuid', 'user-uuid');
```

## Security

- **RLS Enabled** on both tables
- **Announcements**: Anyone can view active ones, only super_admins can manage
- **Hall Visibility**: Users can view their own, admins can manage all, vendors can view for their halls

## Testing

1. **Test Announcements:**
   - Create an announcement as admin
   - Logout and visit the site as a user
   - Verify popup appears on load

2. **Test Hall Visibility:**
   - As admin, hide a hall from a specific user
   - Login as that user
   - Verify the hall doesn't appear in browse results

## Future Enhancements

- [ ] Schedule announcements (start/end dates)
- [ ] Analytics (views, clicks)
- [ ] A/B testing for announcements
- [ ] Bulk visibility import/export
- [ ] User groups for visibility rules
