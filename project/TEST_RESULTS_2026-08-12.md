# Test Execution Report — 24/7 DigiHealth

**Tester:** Claude (Opus 5) — live browser automation, authenticated API probing, MongoDB inspection, static audit
**Date:** 2026-08-12
**Build:** `25c34d8` (pre-test) → `4a300fc` (post-fix)
**Roles exercised:** patient ×2, practitioner, hospital_admin, mega_admin, super_admin
**Credentials:** seed password from `scripts/seedDemo.ts:163`

---

## ⚠️ Executive Summary

The pre-test checklist claimed **"93 features complete, 0 broken, demo-ready."** Executing it found **14 defects**, including **three security holes** and two cases of **fabricated data presented as real**.

All 14 are fixed and verified. The process finding matters more than any individual bug:

> **8 of the 14 defects were in code marked "✅ FIXED" in a prior session on the strength of reading it.** One endpoint 404'd for every real account. Two charts silently fell back to hardcoded numbers. An audit log silently discarded every action by a whole class of admin. **Reading code cannot detect this class of failure.**

### Results

| Outcome | Count |
|---|---|
| ✅ Verified working (executed, passed) | **62** |
| 🔴 Defects found & fixed | **14** |
| 🟡 Gaps disclosed, not fixed | 3 |
| ⏸️ Still blocked | ~8 |

**Coverage: ~88% executed** (26% → 60% → 82% → 88% as credentials and seed data arrived).

---

## 🔴 DEFECTS FOUND AND FIXED

### Security (3)

**DEFECT-2 — Account enumeration on login** *(P0)*
Four distinct errors leaked account state before any password check: `"User … not found"` vs `"Incorrect password entered"` distinguishes registered from unregistered addresses, enumerating the entire user base.
→ Single generic `"Invalid credentials"`; state disclosed only after the password verifies; dummy bcrypt compare so timing doesn't leak either.
**Verified:** real seeded user (wrong password) and non-existent user return byte-identical 401s.

**DEFECT-9 — Practitioner queue trusted a client-supplied header** *(PHI exposure)*
`/api/practitioner/queue` read identity from an `x-practitioner-id` request header (fallback: `MOCK_PRACTITIONER_ID` env var) with **no JWT verification**. Any caller could set it to another practitioner's id and read their whole queue — patient names, presenting complaints, risk scores, AI recommendations.
→ Identity now from `getRequestUser()` + role check.
**Verified:** mega_admin sending that header now gets **401**; previously the header chose whose queue came back.

**DEFECT-10 — Audit log silently dropped admin actions** *(compliance)*
`AuditLog.actorId` was an ObjectId, but admin identities span two id systems mid-migration. A mega_admin's Postgres UUID threw `CastError`, which `logAdminAction` reduced to a `console.error`. The action returned 200 and **never appeared in the "immutable" trail**.
→ `actorId` is now a String (both shapes valid); failures log `AUDIT_WRITE_FAILED` with actor and action.
**Verified:** audit 14 → 15 entries; `settings.update` by mega_admin now recorded.

### Data integrity (3)

**DEFECT-8 — Hospital charts silently rendered fabricated data** *(most significant)*
`HospitalAppointment.facilityId` is an ObjectId; `resolveHospitalId` returns a string. `countDocuments`/`distinct` cast it — **`aggregate()` does not**. Every aggregation matched zero documents and fell through to hardcoded fallbacks, silently.

| Field | Before | After |
|---|---|---|
| `consultationVolume` | Nov 145 … Apr 261 *(fake; months not current)* | Jun 13, Jul 3, **Aug 1** |
| `appointmentTypes` | 75 / 20 / 5 *(fake)* | lab 47 / consultation 29 / procedure 24 |
| `kpi.thisMonth` | `1` *(real — visibly contradicted the chart)* | `1` ✓ consistent |

**DEFECT-7 — Analytics occupancy was `Math.random()`** — chart changed on every refresh. → Derived from real monthly appointment counts. Verified stable.

**DEFECT-6 — `/api/hospital/analytics` 404'd for every seeded admin** — used `resolvePostgresHospitalId` while all sibling routes use `resolveHospitalId`. → Matched to siblings. Verified 200.

### Functional (4)

**DEFECT-1 — Landing page unreachable.** `proxy.ts:123` redirected `/` → `/login` unconditionally; `app/page.tsx` never executed. Committed as "demo-ready" last session without ever loading it. → `/` public; signed-in users go to their dashboard. All 9 sections verified.

**DEFECT-3 — Wellness check-in 500 on bad input.** Range-only guards (`mood < 1`) don't reject strings — NaN comparisons are always false — so `"good"` passed validation then died as a CastError. → Type-checked. Verified 400.

**DEFECT-4 — Check-ins recorded a day early.** Local `setHours(0,0,0,0)` written, UTC read back. → `setUTCHours`. Verified files under the correct date.

**DEFECT-5 — Wellness score effectively always 100.** Base 50 + up to 100 more, clamped. mood 3 / 7h / 6000 steps scored the same as a perfect day. → Reweighted 40/30/30. Verified spread **26 / 68 / 89 / 100**.

### Identity & data layer (4) — found after reseeding

**DEFECT-11 — One account, two identities.** All 307 Postgres users had `mongo_id` null; the link column was never populated. `findLoginUser` returns `mongo_id || id`, so any account present in **both** stores got a Postgres uuid as its session identity while the rest of the app speaks ObjectIds. `mega@` and `super@` were exactly that case — **the direct cause of DEFECT-10**. Other accounts had no Postgres row, fell through to Mongo, and never showed the symptom.
→ Login now resolves the Mongo counterpart by email when the link is missing, prefers that ObjectId, and **backfills `users.mongo_id` so it self-heals**.
**Verified:** both admins now issue Mongo ObjectIds matching the admin list, and the link **re-established itself automatically after a full reseed wiped the column again**.

**DEFECT-12 — `resolvePostgresHospitalId` dead-ended.** It branched on id shape and committed to one path. Postgres-native facilities carry no `mongo_id`, so a hospital_admin holding a Mongo-shaped session id resolved to null and **every staff endpoint answered "No facility linked"**.
→ Falls back to mapping the identity to its Postgres `users.id`, then to an email match.

**DEFECT-13 — Toggle Duty 500.** The staff update helper passed caller keys straight to PostgREST. Callers use the Mongo model's camelCase; the table is snake_case, so `isOnDuty` failed with *"Could not find the 'isOnDuty' column of 'staff' in the schema cache"*. `department` worked only because it happens to be spelled the same in both.
→ Explicit camelCase → column map.

**DEFECT-14 — Staff profile 500 for every Postgres-native record.** `staffAny._id.toString()` — Postgres rows key on `id`, so `_id` was undefined.
→ Falls back to `id`, still emitting `_id` so the client is unchanged.

---

## ✅ VERIFIED WORKING (62 items executed)

### Authorization — all runtime-verified

**Chat IDOR (P0 #2) — 7/7 probes.** Built with two real patient accounts and conversation IDs from MongoDB.

| Test | Result |
|---|---|
| Read own conversation | ✅ 200 + messages |
| Read foreign conversation ×2 | ✅ **403** both |
| Write own conversation | ✅ 200, senderId = me |
| Write foreign conversation ×2 | ✅ **403** both |
| Spoof `senderId` in body | ✅ **ignored** — stored id = authenticated user |

**Mega vs super dual-gating** — the checklist called this the app's best "not just UI-hidden" example. **Confirmed true:**

| Test | Result |
|---|---|
| super reads settings | ✅ 200 |
| super writes settings | ✅ **403 "Mega admin access required"** |
| value after attempt | ✅ unchanged |
| mega writes settings | ✅ 200 + audit entry |

**Privilege escalation — 3/3 blocked server-side, state unchanged:**

| Attempt | Result |
|---|---|
| super modifies mega_admin | ✅ 403 "Cannot modify mega admin" |
| super suspends mega_admin | ✅ 403 "Forbidden" |
| super promotes patient → mega_admin | ✅ 403 "You cannot assign this role" |

**Confirmation dialogs — verified end-to-end, not just grepped.** Stubbed `window.confirm` to decline and intercepted `fetch`:

| Action | Message | On decline |
|---|---|---|
| Suspend user | *"Are you sure you want to suspend this user? They will lose access to all services."* | ✅ **zero mutating API calls** |
| Maintenance mode | *"⚠️ Maintenance mode will take the entire platform offline. Are you sure?"* | ✅ **toggle stayed off** |

### Authentication
Rate limit 5/15min → **429** ✅ · headers `limit:5, remaining:0, reset:+15min` ✅ · forgot-password non-enumerating ✅ · anonymous → protected APIs all **401** ✅ · login works for all 5 roles ✅ · enumeration fix caused no regression ✅

### Patient
Doctor ratings **stable across calls** (3.0–4.75, real DB) ✅ · fake `nextAvailableMinutes` gone ✅ · detail rating matches list ✅ · dashboard / health-record / appointments / wellness score / articles / conversations all 200 ✅ · wellness check-in persists and updates history ✅

### Practitioner
dashboard ✅ · queue ✅ · appointments ✅ · patients (9) ✅ · insights ✅ · billing ✅ · header-spoof rejected ✅

### Hospital admin
dashboard ✅ · performance **(real data after fix)** ✅ · analytics **(real data after fix)** ✅ · sla (6 rows) ✅

**Staff CRUD — full lifecycle, 7/7.** Previously unverifiable (endpoint 404'd); two steps were 500ing once reachable:

| Step | Before | After |
|---|---|---|
| Create | — | ✅ 200 |
| Appears in list | — | ✅ |
| **View profile** | ❌ **500** | ✅ 200 with KPIs |
| Edit (department) | — | ✅ 200 |
| **Toggle duty on** | ❌ **500** | ✅ 200 |
| Toggle duty off | — | ✅ 200 |
| Delete + gone from list | — | ✅ 200 |

### Mega/super admin
overview · users (82) · facilities · finance · audit · settings — all 200 ✅

### Marketing / responsive / a11y
9/9 sections ✅ · no horizontal overflow @375/768/1280 ✅ · CTAs route correctly ✅ · **0 dead footer links / 32** ✅ · **4/4 tap targets ≥44×44** ✅ · icon buttons have `aria-label` ✅

---

## 🟡 GAPS DISCLOSED — NOT FIXED

**GAP-1 — Practitioner queue will be empty in a demo.** 222 consultations exist; **zero are in the future**. The queue filters `scheduledStartTime >= now`, so it renders empty for every practitioner. Not a code bug — a seed-data gap. **Reseed with future consultations before demoing this page.** (Related: `status=completed` combined with that filter can never return anything.)

**GAP-2 — RESOLVED.** `scripts/seed-supabase.ts` was run (after a JSON backup of all 13 tables to `.backup-postgres/`, gitignored — it contains password hashes). That produced a linked `admin@milpark.netcare.co.za` + facility + staff. It was *not* sufficient on its own: reaching the endpoint then exposed DEFECT-12/13/14. Staff CRUD is now verified end-to-end.

> Note on the reseed: the app reads only 11 Postgres tables. `payment_transactions` (1,370) and `consultations` (1,000) are **not** among them — migration artifacts nothing queries — and `media_assets` is not in the script's wipe list, so uploads survived. MongoDB was untouched throughout.

**GAP-3 — Placeholder data still present, now labelled.**
- `analytics.revenueByDept`, `analytics.patientDemographics` — no backing source (no department/billing linkage on appointments; patient DOB unjoined). Now declared via `placeholderFields` in the response instead of passing as measured.
- `performance.kpi`: `satisfactionScore 4.8`, `activePatients 842`, `revenueGrowth 12.5` are literals. Only `totalConsultationsThisMonth` is real.

**GAP-4 — design.md violations (quantified).**

| Violation | Count | Rule |
|---|---|---|
| `react-icons` imports | **90 files** | §2.7 — standardise on lucide-react |
| Files mixing both icon libraries | **3** | `EventsCalendar`, `DoctorProfileModal`, `PatientHealthRecord` |
| `rose-*` | **76** | §2.1 — "retire entirely" |
| purple/violet as status | **24** | §2.1 — decoration only |
| Raw `bg-emerald/red/amber-*` | **85** | §3.4 — should be `<Badge status>` |

design.md's own audit recorded "11+" react-icons files; actual is **90** — ~8× larger than documented.

### Note: identity is split across two id systems
`mega@247digihealth.com` presents as Mongo `6a3bf0be…` in `/api/admin/users` but as Postgres UUID `f198c3e0…` in its own JWT. This directly caused DEFECT-10 and made admin endpoints reject the session-derived id. Worth reconciling before more code is written against either.

---

## ⏸️ STILL BLOCKED (~12 items)

- **Booking flow end-to-end** — needs multi-step UI interaction
- **Video / LiveKit** — needs two live participants and media devices
- **Refill decrement** — needs a prescription with `refillsRemaining > 0`
- **PDF / CSV exports** — need download interception
- **Practitioner queue UI actions** — blocked by GAP-1 (nothing renders)

---

## Honest Assessment

**Genuinely verified and safe to demo:** landing page, auth (incl. rate limiting and enumeration), chat IDOR, admin authorization model (dual-gating, escalation guards, confirmation dialogs), doctor discovery, wellness, hospital analytics/performance on real aggregations.

**Do not demo without reseeding:** practitioner queue is still empty — 222 consultations exist but none are in the future, and the queue filters scheduledStartTime >= now (GAP-1). Hospital staff management is now fixed and verified.

**The pattern:** 8 of 14 defects were in code marked "✅ FIXED" last session. Two showed a hospital administrator invented numbers. One let anyone read another practitioner's patient list via a header. The earlier "0 broken items" wasn't optimism — it was the predictable output of verifying by reading.

**Where things stand:** materially better than this morning, ~88% executed. The remaining 12% is blocked on UI-interaction testing (booking, video, exports) and GAP-1 seed data, not on unknown code quality.

---

**Files changed**

| File | Defects |
|---|---|
| `proxy.ts` | 1 |
| `app/api/auth/login/route.ts` | 2 |
| `app/api/patient/wellness/checkin/route.ts` | 3, 4, 5 |
| `app/api/hospital/analytics/route.ts` | 6, 7, 8 |
| `app/api/hospital/performance/route.ts` | 8 |
| `app/api/practitioner/queue/route.ts` | 9 |
| `lib/models/AuditLog.ts`, `lib/admin/logAdminAction.ts` | 10 |
| `components/LandingPage/Footer.tsx` | dead links |
| `components/auth/Login/LeftPanel.tsx`, `components/ui/Input.tsx` | tap targets |

**Commits:** `f3c9f9b` · `537ad7f` · `88e6131` · `5a63717` · `036617a`
**Typecheck:** clean across all modified files
