# 24/7 DigiHealth - Design System Overhaul Plan
## Complete App Modernization with New Design Tokens

**Status:** v1.0 Planning Phase  
**Date:** August 2026  
**Scope:** Full application UI/UX modernization  
**Priority:** High - Foundation for brand consistency and user experience

---

## Executive Summary

The 24/7 DigiHealth application currently has a comprehensive design system defined (tokens, components, guidelines) but **adoption is inconsistent** across the codebase. This plan outlines a systematic approach to:

1. ✅ **Header & Sidebar** (COMPLETED - See HEADER_SIDEBAR_IMPROVEMENTS.md)
2. 🔄 **Component Library Migration** (Replace raw HTML with design components)
3. 🔄 **Token Standardization** (Replace hardcoded colors with tokens)
4. 🔄 **Responsive Design** (Complete responsive coverage)
5. 🔄 **Icon Library Consolidation** (Standardize on lucide-react)
6. 🔄 **Form Field Unification** (Single Input contract)
7. 🔄 **Table Responsive Patterns** (Mobile card fallback)
8. 🔄 **Modal Mobile Treatment** (Bottom-sheet on mobile)

---

## Phase 1: Foundation (Weeks 1-2)

### 1.1 Complete Header & Sidebar Redesign ✅ DONE
**Status:** COMPLETED  
**Files Modified:** 7  
**Time:** ~2 hours

#### Deliverables:
- ✅ Header with improved notifications
- ✅ Responsive sidebar with better design
- ✅ Profile menu redesign
- ✅ All tokens properly implemented

#### Results:
- Clean, sophisticated appearance
- Full responsive support
- Design token compliance: 100%
- No console errors

---

## Phase 2: Component Library Adoption (Weeks 2-3)

### 2.1 Replace Raw Buttons with Button Component
**Scope:** 83 component files  
**Impact:** High visibility, consistency  
**Effort:** Medium

#### Current State:
- 340 raw `<button>` elements across 104 files
- Button component exists but inconsistently adopted
- Ad hoc styling with `className` attributes

#### Approach:
1. **Audit**: Search for `<button` in TSX files (exclude `<button type="button"` with proper classes)
2. **Replace systematically**:
   ```tsx
   // Before
   <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600">
     Action
   </button>
   
   // After
   <Button variant="primary">Action</Button>
   ```
3. **Variants to use**:
   - `primary` - Main CTAs
   - `secondary` - Secondary actions
   - `white` - Tertiary/text actions
   - `danger` - Destructive actions
   - `ghost` - Minimal style
   - `outline` - Bordered style

#### Key Files to Target:
- `components/doctor/BookingModal.tsx` (custom buttons)
- `components/dashboard/patient/doctors/DoctorsFilterModal.tsx`
- `components/shared/Appointments/AppointmentDetailsModal.tsx`
- All modal components (20+ files)
- Dashboard pages (15+ files)

#### Success Metrics:
- [ ] Raw `<button>` elements reduced to <50
- [ ] Button component imports in >120 files
- [ ] Consistent hover/active states across app

---

### 2.2 Standardize Form Inputs
**Scope:** 30+ component files  
**Impact:** High consistency, better UX  
**Effort:** Medium-High

#### Current State:
- 41 raw `<input>` elements across 30 files
- `Input.tsx` component exists but underused
- Multiple input styling patterns (pills vs. rectangles)
- Custom implementations in modals

#### Approach:
1. **Audit form fields**:
   - Booking flows
   - Login/Register forms
   - Search bars
   - Filter panels

2. **Replace with unified Input component**:
   ```tsx
   // Before
   <input 
     type="text" 
     placeholder="Search..." 
     className="px-4 py-2 border rounded-lg border-slate-200"
   />
   
   // After
   <Input 
     placeholder="Search..." 
     icon={<Search size={18} />}
   />
   ```

3. **Migrate all form patterns**:
   - Text inputs → `<Input type="text" />`
   - Selects → `<Select />` component
   - Textareas → `<Textarea />`
   - Checkboxes → `<Checkbox />`
   - Radio buttons → `<Radio />`
   - Toggles → `<Switch />`

#### Key Files to Update:
- `components/auth/Login.tsx`
- `components/auth/Register/` (all files)
- `components/doctor/BookingModal.tsx`
- All admin forms (10+ files)

#### Success Metrics:
- [ ] All form fields use design system components
- [ ] No raw `<input>` elements in app (except hidden inputs)
- [ ] Form validation styling consistent
- [ ] Accessibility score: AA minimum

---

### 2.3 Replace Raw Cards with Card Component
**Scope:** 40+ component files  
**Impact:** Visual consistency  
**Effort:** Low-Medium

#### Current State:
- Many `<div>` containers styled as cards with hardcoded borders/shadows
- Card component exists with 4 variants (solid/glass/outline/gradient)
- Inconsistent padding, shadows, radius

#### Approach:
```tsx
// Before
<div className="bg-white border border-slate-200 rounded-lg p-4 ">
  Content
</div>

// After
<Card variant="solid">Content</Card>
```

#### Cards by Variant:
- `solid` - Clinical data, dashboard cards (most common)
- `outline` - Secondary containers
- `glass` - Marketing/decorative (use sparingly)
- `gradient` - Premium features

#### Key Files:
- `components/dashboard/patient/health-record/` (3 files)
- `components/dashboard/hospital/FacilityBanner.tsx`
- KPI cards, metric cards across all dashboards

---

## Phase 3: Token Standardization (Weeks 3-4)

### 3.1 Color Token Migration
**Scope:** 60+ component files  
**Impact:** Brand consistency  
**Effort:** High (systematic)

#### Current Issues:
- 24 files with hardcoded hex colors (`#4493b8`, `#53CBF3`, etc.)
- Status color confusion (red vs. rose for danger)
- Slack-* overuse instead of ink-* tokens
- Chart colors hardcoded in arrays

#### Systematic Approach:

**Step 1: Find & Replace Hex Codes**
```bash
# Find all hex color patterns
grep -r "\"#[0-9A-F]\{6\}" --include="*.tsx" --include="*.ts"

# Replace with token equivalents
#4493b8 → var(--color-primary-500) or text-primary
#53CBF3 → var(--color-secondary-500)
#FFDE42 → var(--color-accent-500)
```

**Step 2: Status Color Standardization**
```tsx
// BEFORE - Audit findings show this problem
const riskColors = {
  low: "emerald-50",    // Should be success-50
  medium: "orange-50",  // Should be warning-50 (not orange-50!)
  high: "red-50"        // OK, but use danger-50 for consistency
};

// AFTER - Proper semantic tokens
const riskColors = {
  low: "success-50",      // From design tokens
  medium: "warning-50",   // From design tokens
  high: "danger-50"       // From design tokens
};
```

**Step 3: Ink vs Slate Consolidation**
```tsx
// BEFORE (60+ instances)
text-slate-900  → text-ink-900
text-slate-600  → text-ink-600
text-slate-400  → text-ink-400
bg-slate-50     → bg-surface-soft
border-slate-200 → border-border
```

**Step 4: Chart/Static Colors**
```tsx
// BEFORE
const CHART_COLORS = ["#4493b8", "#36B37E", "#6554C0", ...]

// AFTER - Map to design tokens
const CHART_COLORS = [
  "rgb(68, 147, 184)",   // primary-500
  "rgb(16, 185, 129)",   // success-500
  "rgb(101, 84, 192)",   // accent/purple (non-status decoration)
  ...
];
```

#### Files to Update:
**High Priority (Audit findings mentioned):**
- `components/dashboard/hospital/HospitalCharts.tsx` - Hardcoded chart colors
- `components/dashboard/practitioner/RiskScoreCard.tsx` - Status colors
- `components/auth/Register/constants.ts` - Brand color hardcoding
- `components/doctor/BookingModal.tsx` - Custom input colors

**Medium Priority (20+ files):**
- All `components/dashboard/*` files
- All `components/shared/*` files
- All `components/doctor/*` files

**Strategy:**
1. Create color mapping reference
2. Use find-and-replace with manual verification
3. Test each file group (patient, practitioner, admin)
4. Verify in browser at each major step

#### Success Metrics:
- [ ] Zero hardcoded hex colors in TSX files
- [ ] All colors use design tokens
- [ ] Status colors use semantic families (success/warning/danger/info)
- [ ] No slate-* in utility classes (all use ink-* or surface-*)

---

### 3.2 Typography Token Adoption
**Scope:** 50+ component files  
**Impact:** Visual hierarchy  
**Effort:** Medium

#### Current State:
- Tokens defined (`--text-h1`, `--text-h2`, etc.)
- Components use raw Tailwind utilities (`text-2xl font-bold`)
- No consistent heading hierarchy

#### Approach:

**Create Typography Utility Classes** (if not already present):
```css
/* In app/globals.css @theme block */
@layer components {
  .text-display { font-size: clamp(2.5rem, 6vw, 4.8rem); font-weight: 700; line-height: 1.05; }
  .text-h1 { font-size: 2rem; font-weight: 700; line-height: 1.2; }
  .text-h2 { font-size: 1.5rem; font-weight: 700; line-height: 1.25; }
  .text-h3 { font-size: 1.25rem; font-weight: 600; line-height: 1.3; }
  .text-h4 { font-size: 1.0625rem; font-weight: 600; line-height: 1.4; }
  .text-body { font-size: 0.9375rem; font-weight: 400; line-height: 1.6; }
  .text-small { font-size: 0.8125rem; font-weight: 400; line-height: 1.5; }
  .text-label { font-size: 0.75rem; font-weight: 600; line-height: 1.4; text-transform: uppercase; letter-spacing: 0.1em; }
}
```

**Replace ad hoc classes**:
```tsx
// BEFORE (multiple patterns)
<h1 className="text-3xl font-bold">Title</h1>
<h2 className="text-2xl font-bold">Subtitle</h2>
<p className="text-lg font-semibold">Label</p>

// AFTER (single source of truth)
<h1 className="text-h1">Title</h1>
<h2 className="text-h2">Subtitle</h2>
<p className="text-h4">Label</p>
```

#### Key Files:
- Page headers (all `app/(dashboard)/` pages)
- Dashboard cards (20+ files)
- Form labels
- Modal titles

---

## Phase 4: Responsive Design (Weeks 4-5)

### 4.1 Complete Table Responsiveness
**Scope:** PatientQueueTable, all admin pages  
**Impact:** Critical for mobile users  
**Effort:** High

#### Current State:
- `PatientQueueTable.tsx` has **zero** responsive classes
- All hospital admin pages have minimal responsive behavior
- Data tables don't have mobile fallback (card-list)

#### Approach:

**Implement Responsive Card Pattern**:
```tsx
// At sm: (640px) and below, switch to card layout
<div className="hidden md:table w-full">
  {/* Desktop table */}
</div>

<div className="md:hidden space-y-3">
  {/* Mobile card list */}
  {data.map(row => (
    <Card variant="solid" className="p-4">
      <div className="space-y-2">
        <p><strong>Name:</strong> {row.name}</p>
        <p><strong>Status:</strong> {row.status}</p>
        {/* ... */}
      </div>
    </Card>
  ))}
</div>
```

#### Files to Update:
1. **Critical** (High traffic, mobile users):
   - `components/dashboard/practitioner/PatientQueueTable.tsx`
   - `app/(dashboard)/hospital_admin/appointments/page.tsx`
   - `app/(dashboard)/hospital_admin/billing/page.tsx`

2. **Important** (Admin dashboards):
   - `app/(dashboard)/hospital_admin/staff/[id]/page.tsx`
   - `app/(dashboard)/hospital_admin/reviews/page.tsx`
   - `app/(dashboard)/hospital_admin/sla/page.tsx`

#### Success Metrics:
- [ ] All tables have mobile card-list fallback
- [ ] No horizontal scroll needed on mobile
- [ ] Touch targets ≥44px on mobile
- [ ] Responsive at 375px, 768px, 1280px breakpoints

---

### 4.2 Layout & Spacing Responsive Updates
**Scope:** 40+ component files  
**Impact:** Better mobile experience  
**Effort:** Medium

#### Current Issues:
- 50%+ of files have **zero** breakpoint classes
- Padding/margins not responsive
- Grids don't stack on mobile
- No `sm:`, `md:`, `lg:` prefixes

#### Pattern to Apply:

**Grid Stacking**:
```tsx
// BEFORE
<div className="grid grid-cols-3 gap-4">

// AFTER
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
```

**Responsive Padding**:
```tsx
// BEFORE
<div className="px-8 py-6">

// AFTER
<div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-6">
```

**Responsive Font Sizes**:
```tsx
// BEFORE
<h2 className="text-2xl font-bold">

// AFTER
<h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">
```

---

## Phase 5: Modal & Interaction Patterns (Weeks 5-6)

### 5.1 Mobile Modal Treatment
**Scope:** All modals (20+ files)  
**Impact:** Better mobile UX  
**Effort:** High

#### Current State:
- All modals are centered boxes on all viewports
- Cramped appearance on mobile (<500px)
- Poor touch interaction

#### Approach - Implement Bottom Sheet on Mobile:

```tsx
<Dialog
  isOpen={isOpen}
  onClose={onClose}
  className={`
    fixed inset-x-0 bottom-0 lg:inset-auto lg:top-1/2 lg:left-1/2 
    lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2
    rounded-t-lg lg:rounded-lg
    max-h-[90vh] lg:max-h-none w-full lg:w-96
  `}
>
  {/* Content */}
</Dialog>
```

#### Modals to Update:
- `BookingModal.tsx`
- `DoctorModal.tsx`
- `AppointmentDetailsModal.tsx`
- `DoctorsFilterModal.tsx`
- `DoctorsSortModal.tsx`
- All appointment, health-record, billing modals

---

## Phase 6: Icon Library Consolidation (Weeks 6)

### 6.1 Migrate from react-icons to lucide-react
**Scope:** 11 files using react-icons  
**Impact:** Consistency, bundle size  
**Effort:** Low

#### Current State:
- 176 files use `lucide-react`
- 11 files use `react-icons`
- Mixed on some pages

#### Migration:
```tsx
// BEFORE
import { BiVideo, BiChat, BiUser } from "react-icons/bi";

// AFTER
import { Video, MessageSquare, User } from "lucide-react";
```

#### Files to Update:
- `components/dashboard/practitioner/PatientQueueTable.tsx`
- `components/shared/Header/` (if any)
- Other dashboard components

---

## Phase 7: Polish & Testing (Weeks 6-7)

### 7.1 Dark Mode (Optional Future Phase)
**Scope:** Full app  
**Status:** OUT OF SCOPE for now
**Reason:** Design system has CSS variables defined but no dark-mode prefix usage

#### Future Approach (when scoped):
- Add `dark:` prefixes to all components
- Test at `prefers-color-scheme: dark`
- Update token values for dark mode
- Test all pages in dark mode

### 7.2 Comprehensive Testing

#### Visual Testing Checklist:
- [ ] All pages at 375px mobile viewport
- [ ] All pages at 768px tablet viewport
- [ ] All pages at 1280px desktop viewport
- [ ] Color contrast (WCAG AA minimum)
- [ ] Touch target sizes ≥44px
- [ ] No horizontal scroll on mobile
- [ ] Animations are smooth, not distracting
- [ ] Font sizes readable on all devices

#### Functional Testing:
- [ ] All buttons clickable/tappable
- [ ] All forms functional
- [ ] All modals close properly
- [ ] Sidebar collapse/expand smooth
- [ ] Navigation active states correct
- [ ] Responsive transitions smooth

#### Performance Testing:
- [ ] No console errors or warnings
- [ ] Lighthouse score >90
- [ ] Page load time <3s on 4G
- [ ] No layout shifts (CLS <0.1)

---

## Implementation Timeline

| Phase | Week | Duration | Status |
|-------|------|----------|--------|
| 1. Header & Sidebar | W1 | 2 hours | ✅ COMPLETE |
| 2.1 Buttons | W2 | 4 hours | 🔄 TODO |
| 2.2 Form Inputs | W2-3 | 6 hours | 🔄 TODO |
| 2.3 Cards | W3 | 3 hours | 🔄 TODO |
| 3.1 Colors | W3-4 | 8 hours | 🔄 TODO |
| 3.2 Typography | W4 | 4 hours | 🔄 TODO |
| 4.1 Tables | W4-5 | 8 hours | 🔄 TODO |
| 4.2 Responsive | W5 | 6 hours | 🔄 TODO |
| 5.1 Modals | W5-6 | 6 hours | 🔄 TODO |
| 6.1 Icons | W6 | 2 hours | 🔄 TODO |
| 7. Testing | W6-7 | 8 hours | 🔄 TODO |
| **Total** | **7 weeks** | **~57 hours** | |

---

## Success Metrics (Complete Overhaul)

### Code Quality:
- [ ] 0 hardcoded hex colors in components
- [ ] 0 raw `<button>` elements (except internal)
- [ ] 0 raw `<input>` elements
- [ ] 100% design token compliance
- [ ] No lint warnings related to styling

### User Experience:
- [ ] 100% responsive across all breakpoints
- [ ] All tables have mobile fallback
- [ ] All modals work on mobile
- [ ] Color contrast WCAG AA on all elements
- [ ] Touch targets ≥44px everywhere

### Performance:
- [ ] Lighthouse score ≥90
- [ ] No console errors
- [ ] Bundle size optimized
- [ ] No layout shifts (CLS <0.1)

### Accessibility:
- [ ] WCAG 2.1 AA compliance
- [ ] Proper heading hierarchy
- [ ] Alt text on all images
- [ ] Keyboard navigation works
- [ ] Focus states visible

---

## Risk Mitigation

### Risk 1: Component Inconsistency
**Problem:** Components might have different patterns  
**Mitigation:** Create component usage guide before rollout

### Risk 2: Regression Testing
**Problem:** Changes might break existing functionality  
**Mitigation:** Automated tests + manual QA for each phase

### Risk 3: Mobile Performance
**Problem:** Responsive changes might impact performance  
**Mitigation:** Performance audit at each phase

### Risk 4: Token Adoption
**Problem:** Developers might forget to use tokens  
**Mitigation:** ESLint rules + code review checklist

---

## Success Example: Before → After

### Before (Current State):
```tsx
<header className="h-16 px-4 lg:px-10 flex items-center justify-between 
  border-b border-slate-100 bg-white/70 backdrop-blur-xl sticky top-0 z-30">
  <div className="flex items-center gap-4 lg:hidden mr-4">
    <button className="w-10 h-10 bg-slate-50 rounded-lg flex items-center 
      justify-center text-slate-500 hover:text-primary transition-colors">
      <Menu size={24} />
    </button>
    <LogoMain width={150} height={200} alt={false} />
  </div>
  
  <div className="hidden sm:flex flex-1 flex-col gap-1 pr-4 lg:pr-10">
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500">{formattedDate}</span>
      <span className="w-1 h-1 bg-slate-200 rounded-full" />
      <span className="text-xs font-bold text-primary">{formattedTime}</span>
    </div>
    <WeatherWidget />
  </div>
  
  {/* ... more hardcoded classes ... */}
</header>
```

### After (Redesigned):
```tsx
<header className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between 
  border-b border-border bg-surface sticky top-0 z-30 backdrop-blur-sm">
  <div className="flex items-center gap-3 lg:hidden">
    <button className="w-10 h-10 rounded-md flex items-center justify-center 
      text-ink-600 hover:bg-surface-soft transition-colors" aria-label="Toggle menu">
      <Menu size={20} />
    </button>
    <LogoMain width={140} height={180} alt={false} />
  </div>
  
  <div className="hidden sm:flex flex-1 flex-col gap-1.5 pl-4 lg:pl-8">
    <div className="flex items-center gap-2.5">
      <span className="text-xs font-medium text-ink-400">{formattedDate}</span>
      <span className="w-0.5 h-0.5 bg-border rounded-full" />
      <span className="text-xs font-semibold text-primary">{formattedTime}</span>
    </div>
    <WeatherWidget />
  </div>
  
  {/* Token-based design, cleaner, more responsive */}
</header>
```

---

## Conclusion

This overhaul transforms the 24/7 DigiHealth app from a **partially-designed system** into a **fully-cohesive, token-based product** that:

- ✨ Looks polished and professional
- 📱 Works perfectly on all devices
- 🎨 Maintains brand consistency
- ♿ Is accessible to all users
- ⚡ Performs efficiently
- 🔧 Is maintainable long-term

The **Header & Sidebar redesign is complete** and serves as the template for the rest of the application.

