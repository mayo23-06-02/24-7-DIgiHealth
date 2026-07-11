# ANNEXURE A — Full System MVP Feature Status Checklist

**Product:** 24/7 DigiHealth  
**Audit date:** 2026-07-11  
**Method:** Full codebase review (App Router pages, APIs, models, UI components, integrations)  
**QA note:** No automated test suite (Jest/Vitest/Playwright/Cypress) was found. Therefore **“Complete & Tested” is not awarded** unless an item is trivial infrastructure only. Most shipping features are **Complete but not tested** pending formal UAT.

---

## Status codes

| Code | Column meaning |
|------|----------------|
| **CT** | Complete & Tested |
| **CBT** | Complete but not tested |
| **PC** | Partially complete |
| **NYC** | Not yet complete |
| **EXC** | Excluded from scope |
| **3P** | Requires 3rd-party integration (may co-exist with PC/CBT) |

Tick guidance for contract forms: mark the column matching the **Status** code below.

---

## 1. Authentication

| Module | Feature | Status | Notes |
|--------|---------|--------|-------|
| Authentication | Unified login (email / SA ID + password) | **CBT** | `POST /api/auth/login`; bcrypt; JWT cookie |
| Authentication | Role detection | **CBT** | JWT + dashboard layout + middleware roles |
| Authentication | Email OTP (primary) | **CBT** + **3P** | Supabase Auth Email OTP; login + registration; DigiHealth JWT bridge. See `docs/SUPABASE_EMAIL_OTP_AUTH.md`. Firebase Auth removed. |
| Authentication | Registration wizard (Patient / Practitioner / Admin) | **CBT** | `/register/[role]` + role profile creation |
| Authentication | Practitioner / admin approval workflow | **PC** | `pending_verification` / HPCSA fields exist; register sets `active` — no blocking approval queue |
| Authentication | Social login (Google / Facebook) | **PC** + **3P** | NextAuth social buttons present; depends on provider config |
| Authentication | Logout / session refresh | **CBT** | Logout + refresh routes |
| Authentication | Password change | **CBT** | Profile security + `/api/user/password` |

---

## 2. Patient Dashboard

| Module | Feature | Status | Notes |
|--------|---------|--------|-------|
| Patient Dashboard | Subscription status | **CBT** | Billing UI + subscription model |
| Patient Dashboard | 1-click book consultation | **CBT** | Book CTAs + booking/consult APIs + doctor discovery |
| Patient Dashboard | Payment history + PDF receipts | **PC** | History + CSV; **no dedicated PDF receipt** |
| Patient Dashboard | Health summary | **CBT** | Home vitals/summary widgets |
| Patient Dashboard | Doctors discovery / favourites | **CBT** | Doctors list + detail; my-doctors APIs |
| Patient Dashboard | Wellness hub | **PC** | UI strong; some mock fallbacks if APIs fail |
| Patient Dashboard | Visits history | **CBT** | Visits page present |

---

## 3. Appointments

| Module | Feature | Status | Notes |
|--------|---------|--------|-------|
| Appointments | Upcoming / past / cancelled tabs | **CBT** | Patient appointments view |
| Appointments | Join / reschedule / cancel | **CBT** | Implemented in appointments UI + APIs |
| Appointments | Rate consultation | **PC** | Doctor reviews exist; **not full post-visit rate-in-appointments flow** |
| Appointments | Calendar view (practitioner availability) | **CBT** | Slots + practitioner calendar |
| Appointments | Video / voice calls | **PC** + **3P** | Call APIs + CallButton + **LiveKit**; needs LiveKit keys |
| Appointments | Waiting room / join window | **CBT** | Waiting-room logic in appointments UI |

---

## 4. Health Record

| Module | Feature | Status | Notes |
|--------|---------|--------|-------|
| Health Record | Timeline (consults, prescriptions, labs) | **CBT** | Tabs + clinical models |
| Health Record | Vitals chart | **CBT** | Vitals tab + charts |
| Health Record | Labs and medications | **CBT** | Tabs + APIs |
| Health Record | Allergies and immunizations | **CBT** | Tabs + APIs |
| Health Record | Download PDF health record | **CBT** | Patient + practitioner PDF routes |
| Health Record | 3D body mapping | **CBT** | MedicalManikin + annotations |
| Health Record | Prescriptions list / download | **CBT** | Patient prescriptions API + docs |

---

## 5. Practitioner Dashboard

| Module | Feature | Status | Notes |
|--------|---------|--------|-------|
| Practitioner Dashboard | Clinical KPIs | **CBT** | Dashboard + insights |
| Practitioner Dashboard | Patient volume chart | **CBT** | Insights / dashboard charts |
| Practitioner Dashboard | Schedule management | **CBT** | Appointments + queue |
| Practitioner Dashboard | Patient profiles | **CBT** | Full patient clinical profile |
| Practitioner Dashboard | Patient list (filter / sort / export) | **CBT** | Filter modals + CSV/PDF export |
| Practitioner Dashboard | SOAP notes | **CBT** | Modal + consultation SOAP API |
| Practitioner Dashboard | Real-time messaging | **CBT** + **3P** | Messages + Ably/socket |
| Practitioner Dashboard | Clinical insights + PDF export | **CBT** | Insights engine + export route |
| Practitioner Dashboard | Risk score edit / bands | **CBT** | Risk card + bands (4 colours) |
| Practitioner Dashboard | AI diagnizer | **PC** + **3P** | UI + Gemini/AI routes; external AI key required |
| Practitioner Dashboard | Issue prescriptions + notify patient | **CBT** | Prescriptions API + chat notify |
| Practitioner Dashboard | Queue / risk alerts | **CBT** | Queue page + risk components |

---

## 6. Hospital Admin

| Module | Feature | Status | Notes |
|--------|---------|--------|-------|
| Hospital Admin | Facility overview (consults / revenue / staff) | **CBT** | Overview API + doctors/patients intelligence UI |
| Hospital Admin | Staff directory + scheduling | **CBT** | Staff CRUD + shift fields |
| Hospital Admin | Duty control + hiring registry | **PC** | Duty toggle complete; hiring = basic staff registry, not full HR |
| Hospital Admin | Reporting + CSV exports | **CBT** | CSV + **PDF** facility reports with filters |
| Hospital Admin | Performance / SLA / reviews | **CBT** | Pages + APIs present |
| Hospital Admin | Facility settings | **CBT** | Facility profile page |
| Hospital Admin | Appointments / billing views | **CBT** | Hospital admin modules |

---

## 7. Admin Dashboards (Super Admin / Mega Admin)

| Module | Feature | Status | Notes |
|--------|---------|--------|-------|
| Admin Dashboards | Platform overview / control tower | **CBT** | `/super_admin`, `/mega_admin` + `/api/admin/overview` |
| Admin Dashboards | Audit logs | **CBT** | AuditLog model + UI |
| Admin Dashboards | POPIA compliance reports | **PC** | Consent/version fields; **no inspector POPIA report pack**; no dedicated POPIA PDF suite |
| Admin Dashboards | User management | **CBT** | List, filter, suspend, role change (RBAC) |
| Admin Dashboards | Platform analytics | **CBT** | Analytics API + charts |
| Admin Dashboards | Payout approvals | **CBT** | Admin finance approve/reject/paid |
| Admin Dashboards | Facilities oversight | **CBT** | List + open/close |
| Admin Dashboards | Platform reports + PDF/CSV | **CBT** | `/api/admin/reports` + export PDF |
| Admin Dashboards | Alerts feed | **CBT** | Derived intelligence + payout alerts |
| Admin Dashboards | System settings (maintenance, flags) | **CBT** | Mega write; super read |
| Admin Dashboards | Inspector compliance dashboard | **NYC** | Nav entries only; **no inspector app pages** |

---

## 8. Messaging & Chat

| Module | Feature | Status | Notes |
|--------|---------|--------|-------|
| Messaging & Chat | Real-time chat | **CBT** + **3P** | UI + Ably / Socket.IO path |
| Messaging & Chat | Offline queue | **CBT** | `useOfflineQueue` + localStorage |
| Messaging & Chat | Typing indicators + read receipts | **CBT** | Events + read API |
| Messaging & Chat | File attachments | **CBT** + **3P** | Upload + Supabase media |
| Messaging & Chat | Voice messages | **CBT** | VoiceRecorder → audio/webm |
| Messaging & Chat | Quick medical phrases | **CBT** | `quick_phrase` type |
| Messaging & Chat | 1-click call escalation | **CBT** + **3P** | In-chat CallButton → LiveKit |
| Messaging & Chat | Unread counts / notifications | **CBT** | Unread API + notification bell |

---

## 9. Billing & Payments

| Module | Feature | Status | Notes |
|--------|---------|--------|-------|
| Billing & Payments | Subscription tiers (R250 / R500 / R1000) | **CBT** | UI prices 250 / 500 / 1000; model free/pro/family |
| Billing & Payments | Payment methods (card / medical aid / cash) | **PC** | Modeled + UI; not fully gateway-settled |
| Billing & Payments | Payment gateways | **NYC** + **3P** | No PayFast/Stripe/Ozow integration in code |
| Billing & Payments | Practitioner auto-payouts | **PC** + **3P** | Manual payout request + admin approval; not automated bank rails |
| Billing & Payments | Hospital facility billing | **CBT** | Hospital billing APIs + UI |
| Billing & Payments | PDF invoices | **PC** | Invoice fields / CSV more common; full patient PDF invoice incomplete |
| Billing & Payments | Admin / practitioner billing dashboards | **CBT** | Multi-role billing pages |

---

## 10. Language Support

| Module | Feature | Status | Notes |
|--------|---------|--------|-------|
| Language Support | All 11 SA official languages | **PC** | Full list on **practitioner consult languages** registration; **not** full UI i18n |
| Language Support | International languages (FR, PT, DE, ES, SW, AR, HI, ZH) | **NYC** | Not systematically supported |
| Language Support | Language indicator | **PC** | Doctor language tags/filters only; no global locale switcher |
| Language Support | App UI localisation (i18n) | **NYC** | No product-wide next-intl wiring |

---

## 11. Content

| Module | Feature | Status | Notes |
|--------|---------|--------|-------|
| Content | Blog + health tips | **CBT** / **PC** | Articles API + HealthBlog + wellness; tips often mock-fallback |
| Content | Blog carousel | **CBT** | Carousel on home + wellness |
| Content | Likes / saves / shares | **PC** | Model counters; share UI + localStorage bookmarks; no durable per-user like API |

---

## 12. Media & Documents

| Module | Feature | Status | Notes |
|--------|---------|--------|-------|
| Media | Unified Supabase media upload | **CBT** + **3P** | Signed upload hybrid; needs Supabase env |
| Media | Profile photo upload | **CBT** + **3P** | Avatar multipart upload |
| Media | Document vault (photos + PDFs) | **CBT** + **3P** | Profile documents tab + multi upload |
| Media | Prescription document attach | **CBT** + **3P** | Prescriptions + media |

---

## 13. Profile & Settings (all roles)

| Module | Feature | Status | Notes |
|--------|---------|--------|-------|
| Profile | Multi-tab profile (identity, role data, docs, security, alerts, billing) | **CBT** | Shared `[role]/profile` |
| Profile | Notifications preferences | **CBT** | Alerts tab |
| Profile | Device sessions revoke | **CBT** | Security devices |
| Profile | Completeness scoring | **CBT** | Profile health sidebar |

---

## 14. Infrastructure & Cross-cutting

| Module | Feature | Status | Notes |
|--------|---------|--------|-------|
| Infrastructure | Next.js App Router multi-role dashboards | **CBT** | Patient, practitioner, hospital_admin, super/mega |
| Infrastructure | MongoDB + Mongoose models | **CBT** | Core domain models |
| Infrastructure | JWT cookie auth middleware | **CBT** | proxy/middleware |
| Infrastructure | Ably realtime | **CBT** + **3P** | Config + auth route |
| Infrastructure | LiveKit A/V | **CBT** + **3P** | `lib/livekit` + panel |
| Infrastructure | Supabase storage | **CBT** + **3P** | Media system |
| Infrastructure | Gemini / AI routes | **PC** + **3P** | AI diagnizer/triage |
| Infrastructure | Sanity studio | **PC** + **3P** | `/studio` present; content strategy partial |
| Infrastructure | Automated tests (unit/E2E) | **NYC** | No test suite found |
| Infrastructure | Production payment PCI gateway | **NYC** + **3P** | Missing |
| Infrastructure | Supabase Email OTP auth | **CBT** + **3P** | `lib/supabase/auth.ts` + `/api/auth/otp/*` |

---

## Status tally (primary status only)

| Status | Count (approx.) |
|--------|----------------:|
| Complete & Tested (**CT**) | **0** |
| Complete but not tested (**CBT**) | **~70** |
| Partially complete (**PC**) | **~20** |
| Not yet complete (**NYC**) | **~8** |
| Excluded (**EXC**) | **0** |
| Requires 3rd-party (flag, co-status) | **~15** |

---

## Module readiness (executive view)

| Module | Overall readiness | Blockers for commercial go-live |
|--------|-------------------|----------------------------------|
| Authentication | High (core login) | Supabase Email OTP env + templates; approval workflow |
| Patient core | High | PDF receipts; payment gateway |
| Appointments | High | Rating flow; production LiveKit QA |
| Health record | High | Formal clinical UAT |
| Practitioner | High | AI key/reliability; UAT |
| Hospital admin | High | Hiring HR depth optional |
| Super/Mega admin | High (new) | POPIA report pack; UAT |
| Messaging | High | Ably/LiveKit production config |
| Billing | Medium | **Payment gateway**; auto-payouts; PDF invoices |
| Language | Low–Medium | Full i18n vs consult-language only |
| Content | Medium | Engagement APIs; tips without mocks |
| Inspector | Low | Pages not built |
| QA / tests | Low | No automated suite |

---

## Critical path before “Complete & Tested” signing

1. **Payment gateway** integration + recon  
2. **Supabase Email OTP** — enable Email provider + OTP; configure templates  


3. **Practitioner/admin approval** workflow before `active`  
4. **PDF receipts/invoices** for patients  
5. **POPIA compliance report** pack (inspector/admin)  
6. **UAT script** per module → promote CBT → CT  
7. Production config: Ably, LiveKit, Supabase, JWT secrets, email/SMS  
8. Optional: app i18n for 11 SA languages; international locales  

---

## Strongest vs weakest

**Strongest (CBT):** multi-role auth shell, patient appointments + health record + 3D map, practitioner patients/SOAP/insights, hospital overview/reports, super/mega control tower, chat stack (with 3P deps).

**Weakest / commercial blockers:** payment gateways, auto bank payouts, inspector POPIA UI, formal automated tests, full multi-language product UI. (Auth: Supabase Email OTP — requires Email provider enabled.)

---

*This document is a technical status annexure based on repository evidence as of the audit date. Legal sign-off still requires business UAT and security review.*
