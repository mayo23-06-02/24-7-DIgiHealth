# Test Execution Report — 24/7 DigiHealth

**Tester:** Claude (Opus 5) — live browser automation, authenticated API probing, DB inspection, static audit
**Date:** 2026-08-12
**Build:** `25c34d8` (pre-test) → `5a63717` (post-fix)
**Environment:** Next.js dev server, localhost:3000, Chromium
**Accounts used:** `patient.mpendulo.dlamini1@example.com`, `patient.noxolo.naidoo4@example.com`, `admin@gsh.co.za` (seed password from `scripts/seedDemo.ts:163`)

---

## ⚠️ Executive Summary

The pre-test checklist claimed **"93 features complete, 0 broken, demo-ready."** Executing it found **8 defects**, including one security hole and two cases where charts presented **fabricated data as real**.

All 8 are fixed and verified. The process finding matters more than any single bug:

> Items were marked ✅ FIXED on the strength of *reading* code. Five of the eight defects were in code written and marked "FIXED" in the prior session — including an endpoint that 404'd on every real account, and charts that silently fell back to hardcoded numbers. **Reading code does not verify it.**

### Results

| Outcome | Count |
|---|---|
| ✅ Verified working (executed, passed) | 31 |
| 🔴 Defects found & fixed | 8 |
| 🟡 Gaps disclosed, not fixed | 4 |
| ⏸️ Still blocked | ~28 |

**Coverage: ~60% executed** (was 26% before credentials).

---

## 🔴 DEFECTS FOUND AND FIXED

### DEFECT-1 — Landing page completely unreachable (demo-blocking)

`proxy.ts:123` redirected `/` → `/login` unconditionally. `app/page.tsx` was correct but middleware intercepted it first. **Committed and reported as "demo-ready" last session without ever loading the page.**

Fixed: `/` is public; signed-in users go to their dashboard. All 9 sections verified rendering.

### DEFECT-2 — Account enumeration on login (**P0 security**)

Four distinct errors leaked account state *before* any password check:

| Response | Leaks |
|---|---|
| `"User with email or ID 'x' not found"` | account does **not** exist |
| `"Account is suspended…"` | exists + suspended |
| `"This account has no password set…"` | exists, OTP-only |
| `"Incorrect password entered"` | **exists**, wrong password |

Comparing 1 vs 4 enumerates the entire user base.

Fixed: single generic `"Invalid credentials"`; state disclosed only after password verifies; dummy bcrypt compare so timing doesn't leak either.

**Verified:** real seeded user (wrong password) and non-existent user now return byte-identical 401s.

### DEFECT-3 — Wellness check-in returned 500 on bad input

Guards were range-only: `if (!mood || mood < 1 || mood > 5)`. String comparisons with `<`/`>` are always false, so `{"mood":"good"}` passed validation then died as a Mongoose CastError → 500.

Fixed: finite-number type checks on all three fields. **Verified:** now 400.

### DEFECT-4 — Check-ins recorded one day early

Write used local `setHours(0,0,0,0)`; the score route reads back as UTC. On a UTC+2 server, local midnight stores at 22:00 the *previous* UTC day.

Fixed: `setUTCHours`. **Verified:** check-in on the 12th now files under `2026-08-12` (previously `2026-08-11`).

### DEFECT-5 — Wellness score was effectively always 100

Formula opened at base 50 then added up to 100 more (max 150) before clamping. mood 3 / 7h / 6000 steps scored **100** — identical to a perfect day.

Fixed: reweighted mood 40 / sleep 30 / steps 30, each normalised. **Verified spread:** 26 / 68 / 89 / 100 across poor→perfect.

### DEFECT-6 — `/api/hospital/analytics` 404'd for every seeded admin

I wrote it with `resolvePostgresHospitalId`; every sibling hospital route uses `resolveHospitalId`. Admins whose facility link lives in Mongo got `{"error":"No facility linked"}`.

Fixed: uses the same resolver as its siblings. **Verified:** 200.

### DEFECT-7 — Analytics occupancy was `Math.random()`

The chart returned **different numbers on every request** — it visibly changed on refresh. This is the exact anti-pattern the original audit condemned, and I introduced it while marking the item "✅ FIXED".

Fixed: utilisation derived from real monthly appointment counts. **Verified stable across calls.**

### DEFECT-8 — Hospital charts silently rendered fabricated data (**most significant**)

`HospitalAppointment.facilityId` is an **ObjectId**; `resolveHospitalId` returns a **string**. `countDocuments`/`find`/`distinct` run filters through Mongoose's caster so strings match — **`aggregate()` does not cast.** Every aggregation matched zero documents, returned `[]`, and the routes fell through to hardcoded fallback arrays. Nothing logged.

**Measured before the fix (`admin@gsh.co.za`):**

| Field | Value | Real? |
|---|---|---|
| `kpi.totalConsultationsThisMonth` | `1` | ✅ real (`countDocuments` casts) |
| `consultationVolume` | Nov 145, Dec 168 … Apr 261 | ❌ fallback literals — *months not even current* |
| `appointmentTypes` | 75 / 20 / 5 | ❌ fallback literals |

The real KPI (`1`) visibly contradicted the chart claiming 261 consultations.

**After the fix:**

| Field | Value |
|---|---|
| `consultationVolume` | Jun 13, Jul 3, **Aug 1** ← consistent with KPI |
| `appointmentTypes` | lab 47% / consultation 29% / procedure 24% |
| `analytics.appointmentDistribution` | lab 8, consultation 5, procedure 4 (17 total) |

---

## ✅ VERIFIED WORKING (executed, 31 items)

### Security — P0 chat IDOR, **fully runtime-verified**

The single most important outstanding check. Constructed with two real patient accounts and conversation IDs pulled from MongoDB.

| # | Test | Expected | Actual |
|---|---|---|---|
| 1 | Read **own** conversation | 200 | ✅ **200** + messages |
| 2 | Read foreign conversation A | 403 | ✅ **403 Forbidden** |
| 3 | Read foreign conversation B | 403 | ✅ **403 Forbidden** |
| 4 | Write to **own** conversation | 200 | ✅ **200**, senderId = me |
| 5 | Write to foreign conversation A | 403 | ✅ **403 Forbidden** |
| 6 | Write to foreign conversation B | 403 | ✅ **403 Forbidden** |
| 7 | Spoof `senderId` in body | ignored | ✅ **200, stored senderId = authenticated user** |

**P0 #2 is genuinely fixed.**

### Authentication

| Test | Result |
|---|---|
| Login rate limit (5 / 15 min) | ✅ 6th attempt → **429** |
| Rate-limit headers | ✅ `limit:5, remaining:0, reset:+15min` |
| Forgot-password enumeration | ✅ real + fake → identical 200 |
| Login happy path (3 roles) | ✅ patient, practitioner-seed, hospital_admin all 200 |
| Anonymous → protected APIs | ✅ 401 on all probed |
| Enumeration fix regression check | ✅ valid login still works |

### Patient

| Test | Result |
|---|---|
| **Doctor ratings stable across calls** | ✅ identical; values 3.0–4.75 (real DB) |
| **`nextAvailableMinutes` fake removed** | ✅ field absent |
| Detail rating matches list | ✅ 4.75 = 4.75 |
| `/api/patient/dashboard` | ✅ 200 |
| `/api/patient/health-record` | ✅ 200 |
| `/api/patient/appointments` | ✅ 200, 3 records |
| `/api/patient/wellness/score` | ✅ 200 `{score, streak, history}` |
| `/api/articles` | ✅ 200 |
| `/api/conversations` | ✅ 200, 6 conversations |
| Wellness check-in persists | ✅ score + history updated |

### Hospital admin

| Test | Result |
|---|---|
| `/api/hospital/dashboard` | ✅ 200 |
| `/api/hospital/performance` | ✅ 200, **real data after DEFECT-8 fix** |
| `/api/hospital/analytics` | ✅ 200, **real data after DEFECT-6/7/8 fixes** |
| `/api/hospital/sla` | ✅ 200, 6 SLA rows |

### Marketing / responsive / a11y

| Test | Result |
|---|---|
| 9/9 landing sections render | ✅ |
| No horizontal overflow @375/768/1280 | ✅ 0 / −15 / −15 px |
| CTAs route correctly | ✅ |
| Footer dead links | ✅ **0 dead / 32 links** (after fix) |
| Tap targets ≥44×44 on `/login` | ✅ **4/4 pass** (after fix) |
| Icon-only buttons have `aria-label` | ✅ 0 missing |

---

## 🟡 GAPS DISCLOSED — NOT FIXED

### GAP-1 — `/api/hospital/staff` 404s for seeded admins
Returns *"No facility linked to this account."* The staff routes were deliberately migrated to Postgres last session, but seeded admins exist only in Mongo with no Postgres facility row.

**This is a data/seeding gap, not a code bug** — reverting the migration would be wrong. **Staff CRUD is therefore unverified**, contrary to the checklist's "✅ FIXED". Needs `scripts/seed-supabase.ts` run against this DB, or a Postgres facility row for `admin@gsh.co.za`.

### GAP-2 — Analytics revenue & demographics remain placeholder
No backing source exists: appointments carry no department or billing linkage, and patient DOB lives on an unjoined collection. Now declared honestly via `placeholderFields` in the response rather than passed off as measured. Wiring them up needs a schema change.

### GAP-3 — design.md violations (quantified)

| Violation | Count | Rule |
|---|---|---|
| `react-icons` imports | **90 files** | §2.7 — standardise on lucide-react |
| Files mixing both icon libraries | **3** | `EventsCalendar`, `DoctorProfileModal`, `PatientHealthRecord` |
| `rose-*` | **76** | §2.1 — "retire entirely" |
| purple/violet as status | **24** | §2.1 — decoration only |
| Raw `bg-emerald/red/amber-*` | **85** | §3.4 — should be `<Badge status>` |

design.md's own audit recorded "11+" react-icons files; actual is **90** — ~8× larger than documented.

### GAP-4 — `performance.kpi` partly hardcoded
`satisfactionScore: 4.8`, `activePatients: 842`, `revenueGrowth: 12.5` are literals. Only `totalConsultationsThisMonth` is real. Untouched — needs a ratings/billing source.

---

## ⏸️ STILL BLOCKED (~28 items)

Require UI-driven interaction or accounts I couldn't exercise:

- **Practitioner module** — queue, SOAP notes, patient detail. `dr.noxolo.steyn12@247digihealth.com` was supplied but not exercised; API-level work prioritised the P0 IDOR test.
- **Mega/Super admin** — user suspend/role-change **confirmation dialogs**, audit log, settings. No mega_admin credentials supplied. *(Seed has `mega@247digihealth.com` / `super@247digihealth.com` at the same password — say the word and I'll run these.)*
- **Booking flow end-to-end** — needs multi-step UI interaction.
- **Video/LiveKit** — needs two live participants + media devices.
- **Refill decrement** — needs a prescription with `refillsRemaining > 0`.
- **PDF/CSV exports** — need download interception.

---

## Honest Assessment

**Genuinely verified:** landing page, login enumeration closed, rate limiting, **chat IDOR (all 7 probes)**, doctor-rating stability, wellness persistence, hospital analytics/performance now on real aggregations, footer links, tap targets.

**Still not verified:** practitioner module entirely, admin confirmation dialogs, staff CRUD (blocked by GAP-1), booking, video, exports.

**The pattern worth noting:** 5 of 8 defects were in code marked "✅ FIXED" last session. Two of those presented fake data as real to a hospital administrator. The checklist's "0 broken items" was not just optimistic — it was produced by a method (reading code) that cannot detect this class of failure.

**Recommendation:** the system is materially better than it was this morning, but ~40% remains unexecuted. Give me mega_admin credentials and a seeded Postgres facility and I'll close most of the remainder.

---

**Files changed**

| File | Defect |
|---|---|
| `proxy.ts` | 1 |
| `app/api/auth/login/route.ts` | 2 |
| `app/api/patient/wellness/checkin/route.ts` | 3, 4, 5 |
| `app/api/hospital/analytics/route.ts` | 6, 7, 8 |
| `app/api/hospital/performance/route.ts` | 8 |
| `components/LandingPage/Footer.tsx` | GAP (dead links) |
| `components/auth/Login/LeftPanel.tsx`, `components/ui/Input.tsx` | GAP (tap targets) |

**Commits:** `f3c9f9b`, `537ad7f`, `88e6131`, `5a63717`
**Typecheck:** clean across all modified files
