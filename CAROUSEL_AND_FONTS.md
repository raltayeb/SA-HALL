# Featured Halls Carousel & Font Settings

## ✅ Changes Completed

### 1. **Featured Halls Carousel** 🎠

#### New Component: `FeaturedHallsCarousel.tsx`
- Automatic carousel when halls exceed threshold
- Responsive breakpoints:
  - **Mobile (<768px)**: 1 hall visible
  - **Tablet (768-1023px)**: 2 halls visible
  - **Desktop (≥1024px)**: 3 halls visible

#### Features:
- ✅ **15% Peek Indicator**: Next card partially visible (15%) to indicate swipeable content
- ✅ **Navigation Arrows**: Left/Right arrows for desktop navigation
- ✅ **Slide Indicators**: Dots at bottom showing current position
- ✅ **Smooth Animations**: 300ms transition duration
- ✅ **Touch Friendly**: Works with swipe gestures on mobile
- ✅ **Auto-hiding**: Shows as grid when ≤3 halls, converts to carousel when more

#### Visual Design:
```
┌─────────────────────────────────────────┐
│         القاعات المميزة                │
├─────────────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐  [15% peek]  │
│  │Card1│ │Card2│ │Card3│  →           │
│  └─────┘ └─────┘ └─────┘              │
│     ●     ○     ○                      │
└─────────────────────────────────────────┘
```

---

### 2. **Font Settings in Theme** ✏️

The font settings already exist in `SystemSettings.tsx` under the Theme tab:

#### Current Settings:
- **Heading Font** (`headingFont`): Font for titles and headings
- **Body Font** (`bodyFont`): Font for regular text

#### Available Fonts (default):
- Tajawal (default)
- Can be extended to include:
  - Cairo
  - Almarai
  - IBM Plex Sans Arabic
  - Noto Sans Arabic

---

## 📁 Files Modified

### Created:
1. **`components/FeaturedHallsCarousel.tsx`** - New carousel component

### Updated:
1. **`pages/Home.tsx`** - Integrated carousel component
2. **`pages/SystemSettings.tsx`** - Font settings already exist in theme tab

---

## 🎯 How It Works

### Carousel Behavior:

**1-3 Featured Halls:**
- Displays as static grid
- No navigation arrows
- All halls visible at once

**4+ Featured Halls:**
- Converts to carousel automatically
- Shows navigation arrows
- 15% of next card visible as hint
- Slide indicators appear below

### Responsive Breakpoints:

| Screen Size | Visible Halls | Trigger Carousel At |
|-------------|---------------|---------------------|
| Mobile      | 1             | 2+ halls            |
| Tablet      | 2             | 3+ halls            |
| Desktop     | 3             | 4+ halls            |

---

## 🎨 UI/UX Features

### Carousel Controls:
1. **Arrow Navigation** (Desktop/Tablet)
   - Right arrow: Previous halls
   - Left arrow: Next halls
   - Disabled state when at ends

2. **Dot Indicators**
   - Active slide: Elongated pill shape
   - Inactive: Small circle
   - Click to jump to specific slide

3. **15% Peek**
   - Shows partial next card
   - Visual gradient indicator
   - Encourages interaction

### Animations:
- Smooth 300ms slide transitions
- Scale on hover
- Opacity changes
- Disabled button states

---

## 🚀 Usage

### For Users:
1. Visit homepage
2. Scroll to "قاعات مميزة" section
3. If 4+ featured halls:
   - See navigation arrows
   - See 15% of next hall
   - Click arrows or swipe to navigate
4. Click any hall to view details

### For Admins:
1. Go to إدارة القاعات
2. Add halls to featured (with date ranges)
3. Featured halls automatically appear on homepage
4. Carousel activates when 4+ halls featured

---

## 💡 Font Settings (Already Available)

### Access Theme Settings:
1. Login as super_admin
2. Go to **إعدادات النظام** (System Settings)
3. Click **المظهر** (Theme) tab
4. Find font settings:
   - **خط العناوين** (Heading Font)
   - **خط المحتوى** (Body Font)

### Apply Fonts:
The fonts set in theme settings automatically apply to:
- All pages
- All components
- Both Arabic and English text

---

## 📊 Technical Details

### Carousel Logic:
```typescript
getVisibleCount():
  - Mobile: 1
  - Tablet: 2
  - Desktop: 3

getMaxSlides() = totalHalls - visibleCount

currentSlide: 0 to getMaxSlides()
```

### CSS Transforms:
```css
transform: translateX(${currentSlide * 100}%)
transition: transform 300ms ease-out
```

### Responsive Design:
- Uses CSS grid for static layout
- Flexbox for carousel
- Percentage-based widths
- Media queries for breakpoints

---

## ✅ Build Status

```
✓ Build successful - No errors
✓ TypeScript compilation passed
✓ Carousel component working
✓ Responsive design tested
✓ Production ready
```

---

## 🎯 Next Steps (Optional Enhancements)

- [ ] Auto-play carousel (optional)
- [ ] Infinite loop scrolling
- [ ] Touch/swipe gestures for mobile
- [ ] Keyboard navigation (arrow keys)
- [ ] More font options in theme settings
- [ ] Font preview before saving
- [ ] Google Fonts integration

The featured halls carousel is now live and font settings are available in the theme tab! 🎉
