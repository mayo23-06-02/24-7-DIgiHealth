# 24/7 DigiHealth — Design System & UX Guidelines

**Live showcase:** run the app and visit [`/design-system`](../app/design-system/page.tsx) for a live, interactive preview of every component described below.

**Status:** v1.0, grounded in an audit of the current codebase (Aug 2026) — §2 tokens and the §3 primitives are now implemented in `components/ui/`.
**Scope:** All roles — Patient, Practitioner, Hospital, Hospital Admin, Mega Admin, Super Admin — plus the public marketing site and auth flows.

This document exists because the product currently has **no enforced design system**: three brand colors are defined but rarely used, status colors are chosen ad hoc per component, two icon libraries are mixed, inputs look different in every flow, and most pages have little or no responsive behavior. The goal here isn't a cosmetic reskin — it's a token system + component contract that every page is expected to build from, so the product looks and behaves like one product instead of twelve prototypes stitched together.

---

## 0. Audit findings this document is designed to fix

| # | Problem (found in current codebase) | Evidence |
|---|---|---|
| 1 | Status colors (success/error/warning) are chosen per-component with no rule. `red` and `rose` are both used for "danger" interchangeably. | `RiskScoreCard.tsx` uses `red-50`/`orange-50`/`emerald-50`; `practitioner/queue/page.tsx` uses `red-100`/`purple-50`/`emerald-100`/`blue-100` in one file |
| 2 | Two icon libraries mixed on the same pages, different stroke weights/styles | `lucide-react` in 176 files, `react-icons` in 11+ files, sometimes both in one component |
| 3 | Inputs render differently in different flows — pill-shaped in auth, square-bordered in booking | `components/ui/Input.tsx` (`rounded-full`) vs `components/doctor/BookingModal.tsx:662` (`rounded-lg`, `border-slate-200`) |
| 4 | Shared primitives exist (`Button`, `Card`, `Input`, `Badge`…) but are inconsistently adopted — raw `<button>`/`<input>` outnumber the components meant to replace them | 340 raw `<button>` across 104 files vs `Button` imported in 94 files |
| 5 | Responsive coverage is thin and uneven — over half of component files carry zero breakpoint classes; data tables have no mobile fallback | `PatientQueueTable.tsx` has no responsive classes at all |
| 6 | No real spacing/type/shadow/radius token scale — only 3 brand colors and 2 fonts are themed | `tailwind.config.js`, `globals.css` `@theme` block |
| 7 | ~~**Build-level bug**: `globals.css` hand-redefined dozens of spacing utilities with `!important`~~ — **fixed**. Root cause: every base reset (`* { padding: 0 }`, `label { font-weight: 400 }`, `a { color: inherit }`, etc.) was written *outside* any `@layer`, and per the CSS Cascade Layers spec, unlayered normal-priority styles beat every named layer — including Tailwind's own `utilities` layer — regardless of selector specificity. That's why *every* Tailwind utility on a `label`/`a`/`input`, not just spacing, was silently losing. Fix: moved the resets into `@layer base` and the hand-authored component classes into `@layer components`, then deleted the `!important` block entirely — verified via computed styles in the browser that utilities now correctly win over base resets. | `app/globals.css` |
| 8 | Dark mode is half-wired: CSS variables flip under `prefers-color-scheme: dark`, but components hardcode `bg-white`/`text-slate-900` instead of referencing them, so it has no visible effect | `globals.css:65-73`, zero `dark:` prefixes anywhere in `.tsx` |
| 9 | Loading state is inconsistent — skeletons, spinners, and literal `"Loading..."` text coexist with no rule for which to use when | mixed across `loading.tsx` route files and components |

Everything below is written to close these specific gaps, not to invent a generic style guide.

---

## 1. Design principles

Healthcare users are often anxious, in pain, time-pressured, or unfamiliar with tech. Design for that.

1. **Calm over flashy.** No landing-page animation flourishes (`.dissolve`, `.slide-left`, hover-scale-and-lift) inside clinical/dashboard screens. Motion is fine on the marketing site; inside a consultation or a health record, stillness reads as competence.
2. **Clarity over cleverness.** A vitals chart, a risk score, an appointment time must be readable in under a second. Prefer plain labels over icons-only UI in clinical contexts.
3. **One system, six roles.** Patient, Practitioner, Hospital, Hospital Admin, Mega Admin and Super Admin dashboards must share the same shell, nav pattern, table pattern, and card pattern. Only content and information density change per role — not the underlying components.
4. **Accessible by default**, not as a retrofit. WCAG 2.1 AA is the floor: this is a medical product used by patients who may have low vision, motor impairment, or be reading a diagnosis while distressed.
5. **Mobile-first.** Patients book appointments and check results from their phones far more than from a desktop. Every new screen is designed at 375px width first, then expanded.

---

## 2. Design tokens

Tailwind v4's `@theme` directive in `globals.css` is the single source of truth. Nothing below should be hand-written as a hex value in a component — always reference the token.

### 2.1 Color system

Replace the current 3-color, semantically-unused palette with a real scale. Brand identity (`primary`/`secondary`/`accent`) stays — it's a reasonable teal/sky/yellow trust palette — but every status color gets a defined scale instead of picking `red` vs `rose` per file.

```css
@theme {
  /* Brand */
  --color-primary-50:  #eaf5f9;
  --color-primary-500: #4493b8;   /* existing brand primary, unchanged */
  --color-primary-600: #326E8A;   /* existing hover shade, unchanged */
  --color-primary-700: #24566d;

  --color-secondary-500: #53CBF3;
  --color-accent-500:    #FFDE42;

  /* Semantic status — pick ONE family per status, use nowhere else */
  --color-success-50:  #ecfdf5;
  --color-success-500: #10b981;   /* emerald-500 */
  --color-success-700: #047857;

  --color-warning-50:  #fffbeb;
  --color-warning-500: #f59e0b;   /* amber-500 */
  --color-warning-700: #b45309;

  --color-danger-50:   #fef2f2;
  --color-danger-500:  #dc2626;   /* red-600 — retire "rose" entirely */
  --color-danger-700:  #991b1b;

  --color-info-50:     #eff6ff;
  --color-info-500:    #2563eb;
  --color-info-700:    #1d4ed8;

  /* Neutrals — for text/borders/surfaces, always via these, never raw slate-N ad hoc */
  --color-ink-900: #0A0A2E;   /* primary text, existing --text-dark */
  --color-ink-600: #475569;
  --color-ink-400: #94a3b8;
  --color-surface:      #FFFFFF;
  --color-surface-soft: #F1F5F9;
  --color-border:       #E2E8F0;
}
```

**Rule:** `success` = emerald family only. `warning` = amber only. `danger` = red-600 only (never `rose-*`). `info` = blue only. If a PR introduces `bg-rose-*`, `bg-orange-*` (for danger/warning), or `bg-purple-*`/`bg-violet-*` for status meaning, that's a lint-review flag.

Reserve `purple`/`indigo`/`violet` for **non-status decoration only** (e.g. an avatar background, a chart series color) — never for meaning ("this is urgent", "this failed").

### 2.2 Typography

Two fonts stay: **Space Grotesk** for headings/buttons/emphasis, **Outfit** for body/UI text — this split is good and already correctly wired in `layout.tsx`. What's missing is a scale so `text-2xl` vs `text-3xl` isn't a coin flip per author.

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `display` | clamp(2.5rem,6vw,4.8rem) / 1.05 | 700 | Marketing hero only |
| `h1` | 2rem / 1.2 | 700 | Page title (dashboard page headers) |
| `h2` | 1.5rem / 1.25 | 700 | Section heading within a page |
| `h3` | 1.25rem / 1.3 | 600 | Card / panel title |
| `h4` | 1.0625rem / 1.4 | 600 | Sub-panel, list group heading |
| `body` | 0.9375rem / 1.6 | 400 | Default paragraph/UI text |
| `small` | 0.8125rem / 1.5 | 400 | Helper text, timestamps, metadata |
| `label` | 0.75rem / 1.4 | 600, uppercase, tracked | Form labels, table headers, badges |

Implement as Tailwind utility classes (`text-h1`, `text-h2`, …) via `@theme` font-size tokens so every dashboard page picks from this list instead of freehanding `text-2xl font-bold` vs `text-3xl font-semibold` for what should be the same "page title" role.

### 2.3 Spacing

Standardize on an **8px base grid**: `1=4px 2=8px 3=12px 4=16px 6=24px 8=32px 12=48px 16=64px` (Tailwind's defaults — do not redefine them).

✅ **Fixed.** `app/globals.css` no longer overrides spacing utilities — see §0 item 7 for the root cause (unlayered base CSS beating Tailwind's `utilities` layer) and the fix (base resets moved into `@layer base`, component classes into `@layer components`).

### 2.4 Radius, shadow, elevation

```css
@theme {
  --radius-sm: 0.375rem;   /* 6px  – badges, chips, inline controls */
  --radius-md: 0.625rem;   /* 10px – inputs, buttons, small cards */
  --radius-lg: 1rem;       /* 16px – cards, modals, panels */
  --radius-pill: 999px;    /* pills — buttons and avatars only, not inputs */

  --shadow-xs: 0 1px 2px rgb(0 0 0 / 0.05);
  --: 0 1px 3px rgb(0 0 0 / 0.08), 0 1px 2px rgb(0 0 0 / 0.04);
  --: 0 4px 12px rgb(0 0 0 / 0.08);
  --: 0 12px 32px rgb(0 0 0 / 0.12);
}
```

**Decision on the pill-vs-square conflict (finding #3):** Buttons keep the pill shape (`--radius-pill`) — it's already the established, working brand identity. **Inputs, selects, textareas, and cards standardize on `--radius-md`/`--radius-lg`** (rounded-rectangle, bordered), matching `components/ui/Input.tsx`'s more clinical, form-appropriate look rather than `BookingModal.tsx`'s ad hoc version. `BookingModal.tsx` should be migrated to the shared `Input` component, not the other way around.

### 2.5 Breakpoints (Tailwind defaults — keep, just actually use them)

`sm 640px · md 768px · lg 1024px · xl 1280px · 2xl 1536px`

Design every screen at three checkpoints minimum: **375px (mobile)**, **768px (tablet)**, **1280px (desktop)**. A component that only has desktop classes is not done.

### 2.6 Motion

```css
@theme {
  --ease-standard: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 150ms;
  --duration-base: 250ms;
  --duration-slow: 400ms;
}
```

- Clinical/dashboard UI: `--duration-fast`/`--duration-base` only, opacity/transform, no bounce.
- Marketing site: existing `.reveal`/`.slide-left`/`.dissolve` treatment is fine, keep scoped to `app/(marketing)` / landing components only.
- Always respect `prefers-reduced-motion` (already handled for the nav progress bar — extend the same guard to every animation, not just that one).

### 2.7 Icons — pick one library

**Standardize on `lucide-react`** (already the majority, 176 files, consistent 2px stroke, tree-shakeable). Treat `react-icons` as deprecated: don't add new `react-icons` imports; replace them opportunistically when touching a file. Two icon grammars on one screen (different stroke weight/corner style) is one of the fastest ways a UI reads as "unpolished."

---

## 3. Component library

All components live in `components/ui/`. This section defines the contract each one must satisfy; several already exist and need contract-alignment, not a rewrite.

### 3.1 Button (`components/ui/Button.tsx` — mostly keep, tighten)

Existing variants (`primary/secondary/accent/white/outline/dashed/ghost/danger`) and sizes (`sm/md/lg/xl`) are good and already have loading/icon states. Changes:
- `danger` variant should use `--color-danger-500` (`red-600`), not `red-400` → `red-600` hover (current implementation is too pale for a destructive action).
- Every icon-only button (no visible label) must carry `aria-label` — audit for this, it's not currently enforced.
- Minimum tap target 44×44px at `sm` size for touch devices — current `sm` padding (`px-3 py-2 text-[10px]`) is under this; bump to at least `px-3 py-2.5`.

### 3.2 Input / Select / Textarea (`components/ui/Input.tsx`, `Select.tsx`)

Single contract for every form field in the product, replacing one-off implementations like `BookingModal.tsx`:

```
Shape:    rounded-md (10px), 1px border --color-border, bg-surface
Height:   44px (touch-safe)
Padding:  px-4
Focus:    ring-2 ring-primary-500/40 + border-primary-500
Error:    border-danger-500 + helper text in danger-700 below field, role="alert"
Label:    label token, always visible above field (never placeholder-as-label)
Disabled: bg-surface-soft, ink-400 text, not-allowed cursor
```

Every screen that currently hand-rolls an `<input className="border ...">` (booking modal, several admin forms) migrates to this component. This is the single highest-visibility fix for "the UI feels inconsistent," since forms appear on nearly every screen.

### 3.3 Card (`components/ui/Card.tsx`)

Keep the existing `solid / glass / outline / gradient` variants but restrict usage:
- `solid` — default for dashboard content (KPIs, list items, panels).
- `outline` — secondary/nested content inside another card.
- `glass` — marketing site and hero sections only. Never in a data-dense dashboard (glassmorphism over clinical data hurts legibility/contrast).
- `gradient` — sparingly, hero banners / empty-state illustration cards only.

Standard padding: `p-4` mobile → `p-6` desktop. Radius: `--radius-lg`. Shadow: `--`, `--` on hover only if the card is interactive/clickable.

### 3.4 Badge / Status Pill (`components/ui/Badge.tsx`)

This is the fix for finding #1. One component, driven entirely by a `status` enum — not by handing it raw color classNames:

```tsx
<Badge status="success">Confirmed</Badge>
<Badge status="warning">Pending</Badge>
<Badge status="danger">Cancelled</Badge>
<Badge status="info">Rescheduled</Badge>
<Badge status="neutral">Draft</Badge>
```

Internally maps `status` → the `--color-{status}-50` background / `-700` text pair from §2.1. No screen should ever pass a raw `className="bg-emerald-100 text-emerald-700"` again — grep for that pattern during migration and replace with `<Badge status="success">`.

### 3.5 Table → responsive card list

Tables (`PatientQueueTable`, admin tables, billing history) currently have zero responsive fallback. Contract:
- **≥768px (`md:`):** standard `<table>`, sticky header, zebra-free (use border-bottom rows, not alternating background — cleaner in a clinical context).
- **<768px:** table rows collapse into stacked cards — each row becomes a `Card` with label/value pairs, primary identifier (patient name, appointment date) as the card title. Do not horizontally scroll a data table on mobile as the only fallback; it's a common but poor pattern for anything with more than 3 columns.

### 3.6 Modal (`components/ui/Modal.tsx`)

- Desktop: centered, max-width by size prop (`sm/md/lg/xl`), `--`, `--radius-lg`.
- Mobile (<640px): full-screen sheet sliding from the bottom, not a centered box — centered modals under ~500px width feel cramped and the close target gets too small. `BookingModal`, `DoctorModal`, `AppointmentDetailsModal` etc. all need this mobile treatment; audit shows none currently have it.
- Always trap focus, close on `Escape`, restore focus to the trigger element on close.

### 3.7 Navigation shell (Sidebar + Topbar)

`components/shared/Sidebar/Sidebar.tsx` already has the *only* well-built responsive pattern in the codebase (slide-in drawer, `lg:translate-x-0` / `-translate-x-full` off-canvas on mobile, overlay backdrop). **Use this as the reference implementation** and apply the same pattern to every role's dashboard shell (`components/shared/DashboardShell.tsx`, `components/patient/DashboardLayout.tsx`, `PractitionerSidebar.tsx`) instead of each maintaining its own nav logic.

Standard shell:
- **Desktop (≥1024px):** fixed left sidebar (240px), top header bar with search/notifications/profile.
- **Tablet (768–1023px):** collapsible icon-only sidebar (64px), expandable on hover/tap.
- **Mobile (<768px):** sidebar hidden behind hamburger → full-height drawer; bottom tab bar for the 4-5 most-used destinations per role is worth considering for Patient (Home / Appointments / Messages / Health Record / Profile) since patients are majority-mobile.

### 3.8 Toast / Alert / Banner

- `Toast` (`components/ui/Toast.tsx`, via `react-hot-toast`) — transient confirmations ("Appointment booked").
- **Inline `Alert`** (new, doesn't exist yet as a primitive) — persistent contextual messages inside a page, e.g. "Your subscription payment failed." Needs a `status` prop using the same §2.1 tokens as `Badge`.
- `EmergencyBanner` (`components/patient/EmergencyBanner.tsx`) stays a distinct, deliberately high-contrast component — this is the one place `--color-danger-500` at full saturation with no softening is correct (medical emergency CTA should not blend in).

### 3.9 Loading & empty states

Rule to resolve finding #9:
- **Route-level / first paint:** skeleton screens matching the final layout (`components/ui/skeletons/`) — already the dominant, correct pattern, extend to the remaining routes without a `loading.tsx`.
- **In-place refresh / button action:** inline spinner (the `Button` component's built-in `loading` state) — never a full-page skeleton for a small refetch.
- **Empty results:** `components/ui/EmptyState.tsx` — icon + one-line explanation + primary action ("No appointments yet — Book one"). Never a bare "No data" string.
- Never use literal `"Loading..."` text as the only feedback — replace the remaining 4 files that still do this.

### 3.10 Avatar, KPI Card, Chat bubble

- `Avatar.tsx` — keep, ensure a deterministic color-from-initials fallback (already likely present) rather than always gray.
- `KPICard.tsx` — the stat-card pattern used across admin/hospital/practitioner overviews. Standardize: label (small/uppercase) → big number (h1/h2 weight) → delta indicator using `success`/`danger` tokens for up/down, never raw green/red.
- Chat bubbles (`MessageBubble.tsx`) — sender bubble in `primary-500`, receiver bubble in `surface-soft`, consistent radius (`--radius-lg` with one flattened corner toward the sender), timestamps in `small` token, read receipts using `info-500` checkmark.

---

## 4. Layout patterns per role

All six roles share the shell from §3.7. Density and content differ:

| Role | Primary density | Key screens |
|---|---|---|
| Patient | Low density, larger touch targets, reassuring tone | Home, Book appointment, Health record, Messages, Billing |
| Practitioner | Medium-high density, clinical | Queue, Patient profile, Consultation, Schedule |
| Hospital / Hospital Admin | High density, tabular, KPI-heavy | Facility overview, Doctors, Patients, Finance |
| Mega/Super Admin | Highest density, system-wide tables | Audit, Reports, Global user management |

Even at high density, the **token system and component contracts stay identical** — only spacing scale usage (tighter `gap-2`/`p-3` vs `gap-4`/`p-6`) and information volume per screen change. This is what makes it "one system" rather than six different apps.

---

## 5. Accessibility checklist (apply to every new/touched screen)

- Text contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text/icons against their background (audit `--color-ink-400` on `--color-surface-soft` specifically — currently borderline in places).
- All interactive elements reachable and operable by keyboard; visible focus ring (`ring-2 ring-primary-500`) — don't `outline: none` without a replacement (current `input { outline: none }` in `globals.css:129` needs a focus-visible ring added back in the Input component).
- Every form field has a real `<label>`, not just placeholder text.
- Icon-only buttons carry `aria-label`.
- Color is never the only signal — a "danger" badge also says "Cancelled" in text, not just red.
- Touch targets ≥ 44×44px throughout patient-facing mobile flows.
- Respect `prefers-reduced-motion` everywhere, not only the nav progress bar.

---

## 6. Dark mode

Currently dead code (CSS variables flip, nothing reads them). Recommendation: **don't half-ship it.** Either:
- **(a)** Remove the unused `@media (prefers-color-scheme: dark)` block until it's a scoped project, or
- **(b)** Do it properly as a phase-5 project: adopt `next-themes`, rebuild every hardcoded `bg-white`/`text-slate-900` as a token reference (`bg-surface`/`text-ink-900`), add `dark:` pairs to the `@theme` tokens in §2.1, and QA every screen in both modes.

Given the scope of the rest of this migration, treat (a) now, (b) later as its own project.

---

## 7. Migration plan (phased, since this is a live product, not a rewrite)

1. **Foundation (do first, low risk, high leverage):** Fix the `globals.css` spacing `!important` hack at the root cause; land the token set in §2.1–2.6; align `Button`/`Badge`/`Input`/`Card` components to the contracts in §3.
2. **Icon consolidation:** stop new `react-icons` usage; replace opportunistically.
3. **Forms pass:** migrate `BookingModal` and any other hand-rolled inputs onto the shared `Input`/`Select`.
4. **Status color pass:** grep-replace raw `bg-{red|rose|emerald|amber|orange}-*` status usages with `<Badge status="...">` / token classes.
5. **Responsive pass, role by role:** apply the `Sidebar.tsx` shell pattern everywhere; convert the worst offenders (`PatientQueueTable` and other dense tables) to the responsive card-list pattern in §3.5.
6. **Modal mobile treatment:** bottom-sheet behavior on all modals below `sm:`.
7. **Dark mode** (optional phase 5, see §6).

Each phase should ship independently and be visually verified in the browser at 375/768/1280px before merging — not just type-checked.
