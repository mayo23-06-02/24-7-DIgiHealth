# 24/7 DigiHealth — Platform Feature Completion Q&A / Checklist

**Purpose:** a ground-truth inventory of every feature across all six roles (Patient, Practitioner, Hospital, Hospital Admin, Mega Admin, Super Admin) plus shared systems (auth, messaging, billing, AI, marketing), with an honest completion status for each — verified by reading the actual implementation, not by trusting what the UI *looks* like it does.

**Method:** five parallel code audits (one per role cluster + one cross-cutting), each instructed to find hard evidence — `TODO`/`FIXME`/`// mock` comments, `Math.random()` standing in for real data, hardcoded arrays, dead `onClick` handlers, silently-swallowed errors, frontend calls to API routes that don't exist, and DB queries that don't actually query anything. File:line citations are preserved so every claim below is checkable.

**How to use this doc:** check items off as they're actually fixed/verified, not when a PR merges. Re-run the audit periodically — codebases drift.

**Status legend:**
- ✅ **Complete** — wired to a real API/DB, no stub markers found
- ⚠️ **Partial** — works, but has mock data, a silent fallback, missing edge case, or a UX gap
- ❌ **Stub** — placeholder UI only, canned/fake response, or the backing route doesn't exist
- 🚧 **Broken** — visible bug, dead button, crash risk, or a security hole
- 🔁 **Duplicate** — this feature is implemented (possibly differently) more than once elsewhere

---

## 0. Executive Summary

### Rollup (approximate, see per-section detail for exact citations)

| Status | Patient | Practitioner | Hospital/HA | Mega/Super Admin | Cross-cutting | **Total** |
|---|---|---|---|---|---|---|
| ✅ Complete | 24 | 12 | 19 | 12 | 18 | **~85** |
| ⚠️ Partial | 5 | 4 | 6 | 4 | 7 | **~26** |
| ❌ Stub | 8 | 3 (all AI) | 3 | 2 | 3 | **~19** |
| 🚧 Broken | 2 | 1 | 2 | 0 (UX gaps only) | 6 | **~11** |

**Bottom line:** the core clinical/operational spine (appointments, health records, consultations, staff/facility CRUD, admin user management, billing *reporting*) is real and DB-backed. The damage is concentrated in **three places**: (1) two P0 security holes, (2) an entire "Wellness" feature and the patient-facing "AI diagnosis" entry point that are decorative, and (3) a handful of dead buttons/duplicate pages that look finished but do nothing.

### 🔴 P0 — Fix before anything else (security)

| # | Issue | Status | Details |
|---|---|---|---|
| 1 | **Password reset = account takeover.** | ✅ **FIXED** | Implemented token-based reset flow: `app/api/auth/forgot-password/route.ts` generates cryptographically-secure 32-byte tokens, hashes with bcrypt (10-round salt), stores hash + 10-min expiry on user. Email sends plaintext token in reset link. `app/api/auth/reset-password/route.ts` validates token hash before allowing reset. Always returns 200 on forgot-password (prevents account enumeration). Clears token after successful reset. |
| 2 | **Chat messages have zero auth.** | ✅ **FIXED** | Added `getRequestUser()` auth checks to both `POST /api/chat/messages` and `GET /api/chat/messages/[consultationId]`. Both endpoints now verify conversation participancy — user must be either patientId or practitionerId on the Conversation. Returns 401 if not authenticated, 403 if not a participant (prevents IDOR). Server now enforces senderId from authenticated user, not client body. |
| 3 | **No payment gateway exists anywhere.** | ⚠️ **DEFERRED** | Skipped per user instruction: "P0 — Fix before anything else (security), we can skip No. 3." |
| 4 | **OAuth login bypasses OTP verification** and never links to the app's Mongo/Postgres user model. | ✅ **FIXED** | Changed `allowDangerousEmailAccountLinking` to false. Added `signIn` callback to verify user exists in DB and has `emailVerified=true`. OAuth login now requires prior registration + OTP completion. |
| 5 | **No rate limiting on any `/api/auth/*` route** (login, register, OTP send/verify, reset-password). | ✅ **FIXED** | Added rate limiting to `proxy.ts` for all auth routes: login (5/15min), register (3/hour), OTP send (3/5min), OTP verify (5/5min), forgot-password (3/15min), reset-password (3/15min). IP-based bucketing. |

### 🟠 P1 — Whole features are decorative (fix or cut)

| # | Feature | Status | Detail |
|---|---|---|---|
| 6 | **Wellness Hub** (`/patient/wellness`) | ❌ Stub | 2 of 3 backend calls (`/api/patient/wellness/score`, `/api/patient/wellness/checkin`) hit routes **that don't exist**; silently falls back to `Math.random()` fake scores/streaks. "Clinical Library" articles are hardcoded too (`/api/articles` doesn't exist either). |
| 7 | **AI Diagnosis — the entry points users can actually reach are mocked.** | ❌ Stub | `app/api/ai/diagnose/route.ts` is explicitly commented `// MOCK AI LOGIC` and returns the same 3 canned conditions regardless of symptoms. This is the route behind the **practitioner's "AI Diagnizer" page** (which markets itself as "Powered by Medius AI") and the **patient triage modal**. Meanwhile a real Gemini-backed route (`/api/ai-diagnose`) exists but its only frontend caller (`AITriageAssistant.tsx`) is orphaned — not rendered on any actual page. Net effect: real AI exists, but nobody can reach it; fake AI is what's live. |
| 8 | **`/patient/visits` ("Visits Mission Control")** | 🚧 Broken, 🔁 Duplicate | Duplicates `/patient/appointments` with a broken implementation: Cancel doesn't call any API (just filters local state + `alert()`), "Join Call" opens a static mock with hardcoded "Stable (32ms Latency)" text, "Prescription PDF" button has no handler at all. |
| 9 | **Hospital Admin → Performance page** | ❌ Stub | Zero `fetch()` calls in the entire file — every KPI and chart is a hardcoded literal. A real, working backend (`/api/hospital/performance`) exists and is simply never called. |
| 10 | **Hospital Admin → Analytics page** | ❌ Stub | Calls `/api/hospital/analytics`, which doesn't exist anywhere in the codebase. Charts are permanently blank. |
| 11 | **Hospital Admin → SLA page** | ❌ Stub | Backing API returns a hardcoded `SLA_TARGETS` array with an inline comment admitting it: *"In a full implementation these would be stored in a DB... editable by hospital admins."* Every facility sees identical numbers. |
| 12 | **Marketing site has no homepage.** `/` is a 5-line file that does `redirect("/login")`. All the built landing components (Hero, Testimonials, Blog, etc.) are dead code, never rendered. `/about` is the only reachable marketing page and every CTA on it (`Book a Free Consultation`, etc.) has no `onClick`/`href`. | 🚧 Broken | Not a design.md violation (marketing is exempt) — a business/growth gap. |

### 🟡 P2 — Broken buttons & dead code (quick fixes / cleanup)

- Staff **Edit / Toggle Duty / Delete / View Profile** are broken for any staff member created via the current flow — a Mongo→Postgres migration was done for staff *list/create* but not for these four actions, so they're handed a Postgres UUID and query Mongo with it. (`app/api/hospital/staff/[id]/route.ts`, `.../[id]/profile/route.ts`)
- Practitioner Queue page: "Join Video/Chat" and "Patient Profile" buttons have **no `onClick` at all**. (`app/(dashboard)/practitioner/queue/page.tsx:209-235`)
- Patient Billing: "Add New" payment method and the delete-payment-method (×) button both have **no `onClick`**. "My Orders & Refills" is a hardcoded 3-item array. (`app/(dashboard)/billing/page.tsx:731-733,795-797,815-841`)
- Patient Health Record: "Request refill" button does a `setTimeout` and shows a fake success toast — **no fetch call exists**. (`health-record/page.tsx:188-208`)
- Doctor ratings, review counts, "next available" time, and consultation fee are `Math.random()`-generated / hardcoded to `0` in both the doctor list and doctor detail APIs — causes a visible **"R0" consultation fee** on every doctor profile page (`?? 750` never kicks in because the value is `0`, not `undefined`). (`app/api/patient/practitioners/route.ts:25,29`, `.../[id]/route.ts:33-39`)
- Mega/Super Admin: three pages are literal duplicates of another page — **Billing ≡ Finance** (same component, two nav entries), **Analytics ⊆ Overview** (strict data subset), and the same "platform intelligence" panel rendered independently on Overview, Alerts, *and* Reports.
- No confirmation dialog anywhere in Mega/Super Admin before suspend-user, change-role, reject/mark-paid-payout, or enabling maintenance-mode — server-side checks are solid, but one misclick executes immediately.
- A meaningful pile of orphaned/dead components duplicating real features (`AppointmentsView`, `DoctorsView`, `HealthActionCenter`, `PatientQueueTable`, `AppointmentCalendar`, `ClinicalDecisionSupport`, `VideoCallModal`, `VideoCallMockup`, `ChatModal`, `VoiceCallModal`, `EditableRiskScoreCard`, `RiskAlertsBanner`) — see §7.

### Responsive/mobile (design.md §3.5 / §2.5 — every screen must work at 375/768/1280px)

Every dense data table audited across the app uses `overflow-x-auto` + a fixed `min-w-[Npx]` with **zero mobile card-list fallback** — this is the exact anti-pattern design.md calls out by name. Confirmed on: Hospital Admin Appointments/Billing/Staff/Staff-Profile(×2)/Reports, Mega/Super Admin Users/Facilities/Audit/Reports. Additionally, `patient/doctors` (the primary doctor-discovery surface) has **zero** responsive breakpoint classes anywhere in its component tree — likely the single worst mobile experience in the product.

---

## 1. Patient Role

### 1.1 Dashboard / Home

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Home dashboard (vitals, onboarding, doctor carousel, calendar) | ✅ Complete | `app/(dashboard)/patient/page.tsx` → `/api/patient/dashboard` (real Mongo queries) | HR/BP/glucose KPI cards are intentionally commented out — dashboard currently only shows Weight/Height. |
| Vital update modal (weight/height/HR/BP/glucose + BMI) | ✅ Complete | `POST /api/patient/vitals` → `Anthropometric` model | — |

### 1.2 Appointments & Booking

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Appointments list/calendar | ✅ Complete | `components/dashboard/patient/PatientAppointments.tsx`, `/api/patient/appointments` | Cancel, accept/decline, filters, list/calendar toggle all real. |
| Booking modal (multi-step) | ✅ Complete | `components/doctor/BookingModal.tsx` via `lib/booking` → `/api/bookings/*` | Shared across patient/practitioner, reschedule too. |
| Book from doctor profile | ✅ Complete | `doctors/[id]/page.tsx:447-451` opens `BookingModal` | — |
| `/patient/visits` "Mission Control" | ✅ **Removed** | Deleted entirely — was a duplicate of `/patient/appointments` at lower quality | Feature consolidated into primary appointments interface. |
| Appointment lobby (`/patient/lobby/[id]`) | ✅ Complete | `components/dashboard/AppointmentLobby.tsx` — real fetch + auto-redirect at scheduled time | — |

### 1.3 Doctor Search, Profiles & Favorites

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Browse/search doctors | ⚠️ Partial | `app/api/patient/practitioners/route.ts:25` — `nextAvailableMinutes: Math.floor(Math.random()*60)+10` | Ratings are real DB fields; availability/nextAvailable are fake. Consultation fees removed (covered in patient premiums). |
| Doctor detail page | ⚠️ Partial | `app/api/patient/practitioners/[id]/route.ts:33-39` — rating/reviewCount/nextAvailable all `Math.random()` | Consultation fees removed (covered in patient premiums, online-only consultations). |
| Favorite/unfavorite doctor | ✅ Complete | `POST/DELETE /api/patient/my-doctors/[id]` | — |
| Message doctor from profile | ✅ Complete | `POST /api/conversations` w/ graceful fallback | — |
| Doctor reviews (read + submit) | ✅ Complete | `PatientFeedbackSection` + `/api/practitioners/[id]/reviews`, `/api/patient/reviews` | (Fixed this session — see chat history: was collapsing multi-review patients into one hidden card.) |
| Nearby facilities widget | ✅ **Removed** | Removed from PatientCalendar and calendar event modal — not needed for online-only consultations | Simplified calendar UI and removed unnecessary API call to `/api/patient/facilities`. |
| Responsive (doctor search/browse) | 🚧 Gap | Zero `sm:/md:/lg:/xl:` classes anywhere in `DoctorsViewRefactored.tsx` + children | Primary discovery surface, worst mobile coverage in the app. |

### 1.4 Health Record

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Timeline / Vitals / Labs / Meds / Allergies / Immunizations tabs | ✅ Complete | `app/api/patient/health-record/route.ts:39-198` — real aggregation across 6 collections | — |
| Health profile PDF download | ✅ Complete | `/api/patient/health-record/report` | — |
| Add/remove allergy | ✅ Complete | `/api/patient/health-record/allergies` | — |
| **Medication refill request** | ✅ **Fixed** | `POST /api/patient/prescriptions` endpoint now decrements `refillsRemaining` on prescription | Real API call replaces fake setTimeout. Validation checks refills remaining and returns 400 if none available. |
| 3D body manikin annotations | ✅ Complete | `/api/patient/annotations` — real `BodyAnnotation` CRUD | — |

### 1.5 Family / Guardian Accounts

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Manage family (Profile → Family tab) | ✅ Complete | `FamilyTab.tsx` → real `/api/patient/family*` routes, tier-based slot limits | — |
| Family invite acceptance | ✅ Complete | `family/accept/page.tsx` + `/api/invites/family/[token]`, `/api/patient/family/accept` | — |
| Manage individual family member | ✅ Complete | `/api/patient/family/[memberId]/appointments`, `/health-record` | — |
| Switch active account (guardian ↔ member) | ✅ Complete | `/api/patient/family/[memberId]/switch`, `/switch-back` | Not deep-audited but DB-backed, not stub. |

### 1.6 Wellness Hub — ✅ Stubs Fixed

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Wellness score / streak / weekly trend | ✅ **Fixed** | `/api/patient/wellness/score` GET endpoint created — queries `WellnessScore` collection, calculates streak from consecutive check-in days | Returns { score, streak, history } with past 7 days of scores. |
| Daily check-in (mood/sleep/steps) | ✅ **Fixed** | `/api/patient/wellness/checkin` POST endpoint created — persists check-in, calculates wellness score from mood/sleep/steps, updates daily `WellnessScore` | Real data persistence, streak tracking across days. |
| Smart health tips | ✅ Complete | `/api/health-tips` returns published `Article` records filtered by category | — |
| Articles / clinical library | ✅ **Fixed** | `/api/articles` GET endpoint created — returns published articles with optional limit/category filters | Calls same Article collection as health-tips. |
| Motivational quote | ⚠️ Partial | Calls third-party `api.quotable.io` directly from the client, hardcoded fallback | Not a DigiHealth API, but functioning. |

### 1.7 Messaging & AI Diagnosis Chat

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Secure messages (`/patient/messages`) | ✅ Complete | `PatientMessagesView.tsx` → shared `MessagesView` | — |
| 1:1 chat / video room (`/patient/chat/[consultationId]`) | ✅ Complete | `ChatWindow.tsx` + LiveKit (`LiveKitCallPanel.tsx`) | Real WebRTC, see cross-cutting §6.3. |
| **AI Triage / diagnosis chat** | ❌ Stub · 🔁 Duplicate | `AITriageButton/Modal/Assistant.tsx` are **not imported by any routed page** — confirmed dead component tree | No live entry point exists in the patient app despite 4 backend routes (`/api/ai/diagnose`, `/api/ai-diagnose`, `/api/ai-triage`, `/api/triage`) and 3 frontend components built for it. See cross-cutting §7 for full detail. |

### 1.8 Billing / Subscriptions

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Billing summary, payment history, subscription upgrade/cancel | ✅ Complete (core) | `/api/billing` — real `PaymentTransaction`/`Subscription`/`PaymentMethod` reads+writes | See cross-cutting §5 for the caveat that no live payment gateway feeds this data. |
| PDF/CSV export | ✅ Complete | `downloadBillingPdf` | — |
| "My Orders & Refills" widget | ❌ Stub | `billing/page.tsx:815-841` — hardcoded 3-item array (`DH-9921` etc.) inline in JSX | Not fetched from anywhere. |
| "Add New" payment method button | 🚧 Broken | `billing/page.tsx:731-733` — no `onClick` | Dead button. |
| Delete payment method (×) button | 🚧 Broken | `billing/page.tsx:795-797` — no `onClick` | Dead button. |
| `chatsUsed` utilization metric | ⚠️ Partial | `/api/billing/route.ts:138` — `chatsUsed: 2, // Mock chats usage count for demo` | — |

### 1.9 Calendar

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Full calendar view | ✅ Complete | `EventsCalendar.tsx` — consumes real appointment/agenda data | — |

### 1.10 Profile

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Identity / Security / Notifications / Documents tabs | ✅ Complete | `[role]/profile/page.tsx` → `/api/user/*` | — |
| Patient clinical data (medical aid, emergency contact, DOB) | ✅ Complete | `PatientClinicalForm.tsx` | — |

---

## 2. Practitioner Role

### 2.1 Dashboard / Queue

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Overview dashboard (stats, schedule, pending requests, charts) | ✅ Complete | `/api/practitioner/dashboard` — fully DB-driven, real risk alerts/earnings/growth | — |
| Patient queue page | 🚧 Broken | `queue/page.tsx:209-235` — "Join Video/Chat" and "Patient Profile" buttons have **no `onClick` at all** | Data fetch itself is real (`/api/practitioner/queue`). |
| `/api/practitioner/queue` auth | ⚠️ Partial | Weak `getPractitionerId()` — trusts `x-practitioner-id` header or `MOCK_PRACTITIONER_ID` env var, **no JWT verification** | Inconsistent with the stronger pattern used elsewhere (see §2.7). |

### 2.2 SOAP Notes / Consultation Notes

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| SOAP note create/edit modal | ✅ Complete | `SoapNoteModal.tsx` + `/api/practitioner/consultations/[id]/soap` | Real persistence, Ctrl+S shortcut, used consistently across Queue/Consultations/Appointments. |

### 2.3 Consultations History

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Consultations list + detail modal | ✅ Complete | Fetches `/api/practitioner/appointments?tab=completed` | Responsive, shows SOAP + AI recommendations. |
| `/api/practitioner/consultations` route | ⚠️ Partial · 🔁 Orphaned | Same weak auth pattern as Queue; page actually uses `/api/practitioner/appointments` instead | Likely dead/duplicate endpoint. |

### 2.4 AI-Assisted Diagnosis Tool — ❌ fully mocked

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| "Analyze Symptoms" | ❌ Stub | `app/api/ai/diagnose/route.ts:12-45` — `// MOCK AI LOGIC`, hardcoded results, fake 2s "thinking" delay | Same identical output regardless of input. Markets itself as "Powered by Medius AI." |
| "Recent Analyses" history | ❌ Stub | `/api/practitioner/ai-diagnoses/route.ts:4-29` — `// MOCK DATA`, same 3 fake names always | Never reflects real diagnoses. |
| "Save to Patient Record" | ❌ Stub | `/api/practitioner/patients/[id]/ai-diagnosis/route.ts:11-19` — `// MOCK SAVE LOGIC`, `console.log` + `setTimeout`, **nothing written to any collection** | Most consequential stub: a clinical documentation action silently no-ops while showing a success toast. |

### 2.5 Patient Chart / Clinical History

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Patient profile / health record view | ✅ Complete | `/api/practitioner/patients/[id]` — pulls User/PatientProfile/MedicalContext/Prescription/Anthropometric/Documents/RiskScore/Consultation, proper authz | — |
| Risk score editing | ✅ Complete | `/api/practitioner/patients/[id]/risk` | — |
| Vitals entry | ✅ Complete | `/api/practitioner/patients/[id]/vitals` | — |
| Document upload/attach | ✅ Complete | `PatientDocumentsPanel.tsx` + `/api/practitioner/patients/[id]/documents` | — |
| PDF report / export | ✅ Complete (not deeply verified) | Route exists, called from UI | Recommend spot-checking PDF content. |
| Prescriptions | ✅ Complete | `/api/practitioner/prescriptions` — Supabase upload, Ably push, notification | No stubs found. |

### 2.6 Video Consultation Lobby

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Lobby page | ⚠️ Partial (shared, not deep-audited here) | Thin wrapper around shared `AppointmentLobby.tsx` | Real logic lives cross-role — see cross-cutting §6.3 which confirms it's real (LiveKit). |

### 2.7 Billing / Earnings

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Billing/earnings page | ⚠️ Partial | `/api/practitioner/billing/route.ts:73-76` — when no real `Billing` records exist, **fabricates** transactions: `Math.floor(Math.random()*600)+350` amounts, `Math.random()>0.15` paid/pending status, random payment method | KPI totals change on every refresh for practitioners without real billing records. |
| PDF/CSV export | ✅ Complete | Functional, but exports the same randomized data if no real records exist | — |

### 2.8 Insights / Analytics

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Clinical insights dashboard + export | ✅ Complete | `/api/practitioner/insights` + `lib/insights/buildPractitionerInsights.ts` — no mock markers found | Well-built. |

### 2.9 Messaging & Appointments

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Messages page | ✅ Complete | Wraps shared `MessagesView`, real contact enrichment | — |
| Appointment schedule management | ✅ Complete | Accept/decline/cancel/edit/booking all real, calendar/list toggle, CSV export | Most complete feature area in this audit; uses the **correct** strong JWT auth pattern — recommend using this route as the template to fix §2.1/§2.3/§2.7's weaker auth. |

### 2.10 Housekeeping — Orphaned/Dead Components

`components/dashboard/practitioner/PatientQueueTable.tsx` (has its own `MOCK_QUEUE` + "Working offline" fallback), `AppointmentCalendar.tsx` (`MOCK_EVENTS`), `ClinicalDecisionSupport.tsx` (`MOCK_GUIDELINES`), `EditableRiskScoreCard.tsx`, `RiskAlertsBanner.tsx` — **none of these are imported by any routed page.** They duplicate real, working features and should be deleted or clarified with the team.

---

## 3. Hospital & Hospital Admin

*Note: `/hospital_admin/dashboard` is a literal re-export of `/hospital/page.tsx` — same feature, two URLs, not a bug.*

### 3.1 Facility Overview / Dashboard

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Operational snapshot, KPIs, doctors/patients overview | ✅ Complete | `/api/hospital/dashboard` → `buildHospitalOverview()`, DB-backed | — |
| `DoctorsOverview.tsx` / `HospitalCharts.tsx` responsive | 🚧 Gap | **0** breakpoint classes in either file | — |

### 3.2 Facility Profile Management

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| View/edit facility details, capacity, services | ✅ Complete | `/api/hospital/facility` GET/PUT — real Supabase table | — |
| Logo upload | ✅ Complete | `/api/hospital/facility/logo` — Supabase storage, graceful 503 if unconfigured | — |

### 3.3 Staff / Doctor Management — 🚧 core CRUD is broken

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Staff list, create, PATCH (list-level update) | ✅ Complete (Postgres) | `/api/hospital/staff` — reads/writes Postgres `staff` table | — |
| **Edit / Toggle Duty / Delete** (per-staff-member) | 🚧 **Broken** | `/api/hospital/staff/[id]/route.ts` queries the **Mongo** `Staff` model, but the frontend passes it a **Postgres UUID** from the list page | Mongoose CastError (500) or silent 404 for any staff member created via the current (Postgres) flow. |
| **View staff profile** | 🚧 **Broken** (same cause) | `/api/hospital/staff/[id]/profile/route.ts:27` — `Staff.findOne({_id: id, ...})` on Mongo, fed a Postgres UUID | Shows "Staff member not found." |
| Staff profile "Avg Response Time" | ⚠️ Partial | `staff/[id]/profile/route.ts:83` — `const avgResponseMinutes = 18; // mock` | — |
| Invite doctor by email | ✅ Complete | `/api/hospital/staff/invite` — token gen, real email send, dual Mongo+Postgres write, orphan cleanup | Well-implemented. |
| Cancel pending invite | ✅ Complete | `/api/hospital/staff/invite/[id]` | — |
| Responsive — staff table & profile tabs | 🚧 Gap | `overflow-x-auto`/`min-w-[…]`, no card fallback (×3 instances) | — |

### 3.4 Appointment Oversight

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| List/filter, create, cancel appointments | ✅ Complete | `/api/hospital/appointments`, `[id]` — real Mongo + Postgres sync | — |
| Patient/doctor typeahead search | ✅ Complete | `/api/hospital/patients/search`, `/doctors/search` — auth-gated | — |
| Responsive — appointments table | 🚧 Gap | Same horizontal-scroll-only pattern | — |

### 3.5 Billing / Finance

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Transaction list, filters, summary KPIs | ✅ Complete | `/api/hospital/billing` — real aggregations | — |
| CSV / PDF export | ✅ Complete | Reuses `/api/hospital/reports/financial` | — |
| `financial` report route auth resolution | ⚠️ Partial | Skips the shared `resolveHospitalId()` fallback chain other routes use — admins without a `HospitalAdminProfile` row get a false "not found" | Edge case, not universal. |
| Responsive — billing table | 🚧 Gap | Same pattern | — |

### 3.6 Analytics Dashboard — ❌ entirely broken

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Occupancy/revenue/wait-time/appointment-type charts | ❌ Stub | Calls `/api/hospital/analytics` — **route does not exist anywhere** | Charts permanently blank. |
| CSV export buttons on this page | ✅ Complete (ironically) | These call `/api/hospital/reports/[type]`, which does exist | Works even though the charts they're attached to never load. |

### 3.7 Performance Metrics — ❌ entirely disconnected

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Consultation volume, satisfaction, active patients, revenue growth | ❌ Stub | `performance/page.tsx:30-106` — **zero `fetch()` calls in the file**, everything is a literal constant | A real, working backend (`/api/hospital/performance`) exists and is simply never called. |
| Backing API (unused) | ⚠️ Partial | `/api/hospital/performance/route.ts:70-88` — half real aggregation, half hardcoded constants (`satisfactionScore: 4.8` etc.) | Even if wired up, half-fake. |

### 3.8 SLA Tracking — ❌ decorative

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Facility-wide SLA targets table | ❌ Stub | `/api/hospital/sla/route.ts:4-13` — hardcoded `SLA_TARGETS` array, comment admits it's not DB-driven | Every facility sees identical numbers. |
| Staff-level SLA snapshot | ⚠️ Partial | Completion/cancellation rates real; `avgResponseMinutes` hardcoded, `onTimeRate` fabricated via `completionRate - 5` | — |

### 3.9 Patient Reviews Moderation

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| List/filter reviews, approve | ✅ Complete | `/api/hospital/reviews`, `[id]` PATCH | Correct facility-scoping via doctor roster. |
| Dismiss/reject review | ⚠️ Partial | DELETE **permanently deletes** rather than marking "rejected" — but frontend type declares a `"rejected"` status that's never actually produced | Semantic mismatch, dead type value. |

### 3.10 Facility-wide Reports & Export

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Multi-type report builder + CSV + PDF | ✅ Complete | `buildHospitalReport()` — real filtering/sorting/facets, no mock markers | Most complete feature in this role cluster. |
| "Staff" report data source (legacy per-type export route) | 🚧 Likely stale | `/api/hospital/reports/[type]/route.ts:51` still reads Mongo `Staff`, while live CRUD moved to Postgres | Staff added/edited recently won't appear in this export. |
| Responsive — report table | 🚧 Gap | Same pattern (though report-type tabs do have a good mobile `<Select>` fallback) | — |

### 3.11 Security Note

`/api/hospital/doctors/route.ts` has **no auth check** at all (used by a patient-facing carousel, likely intentional) — but it lives under the `/api/hospital/` path next to protected routes, which invites confusion. Worth an explicit "public by design" comment.

---

## 4. Mega Admin / Super Admin

*Architecture: every `mega_admin/**` page and its `super_admin/**` counterpart are byte-identical 3-line re-exports of shared components in `components/dashboard/admin/**`. Audited once; divergences called out explicitly.*

### 4.1 Platform Overview

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| KPIs, trend charts, intelligence feed, recent users/facilities | ✅ Complete | `/api/admin/overview` → `buildPlatformOverview()` — real Mongo aggregations | 🔁 Its "intelligence" panel is duplicated on Alerts and Reports (see §4.9). |

### 4.2 User Management

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Search/filter/paginate all users | ✅ Complete | `/api/admin/users` | — |
| Suspend/unsuspend | ✅ Complete, ⚠️ UX gap | Server correctly blocks suspending mega_admin / self-suspend + audit-logs; **client fires immediately with no confirmation dialog** | — |
| Change role | ✅ Complete, ⚠️ UX gap | Server re-validates `canAssignRole()`, blocks super_admin touching mega_admin (403); **no confirmation**, no self-demotion guard | — |
| Mega vs. super role-assignment scoping | ✅ Complete | `SUPER_ASSIGNABLE_ROLES` vs `MEGA_ASSIGNABLE_ROLES`, enforced client + server | Correct real divergence between the two roles. |
| Responsive — users table | 🚧 Gap | `overflow-x-auto`/`min-w-[800px]`, no card fallback | — |

### 4.3 Facility Management

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| List facilities w/ staff/doctor/appointment counts | ✅ Complete | `/api/admin/facilities` — real aggregation | — |
| Open/close facility | ✅ Complete, ⚠️ no confirm | Fires immediately, server properly gated + audit-logged | — |
| Edit facility name | ❌ Not exposed | Server supports it (`facilities/[id]/route.ts:51`) but **no UI field ever sends it** — and if reached, a missing name is silently dropped, not rejected | Latent silent-failure bug, currently unreachable. |
| Create/delete facility | ❌ Not implemented | No POST/DELETE handler; facilities are created only via hospital-admin onboarding | Intentional, not a bug — flagged for clarity. |
| Responsive — facilities table | 🚧 Gap | Same pattern | — |

### 4.4 Finance / Revenue & Payouts

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| GMV/fees/earnings KPIs, transaction feed | ✅ Complete | `/api/admin/finance` — real aggregation across `PaymentTransaction`+`HospitalTransaction` | Caveat: no real payment gateway feeds this (see cross-cutting §5). |
| Payout approve/reject/mark paid | ✅ Complete, ⚠️ no confirm | Server correctly blocks non-mega from marking "paid" (403) — **the one clean dual-gated example in this audit** — but still no confirm dialog on an irreversible money-movement action | Model to replicate elsewhere. |
| PDF export | ✅ Complete | `/api/billing/export` → real "Platform Finance Report" | — |
| "Billing" nav item | 🔁 **Duplicate of Finance** | Both `billing/page.tsx` and `finance/page.tsx` export the identical `AdminFinance` component | Two sidebar entries, one page. |

### 4.5 System Analytics

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Trend charts (consults, revenue, signups, users-by-role) | ✅ Complete (real data), 🔁 Duplicate | Same `buildPlatformOverview()` source as Overview — 3 of 4 charts are pixel-identical to Overview's | Adds no unique data over §4.1. |

### 4.6 Platform Reports & Export

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Multi-type filterable report + CSV + PDF | ✅ Complete | `buildAdminReports.ts` — real queries per type (users/facilities/consultations/finance/audit) | Most complete admin feature. |
| "Report intelligence" panel | 🔁 Duplicate | Same `overview.intelligence` shown a 3rd time | — |
| Responsive — report table | 🚧 Gap | Same pattern | — |

### 4.7 System Alerts / Incident Monitoring

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Alert feed | ⚠️ Partial, 🔁 Duplicate | Real underlying data, but **no acknowledge/dismiss/resolve action exists anywhere** — purely read-only re-rendering of Overview's intelligence panel + pending payouts | Not really an "alerting" system; no persistence/state for resolved alerts. |

### 4.8 Audit Log Viewer

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Searchable, paginated admin-action log | ✅ Complete | `/api/admin/audit` — real `AuditLog.find()`, written on every mutating admin action | — |
| Audit-write reliability | ⚠️ Partial | `logAdminAction.ts:14-28` — failed writes are only `console.error`'d, **silently dropped**, no alerting | Undermines the page's own "immutable record" claim for a compliance-sensitive feature. |
| Responsive — audit table | 🚧 Gap | Same pattern | — |

### 4.9 Platform Settings

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Maintenance mode, feature flags, POPIA version, default fee | ✅ Complete | Real `SystemConfig` singleton, persisted + audit-logged | Cleanest role-divergence example in the audit. |
| Mega-only editing scope | ✅ Complete — **properly dual-gated** | Client disables inputs/hides Save for super_admin; **server also 403s** via `requireMegaAdmin()` | Best "not just UI-hidden" example in the whole app — model for other destructive actions. |
| Confirmation before enabling maintenance mode | ⚠️ Gap | A platform-wide-outage toggle is one click + Save away, no confirm | — |

### 4.10 Cross-Cutting Admin Findings

- **Security is consistently good at the server layer** — every `/api/admin/**` route gates via `requirePlatformAdmin()`, and mega-only actions are enforced server-side, not just hidden.
- **UX gap across the board**: no confirmation dialogs on any destructive action (suspend, role change, payout status, maintenance mode) — low risk given server gating exists, but still a one-click hazard for the highest-privilege role.
- **Duplication**: Billing≡Finance, Analytics⊆Overview, "intelligence" panel shown 3×. Consolidating these would meaningfully shrink the admin surface with no feature loss.

---

## 5. Cross-Cutting Systems

### 5.1 Auth Flows

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Registration (patient/practitioner/hospital wizard) | ✅ Complete | `/api/auth/register` — Mongo + Postgres dual-write, bcrypt, staff-invite auto-attach | — |
| Login (password) | ✅ Complete | `/api/auth/login` — Postgres-first w/ Mongo fallback, bcrypt, blocks unverified/suspended | — |
| Email OTP verification | ✅ Complete, genuinely enforced | `/api/auth/otp/send`, `/verify` — bcrypt-hashed 6-digit code, 10-min TTL, **hard-blocked at login if unverified** | Not bypassable via the password path. |
| **Forgot/reset password** | ✅ **FIXED — P0 security hole** | `/api/auth/forgot-password/route.ts` + `/api/auth/reset-password/route.ts` (rewritten) — cryptographically-secure 32-byte token, bcrypt hash, 10-min TTL, account enumeration prevention, single-use tokens | See Executive Summary #1. |
| Social login (Google/Facebook) | ✅ **FIXED** | Changed `allowDangerousEmailAccountLinking` to false. Added `signIn` callback validates user exists and is `emailVerified`. OAuth requires prior password-based registration + OTP. | See P0 #4. |
| Session/JWT validation | ⚠️ Partial | Central `proxy.ts` gate exists, but some routes hand-roll their own `jwtVerify` instead of the shared helper | Functionally OK today, inconsistency risk going forward. |
| Rate limiting | ✅ **FIXED** | All `/api/auth/*` routes now rate-limited in `proxy.ts`: login 5/15min, register 3/hour, OTP send 3/5min, verify 5/5min, forgot/reset 3/15min each. | See P0 #5. |

### 5.2 Messaging / Chat

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Message persistence & history | ✅ Complete | `/api/chat/messages*`, `/api/conversations` — real Mongo, pagination, unread counts | — |
| Real-time delivery | ✅ Complete, but effectively off | Genuine dual-transport (Ably + Socket.IO fallback) — **but `NEXT_PUBLIC_ABLY_USER_PERCENTAGE` is unset, defaulting to 0%**, so everyone silently uses the Socket.IO path | Not broken, but the "primary" transport is dead weight as configured. |
| **Message send/read authorization** | ✅ **FIXED — P0 security hole (IDOR)** | Both `POST /api/chat/messages` and `GET .../[consultationId]` now call `getRequestUser()` and verify conversation participancy. Server enforces senderId from authenticated user, not client body. Returns 401 if not authenticated, 403 if not a participant. | See Executive Summary #2. Contrast with `/api/conversations`, which does this correctly. |
| Attachments/media | ✅ Complete | `/api/media/upload`, `/api/chat/upload` — auth-gated, Supabase-backed | — |
| `app/api/ably/message-handler.js` | ❌ Dead code | Not imported anywhere | — |

### 5.3 Video Consultation

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Appointment lobby (countdown → auto-join) | ✅ Complete | `AppointmentLobby.tsx` — real fetch + timed redirect | — |
| Video/voice calling (production path) | ✅ Complete | `LiveKitCallPanel.tsx` (real `livekit-client` SDK) + `/api/chat/call/start` (mints real LiveKit tokens) | Genuine WebRTC, not a placeholder. |
| `VideoCallModal.tsx` / `VideoCallMockup.tsx` (legacy) | ❌ Dead code | Built for Daily.co iframes, incompatible with LiveKit `wss://` URLs; only referenced by the already-orphaned `HealthActionCenter.tsx` | Doesn't affect the live path — safe to delete. |

### 5.4 Notifications

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| In-app notification center | ✅ Complete (polling, not push) | `/api/notifications` + `NotificationBell.tsx` — 15s client poll, real Mongo model | Reasonable gap, not a bug. |
| Email reminders | ✅ Complete | Throttled, idempotent, piggybacks on the notifications GET | — |
| Browser push | N/A | No `Notification.requestPermission`/`pushManager` calls anywhere — not attempted, not a dangling stub either | — |

### 5.5 Billing (API layer)

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| GET `/api/billing` (per-role summaries) | ✅ Complete (real reads) | Genuinely computes from Mongo across 5+ collections, real per-role logic | — |
| `chatsUsed` field | ⚠️ Partial | `billing/route.ts:138` — `// Mock chats usage count for demo` | — |
| PATCH (payout approve/reject, subscription changes, fee config) | ✅ Complete | Real writes + audit log | — |
| PDF export (receipts/invoices/reports) | ✅ Complete | Real generation, ownership-checked | — |
| **Underlying payment processing** | ❌ **Does not exist — P0 business gap** | No Stripe/PayFast/Paystack/PayGate SDK anywhere in `app/`/`lib/`; `PaymentTransaction.create` only called from a seed script | See Executive Summary #3. The billing *reporting* layer is real; the billing *collection* layer doesn't exist. |

### 5.6 Profile (shared)

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Profile view/edit, role-data tabs, documents | ✅ Complete | Real `/api/user/*` endpoints | — |
| Password change | ✅ Complete | Verifies current password via bcrypt first, blocks OTP-only accounts | — |
| "Trusted devices" / sessions | ⚠️ Cosmetic | Code comment: *"In a real production system these would be stored in a sessions collection... here we store them on the user document"* — "Revoke" doesn't invalidate any actual JWT (there's no session store) | Doesn't do what it visually implies. |

### 5.7 AI Features — inconsistent, and the wrong ones are reachable

| Route | Reachable from | Status | Evidence |
|---|---|---|---|
| `/api/ai/diagnose` | Practitioner AI Diagnizer page **+** patient triage modal | ❌ Stub | `// MOCK AI LOGIC`, canned output, fake latency |
| `/api/ai-diagnose` | `AITriageAssistant.tsx` — **but that component is orphaned, not on any page** | ✅ Complete (real Gemini call) | `gemini-1.5-flash:generateContent`, real key, scripted fallback only if Gemini errors |
| `/api/ai-triage` | Nothing — no frontend caller found | ✅ Complete but dead | Real RapidAPI call, keys present, just unused |
| `/api/triage` | Nothing — no frontend caller found | ❌ Stub, explicitly labeled dead code | File's own comment: *"This is a placeholder backend... Replace the mock logic below"* |

**Net effect:** 2 of 4 AI-symptom endpoints are real, but both are currently unreachable from any live page. The two endpoints users can actually hit are mocked. Fixing this is a routing/wiring problem, not a from-scratch build — the real Gemini integration already exists and works.

### 5.8 Marketing / Landing Site

*(Exempt from design.md per its own scope — assessed for completion only.)*

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Root `/` route | 🚧 Broken as a marketing site | `app/page.tsx` = `redirect("/login")`, 5 lines total | No public homepage exists. |
| Landing components (Hero, Approach, Blog, Stats, Testimonials, WhyChooseUs) | ❌ Dead code | Fully built, never imported by any rendered route | — |
| `/about` page | ⚠️ Partial | Polished, on-brand copy — but **zero** `onClick`/`href`/`<Link>` in the whole file; all CTAs are dead | Only reachable marketing page in the product. |
| Navbar anchor links (`/#approach` etc.) | 🚧 Broken | Target sections on `/`, which redirects before anything can render | — |
| Footer / social links | ✅ Complete (static) | Real external links | Email capture input has no submit handler (cosmetic). |

### 5.9 Family / Guardian Accounts (backend)

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Family link data model & listing | ✅ Complete | Real `FamilyLink` model, tier-based slot limits | — |
| Guardian → adult invite flow | ✅ Complete | Crypto-random token, 15-min TTL, real email, rollback on send failure | — |
| Child/minor accounts, accept, switch, switch-back | ✅ Complete | Full route surface present, consistent with the well-built invite flow | — |

---

## 6. Dead / Orphaned Code Inventory (housekeeping)

These components exist in the tree, contain their own mock data, and are **not imported by any routed page** — safe candidates for deletion (confirm with the team first) but worth knowing about so they don't get mistaken for live features during future work:

- `components/dashboard/patient/AppointmentCheckup.tsx`, `AppointmentsView.tsx` (superseded by `PatientAppointments.tsx`)
- `components/dashboard/patient/DoctorsView.tsx` (superseded by `doctors/DoctorsViewRefactored.tsx`)
- `components/dashboard/patient/HealthActionCenter.tsx` (own stub: `handleBookDoctor` just `console.log`s)
- `components/dashboard/patient/PractitionerDiscovery.tsx`, `ScheduleView.tsx`, `TelehealthConsultModal.tsx`, `VideoCallMockup.tsx`
- `components/dashboard/patient/ChatModal.tsx`, `VideoCallModal.tsx`, `VoiceCallModal.tsx` (only referenced by the already-orphaned `HealthActionCenter.tsx`)
- `components/patient/AITriageButton.tsx`, `AITriageModal.tsx`, `AITriageAssistant.tsx`, `DashboardLayout.tsx` (entire AI-triage UI tree, unreachable)
- `components/dashboard/practitioner/PatientQueueTable.tsx`, `AppointmentCalendar.tsx`, `ClinicalDecisionSupport.tsx`, `EditableRiskScoreCard.tsx`, `RiskAlertsBanner.tsx`
- `app/api/ably/message-handler.js` (unused)
- `app/api/ai-triage/route.ts`, `app/api/triage/route.ts` (real/stub respectively, both unreachable from any frontend)

---

## 7. Responsive/Mobile Gap Inventory (design.md §2.5 / §3.5)

Design.md requires every screen to work at 375px / 768px / 1280px, and dense tables to collapse into a card-list below 768px rather than relying on horizontal scroll alone. **Every table below currently violates the card-list requirement** (horizontal-scroll-only):

- Hospital Admin: Appointments, Billing, Staff, Staff Profile (×2 tabs), Reports
- Mega/Super Admin: Users, Facilities, Audit Log, Reports

**Zero responsive breakpoints at all** (worse than the above — not even horizontal scroll is handled gracefully):
- `components/dashboard/hospital/DoctorsOverview.tsx`, `HospitalCharts.tsx`
- `patient/doctors` page + its entire component tree (`DoctorsViewRefactored`, `DoctorsCarouselSection`, `DoctorsFilterModal`, `DoctorsSortModal`) — the primary doctor-discovery surface

**Sparse coverage, worth a manual pass:**
- `patient/messages` wrapper (though the underlying shared `MessagesView` handles it)
- `patient/calendar` → `EventsCalendar.tsx` (2 responsive hits in 586 lines)
- `patient/visits` (moot — page is broken/duplicate anyway)

**Reference implementations** (strong responsive coverage, use as the pattern to copy): `patient/page.tsx` (home), `patient/doctors/[id]/page.tsx`, `app/(dashboard)/billing/page.tsx`, `components/ui/Table.tsx` (has a `hidden md:block` split implying a proper mobile fallback exists at the primitive level — worth reusing everywhere instead of hand-rolled `overflow-x-auto` tables).

---

## 8. Duplicate Functionality Inventory

| Duplicate | Detail | Recommendation |
|---|---|---|
| `/patient/visits` vs `/patient/appointments` | Visits is broken and lower-quality | Deprecate Visits, redirect to Appointments |
| Mega/Super Admin "Billing" vs "Finance" nav items | Identical component, two sidebar entries | Remove one nav entry |
| Mega/Super Admin "Analytics" vs "Overview" | Analytics is a strict subset of Overview's charts | Merge or remove Analytics |
| "Platform intelligence" panel (Overview / Alerts / Reports) | Same array rendered 3 independent times | Consolidate into Overview only, make Alerts genuinely interactive (ack/resolve) or remove it |
| `hospital_admin/dashboard` vs `hospital/page.tsx` | Literal re-export, same feature at two URLs | Low priority — not user-facing confusion, just codebase noise |
| 4 AI-symptom-checker API routes (`/api/ai/diagnose`, `/api/ai-diagnose`, `/api/ai-triage`, `/api/triage`) | Only 2 have any caller; the working Gemini one is orphaned | Consolidate to one real route, wire it into both the patient triage entry point and the practitioner AI Diagnizer, delete the other 3 |
| Practitioner `/api/practitioner/consultations` vs `/api/practitioner/appointments` | Consultations route appears unused; page calls Appointments instead | Confirm nothing else depends on it, then delete |

---

## Appendix — Methodology

This document was produced by 5 parallel code-reading audits (not UI click-throughs), each covering one role cluster or the cross-cutting systems, instructed to find and cite hard evidence for every completion-status claim: `TODO`/`FIXME`/`// mock` comments, `Math.random()`-generated data standing in for real values, hardcoded arrays in place of API responses, dead `onClick` handlers, silently-swallowed `catch` blocks, and frontend `fetch()` calls to routes that don't exist in `app/api/**`. All file:line citations in the per-role sections above are preserved from the original audit output and can be re-verified directly.

**What this document does NOT cover**: visual/UI polish, performance, accessibility (see `design.md` §5 separately), or test coverage — this is a *functional completeness* audit only.

**Recommended next step**: work top-down from §0 (P0 → P1 → P2), since the P0 items are live security/business risks, not just incomplete features.
