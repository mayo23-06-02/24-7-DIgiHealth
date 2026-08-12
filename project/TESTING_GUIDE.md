# 24/7 DigiHealth — Comprehensive Testing Guide

**Purpose:** Step-by-step test instructions for every feature module across all roles. Use this to verify the platform is working end-to-end before demo.

**Date Prepared:** Aug 12, 2026  
**Platform Status:** All 93+ features completed and integrated. This guide verifies they work in practice.

**Testing Checklist Format:**
```
✅ COMPLETE - NOT YET TESTED
✅ COMPLETE - TESTED BY [USER/DATE]
```

---

## Quick Start: Test Environment Setup

1. **Dev Server:** `npm run dev` (runs on `http://localhost:3000`)
2. **Browser:** Use Chrome/Edge, test at three breakpoints:
   - Mobile: 375px (iPhone SE)
   - Tablet: 768px (iPad)
   - Desktop: 1280px (standard monitor)
3. **Test Data:** Use credentials from seeded database or register test accounts
4. **API Testing:** Open DevTools Network tab to verify API calls hit correct endpoints

---

## MODULE 1: Public / Marketing

### 1.1 Landing Page (`/`)

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `http://localhost:3000`
2. Verify NO redirect to `/login` (should see landing page)
3. Check page loads without console errors
4. Verify 9 sections render:
   - Navbar (top) with "Login" and "Get Started" buttons
   - Hero section with carousel/carousel indicators
   - Stats section (4.36B market, 27.5% CAGR, 43M+ users, 11 languages)
   - About Us section with feature cards
   - Approach section ("24/7 DigiHealth Total Care™")
   - Why Choose Us (5 values: Compassion, Collaboration, etc.)
   - Testimonials carousel (6 reviews, hover effects)
   - Blog section (3 featured articles)
   - Footer (newsletter signup, links, social icons)
5. **Responsive Test:**
   - Resize to 375px: all sections stack vertically, no horizontal scroll
   - Resize to 768px: proper tablet layout
   - Resize to 1280px: multi-column desktop layout
6. **CTA Test:**
   - Click "Login" → navigates to `/login`
   - Click "Get Started" → navigates to `/register`
   - Click "Explore Services" buttons → navigate correctly
7. **Carousel Test:**
   - Hero carousel: click arrows/dots, auto-advances
   - Testimonials: cycle through 6 reviews
8. **Email Capture:** Newsletter signup form exists (form submission wired to `/api/newsletter` if implemented)

**Expected Outcome:** Professional landing page with zero console errors, all sections rendering, all CTAs working, responsive at all breakpoints.

---

### 1.2 About Page (`/about`)

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/about` (or click About link in Navbar)
2. Verify page content loads (company mission, values, impact metrics)
3. Verify all CTA links work:
   - "Book a Free Consultation" → opens booking flow or `/register`
   - Social/external links → open in new tab
4. **Responsive Test:** Check layout at 375px, 768px, 1280px
5. Verify no console errors

**Expected Outcome:** About page displays properly with working CTAs, responsive design.

---

## MODULE 2: Authentication

### 2.1 Registration Flow

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/register`
2. **Patient Registration:**
   - Fill form: Email, Password, Confirm Password, First Name, Last Name, Phone
   - Click "Register as Patient"
   - Should create user and redirect to `/verify-email`
   - Verify email field accepts valid format, rejects invalid
   - Verify password strength indicator (if present)
3. **OTP Verification:**
   - Check email for OTP code (or check DB: `User` collection, `otp` field)
   - Enter OTP on `/verify-email`
   - Should verify and redirect to `/login`
   - Verify OTP expires after 10 minutes (try old code)
4. **Practitioner Registration:**
   - Go back to `/register`, select "Practitioner"
   - Fill additional fields: License Number, Specialization, etc.
   - Verify all role-specific fields required
5. **Hospital Registration:**
   - Similar flow with hospital-specific fields
6. **Error Cases:**
   - Register with existing email → should show error
   - Submit form with missing fields → validation shows
   - OTP mismatch → error message
7. **Responsive:** Test form at 375px, 768px, 1280px — mobile has full-screen sheet behavior

**Expected Outcome:** Users successfully register, OTP sent/verified, role-based fields captured, errors handled gracefully.

---

### 2.2 Login Flow

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/login`
2. **Successful Login:**
   - Enter valid email + password (from registration)
   - Click "Login"
   - Should redirect to role-specific dashboard:
     - Patient → `/patient`
     - Practitioner → `/practitioner`
     - Admin → `/hospital_admin` or `/mega_admin`
3. **Error Cases:**
   - Wrong password → "Invalid credentials" message
   - Non-existent email → same generic message (no email enumeration)
   - Empty fields → validation error
4. **Forgot Password Link:**
   - Click "Forgot Password?" → redirects to `/forgot-password`
5. **Register Link:**
   - Click "Register Here" → redirects to `/register`
6. **Rate Limiting:**
   - Try login 5+ times in 15 minutes → should be rate-limited
   - Check console for rate-limit headers (429 Too Many Requests)
7. **Session Persistence:**
   - Log in, refresh page → should stay logged in
   - Close browser, reopen → should require login again

**Expected Outcome:** Correct password grants access to role-specific dashboard. Wrong credentials denied. Rate limiting enforced. Session persists on refresh but expires on browser close.

---

### 2.3 Forgot/Reset Password

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/forgot-password` (or click "Forgot Password?" on login)
2. Enter registered email address
3. Click "Send Reset Email"
4. **Email Check:**
   - Check inbox for reset link (or DB: `User.resetTokenHash` should be set)
   - Link format: `/reset-password?token=<32-byte-token>`
5. **Reset Link Validation:**
   - Click reset link (or manually visit `/reset-password?token=<token>`)
   - Page should show "New Password" and "Confirm Password" fields
   - Expired token (10+ minutes old): should show error
6. **Password Reset:**
   - Enter new password (twice)
   - Click "Reset Password"
   - Should redirect to login with success message
   - Log in with new password → should work
   - Old password → should fail
7. **Security Tests:**
   - Try using same reset token twice → second attempt fails (single-use)
   - Try modifying token in URL → fails
   - No rate limiting bypass via multiple requests
8. **Responsive:** Form works at all breakpoints

**Expected Outcome:** Password reset email sent, token valid for 10 minutes, password changed successfully, token single-use.

---

## MODULE 3: Patient Dashboard & Features

### 3.1 Home Dashboard

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. **Login as Patient** → lands on `/patient`
2. **Page Content:**
   - Page header: "Welcome back, [First Name]"
   - KPI cards: Weight, Height, Last Updated timestamp
   - (HR/BP/Glucose cards are intentionally commented out)
3. **Update Vitals Button:**
   - Click "Update Vitals" or similar CTA
   - Modal opens with form: Weight, Height (optional HR/BP/Glucose)
   - Fill values, click Save
   - Check API call: `POST /api/patient/vitals`
   - KPI cards update immediately
   - Modal closes
4. **Doctor Carousel:**
   - Section shows 3-4 "Recently Booked" doctors
   - Click doctor card → opens doctor detail page or booking modal
   - Click heart icon → adds/removes from favorites
5. **Calendar Widget:**
   - Mini calendar shows upcoming appointments
   - Click date → navigates to full appointments page
6. **Notifications/Messages Badge:**
   - Should show count of unread messages (if any)
   - Click → navigates to `/patient/messages`
7. **Responsive Test:**
   - 375px: cards stack, carousel scrolls
   - 768px: 2-column layout
   - 1280px: full-width layout

**Expected Outcome:** Dashboard loads with real vitals data, update modal works, doctor carousel displays, calendar shows upcoming appointments.

---

### 3.2 Doctor Search & Discovery

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/patient/doctors`
2. **Page Load:**
   - Should list 10+ doctors with cards showing:
     - Name, Specialty, Rating (e.g., 4.8 ⭐), Review count (e.g., 127 reviews)
     - Avatar, Languages spoken, Facility/Location
     - "Book", "Message" buttons
3. **Search Functionality:**
   - Type doctor name in search box (e.g., "Smith")
   - List filters in real-time
   - Clear search → full list reappears
   - Search for specialty (e.g., "Cardiology") → should filter by specialization
4. **Filter/Sort:**
   - Filters should exist for: Specialization, Language, Location
   - Click filter → list updates
   - Click sort (e.g., "Rating: High to Low") → re-sorts
5. **Doctor Cards:**
   - Rating displays DB value (not random) — should be consistent
   - Review count displays DB value
   - Click doctor card → opens detail page
6. **Book Button:**
   - Click "Book" → opens booking modal
   - See test 3.3 for booking flow
7. **Message Button:**
   - Click "Message" → should open chat or conversation creation
8. **Favorites Section:**
   - Top of page: "My Doctors" carousel
   - Shows previously favorited doctors
   - Click heart → removes from favorites
9. **Responsive Test:**
   - 375px: single-column card list, filters stacked
   - 768px: 2-column grid
   - 1280px: 3-column grid, filters in sidebar
10. **Rating/Review Consistency:**
   - Navigate away and back → ratings should be same (not random)
   - Open same doctor in new tab → same ratings in both tabs

**Expected Outcome:** Doctor list loads with real ratings/reviews from DB, search/filter work, responsive at all sizes, ratings consistent on refresh.

---

### 3.3 Doctor Profile & Booking

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Click on any doctor card → `/patient/doctors/[id]`
2. **Doctor Details:**
   - Full name, specialty, rating, review count
   - Bio/About section
   - Qualifications, languages, facilities
   - Reviews section (read-only or with submit review option)
3. **Book Appointment:**
   - Click "Book Appointment" → multi-step modal opens
   - **Step 1 - Reason:** Select reason for consultation (dropdown or text)
   - **Step 2 - Date/Time:** Calendar showing available slots
     - Scroll through dates, click available time
     - Should show practitioner's schedule constraints
   - **Step 3 - Consultation Type:** Radio/select for Video or Chat
   - **Step 4 - Confirm & Pay:**
     - Summary of booking (date, time, type, cost)
     - "Confirm Booking" button
4. **Booking API Call:**
   - Watch Network tab: POST to `/api/bookings`
   - Should return booking ID and confirmation
5. **Post-Booking:**
   - Toast notification: "Appointment booked!"
   - Modal closes
   - User redirected to `/patient/appointments`
   - New booking appears in list
6. **Responsive:**
   - 375px: modal is full-screen sheet from bottom
   - 768px/1280px: centered modal
7. **Rating Display:**
   - Doctor rating should match `/patient/doctors` list
   - No random values on each view

**Expected Outcome:** Booking modal captures all required info, API call succeeds, new appointment appears in calendar and list.

---

### 3.4 Appointments List & Management

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/patient/appointments`
2. **View Appointments:**
   - List view showing:
     - Doctor name, date/time, status (Confirmed/Pending/Completed)
     - Consultation type (Video/Chat)
     - Action buttons: "Join Call" (if time), "Cancel", "Reschedule"
   - Calendar view option (toggle at top)
3. **Status Filtering:**
   - Filter tabs: "Upcoming", "Past", "Cancelled"
   - Click filter → list updates
4. **Cancel Appointment:**
   - Click "Cancel" on an upcoming appointment
   - Confirmation dialog appears: "Are you sure?"
   - Click "Yes" → API call: `DELETE /api/patient/appointments/[id]`
   - Appointment moves to "Cancelled" section
   - Toast: "Appointment cancelled"
5. **Reschedule Appointment:**
   - Click "Reschedule" on upcoming appointment
   - Booking modal opens (same as 3.3)
   - Select new date/time
   - Confirm → old appointment cancelled, new one created
6. **Join Call (if time):**
   - For appointment within 15 minutes of current time:
     - "Join Video/Chat" button appears
     - Click → redirects to `/patient/lobby/[appointmentId]`
     - See test 3.5 for video lobby
7. **Calendar View:**
   - Toggle to calendar view
   - See appointments on specific dates
   - Click appointment → shows detail modal
   - Modal has same actions (cancel, reschedule, join)
8. **Responsive:**
   - 375px: single column, full-width cards
   - 768px: 2-column
   - 1280px: 3-column or table view

**Expected Outcome:** Appointments list displays real data, filters work, cancel/reschedule trigger API calls, join call button appears at correct time.

---

### 3.5 Video/Chat Consultation Lobby

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. **Trigger Conditions:**
   - Appointment must be within 15 minutes of current time (or use dev tools to mock time)
   - Click "Join Call" from appointments list OR navigate directly to `/patient/lobby/[appointmentId]`
2. **Lobby Page:**
   - Shows appointment details: Doctor name, date/time, type (video/chat)
   - Countdown timer showing time until appointment start
   - "Join Now" button (disabled until appointment time)
   - Preview of camera/audio (if video consultation)
3. **Auto-Join Logic:**
   - At appointment start time, page auto-redirects to call
   - OR user can click "Join Now" when enabled
4. **Video Call (LiveKit):**
   - If video consultation:
     - Should load LiveKit video component
     - Camera/microphone input available
     - "End Call" button
     - Participant list showing doctor + patient
5. **Chat Consultation:**
   - If chat consultation:
     - Chat window opens instead of video
     - Message input box
     - See test 3.6 for chat details
6. **Error Handling:**
   - Wrong appointment ID → 404 error
   - Appointment in past → "This consultation has ended"
   - Not a participant → 403 "Unauthorized"
7. **Responsive:** Layout adapts to mobile (full-screen video/chat)

**Expected Outcome:** Lobby shows countdown, auto-joins at appointment time or on user click, video/chat loads correctly.

---

### 3.6 Messaging & Chat

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/patient/messages` OR open chat during consultation
2. **Conversations List:**
   - Shows all conversations with doctors/practitioners
   - Displays: Name, last message preview, timestamp, unread badge
   - Click conversation → opens chat
3. **Chat Window:**
   - Message list shows chronological conversation
   - User messages (blue/right-aligned), doctor messages (gray/left-aligned)
   - Timestamps on each message
4. **Send Message:**
   - Type message in input box
   - Press Enter or click Send
   - Watch API call: `POST /api/chat/messages`
   - Message appears immediately in chat
   - API returns message ID and timestamp
5. **Message Features:**
   - Emoji support (if ported)
   - File attachments (click paperclip, upload file)
   - Files call `POST /api/media/upload` or `POST /api/chat/upload`
6. **Read Receipts (if implemented):**
   - Watch for checkmarks on sent messages
   - When doctor reads, checkmark updates
7. **Security Test (IMPORTANT):**
   - Open browser console
   - Try to send message as different user:
     ```javascript
     fetch('/api/chat/messages', {
       method: 'POST',
       body: JSON.stringify({
         consultationId: 'some-id',
         senderId: 'different-user-id',  // try to spoof
         message: 'hacked'
       })
     })
     ```
   - Should return 403 Forbidden (server enforces authentication + participancy)
8. **Real-time Updates (optional):**
   - Open chat on two devices/tabs
   - Send message from one
   - Check if other tab updates in real-time (Ably/Socket.IO)
9. **Responsive:** Chat works at all breakpoints, keyboard visible on mobile

**Expected Outcome:** Messages send via API, user sees real-time update, authorization prevents IDOR, files upload correctly.

---

### 3.7 Health Record

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/patient/health-record`
2. **Tab Navigation:**
   - Tabs: Timeline, Vitals, Labs, Medications, Allergies, Immunizations
   - Click each tab → content updates
3. **Timeline Tab:**
   - Shows chronological health events
   - Each entry: date, event type, description
   - Click entry → detail modal (optional)
4. **Vitals Tab:**
   - Table/list of vitals: Weight, Height, HR, BP, Glucose
   - Dates, values, trends (up/down arrows if available)
   - "Add Vital" button (if allowed)
5. **Labs Tab:**
   - Test results with:
     - Test name, date, result value, normal range
     - Status indicator (normal/abnormal)
   - Click result → view detailed report (PDF or detail page)
6. **Medications Tab:**
   - Current prescriptions listed
   - For each: Drug name, dosage, frequency, prescriber, refills remaining
   - **Refill Request:**
     - Click "Request Refill" on active prescription
     - If refills remaining > 0:
       - Modal confirms refill
       - API call: `POST /api/patient/prescriptions` with `action: 'refill'`
       - Toast: "Refill request sent"
       - Refills remaining counter decrements
     - If refills = 0:
       - Button disabled or error: "No refills remaining"
7. **Allergies Tab:**
   - List of known allergies
   - "Add Allergy" button → modal with:
     - Allergen name, reaction description, severity
     - Save → `POST /api/patient/health-record/allergies`
   - "Remove" button on each → confirms deletion
8. **Immunizations Tab:**
   - Vaccination history: vaccine name, date, provider
   - Status (up-to-date or overdue)
9. **PDF Report:**
   - "Download PDF" button at top
   - Click → generates and downloads health record PDF
   - API call: `GET /api/patient/health-record/report`
10. **Body Annotations (if 3D manikin available):**
    - Expandable section for body annotations
    - Click on body diagram → add annotation (injury, pain, etc.)
11. **Responsive:** Tabs stack on mobile, table columns collapse into cards

**Expected Outcome:** All tabs load real data from APIs, refill decrement refills_remaining counter, new allergies save to DB, PDF downloads.

---

### 3.8 Wellness Hub

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/patient/wellness`
2. **Wellness Score Card:**
   - Shows current score (0-100)
   - Streak count (e.g., "5-day streak")
   - Last 7 days chart/history
   - API: `GET /api/patient/wellness/score`
3. **Daily Check-in:**
   - Section for mood, sleep hours, steps
   - Mood selector (emoji or text)
   - Sleep input (numeric hours)
   - Steps input (numeric)
   - "Submit Check-in" button
   - API: `POST /api/patient/wellness/checkin`
4. **Post Check-in:**
   - Toast: "Check-in recorded! Keep it up."
   - Score updates immediately
   - Streak counter increments (if day is new)
   - 7-day history chart adds new entry
5. **Health Tips Section:**
   - "Smart Health Tips" showing recommended articles/tips
   - Based on wellness score or user profile
   - Click tip → opens article (or expands inline)
6. **Articles/Clinical Library:**
   - Grid/list of published articles
   - Each shows: title, category, excerpt, read time
   - Click article → opens full article page
   - API: `GET /api/articles` with optional filters (category, limit)
7. **Motivational Quote:**
   - Random quote displayed at top or in sidebar
   - May call third-party API (api.quotable.io)
   - Has fallback quote if API unavailable
8. **Responsive:**
   - Check-in form stacks on mobile
   - Chart scales to viewport
9. **Consistency Test:**
   - Submit check-in, refresh page → data persists
   - Navigate away and back → same wellness score

**Expected Outcome:** Daily check-in records mood/sleep/steps, score updates, streak increments on new days, articles load and display.

---

### 3.9 Billing & Subscriptions

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/patient/billing`
2. **Billing Summary:**
   - Current plan name and status (Active, Paused, etc.)
   - Monthly cost
   - Next billing date
   - Subscription buttons: "Upgrade", "Cancel", "Pause"
3. **Payment Methods:**
   - List of saved payment methods
   - Display: Card brand/last 4 digits or medical aid provider
   - "Default" badge on primary method
   - "Add New" button → opens payment method modal
   - Delete (×) button → confirmation then DELETE API call
4. **Add Payment Method Modal:**
   - Options: Credit Card, Debit Card, Medical Aid, Bank Transfer
   - Card form: card number, expiry, CVV, cardholder name
   - Medical Aid form: provider, member number
   - Save → API call (backend integration with payment processor)
5. **Transaction History:**
   - Table/list of transactions
   - Date, description, amount, status (Pending, Completed, Failed)
   - Click transaction → detail/receipt (optional)
6. **Invoice/Receipt Download:**
   - "Download PDF" link per transaction
   - Should generate invoice with user info, itemization, payment method
7. **Subscription Management:**
   - "Upgrade Plan" → shows available tiers, pricing
   - Select tier → modal confirms upgrade
   - Click "Upgrade" → API call, toast confirmation
   - "Cancel Subscription" → confirmation dialog with reason
   - Click "Cancel" → marks subscription for cancellation at period end
8. **Orders & Refills Widget:**
   - Shows recent orders (from pharmacy/supplies)
   - Current items: prescriptions, medical supplies
   - Status (Processing, Shipped, Delivered)
9. **API Verification:**
   - `POST /api/billing/payment-methods` → save method
   - `DELETE /api/billing/payment-methods/[id]` → remove method (requires confirmation)
   - `GET /api/billing` → fetch billing summary
   - `POST /api/billing` → upgrade/cancel subscription
10. **Responsive:** Forms adapt to mobile, table has card-view fallback

**Expected Outcome:** Payment methods save/delete with API calls, transactions display, subscription changes persist, invoices download.

---

## MODULE 4: Practitioner Dashboard & Features

### 4.1 Queue Management

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. **Login as Practitioner** → lands on `/practitioner`
2. Navigate to `/practitioner/queue`
3. **Queue Page:**
   - Table/list showing upcoming consultations
   - Columns: Patient name, time, reason, consultation type (video/chat), risk score
   - Status badge: Scheduled, Ongoing, Completed
   - Action buttons: "Join Video/Chat", "SOAP Note", "Patient Profile"
4. **Filtering:**
   - Status filter tabs: "Active" (scheduled+ongoing), "Completed", "Cancelled"
   - Click filter → list updates
5. **Time Indicators:**
   - For appointments < 60 min away: red "in Xm" badge
   - Sorted by time (soonest first)
6. **Join Video/Chat Button:**
   - For active appointment:
     - Click "Join Video" (if video) or "Join Chat" (if chat)
     - API: `GET /api/practitioner/queue` (verify data fetch)
     - Navigate to `/practitioner/lobby/[consultationId]`
     - See video/chat window load
7. **SOAP Note Button:**
   - Click "SOAP Note" icon/button
   - Modal opens with form: Subjective, Objective, Assessment, Plan
   - Text inputs for each section (rich text optional)
   - "Save" button
   - API: `POST /api/practitioner/consultations/[id]/soap`
   - Toast: "SOAP note saved"
   - Can open existing note, edit, save again
8. **Patient Profile Button:**
   - Click "Patient Profile" → navigates to `/practitioner/patients/[patientId]`
   - See full patient health record (test 4.3)
9. **Risk Score Display:**
   - Color-coded: Green (low), Orange (medium), Red (high)
   - Risk factors listed (if high-risk)
   - AI recommendations shown (if any)
10. **Search:**
    - Search by patient name
    - Filters queue in real-time
11. **Pagination:**
    - Queue might show 15 at a time
    - Next/Previous buttons if more than 15
12. **Responsive:**
    - 375px: card-view (not horizontal scroll)
    - 768px/1280px: table view
13. **Data Accuracy:**
    - Reload page → same queue items (not random)
    - Close and reopen browser → still same data

**Expected Outcome:** Queue loads real appointments, join call navigates correctly, SOAP notes save via API, patient profile accessible.

---

### 4.2 Patient Management / Patient List

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/practitioner/patients`
2. **Patient List:**
   - Table/cards showing all practitioner's patients
   - Columns: Name, Medical ID, Last Appointment, Status, Action buttons
3. **Search:**
   - Search by name, medical ID, or email
   - Filters in real-time
4. **Sorting:**
   - Sort by: Last Appointment (newest/oldest), Name (A-Z)
5. **Click Patient Card:**
   - Navigate to `/practitioner/patients/[patientId]`
   - See test 4.3 for patient detail page
6. **Pagination:**
   - Show 10-20 patients per page
   - Next/Previous navigation
7. **Add Patient (if enabled):**
   - "Add Patient" button → modal with patient search/invite
   - Enter patient email or medical ID
   - Send invite → patient must accept link to link to this practitioner

**Expected Outcome:** Patient list loads, search works, clicking patient navigates to detail page.

---

### 4.3 Patient Profile / Health Record

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Click patient from queue or patient list → `/practitioner/patients/[id]`
2. **Patient Header:**
   - Name, age, medical ID, emergency contact
   - Risk score (color-coded)
3. **Tabs:**
   - Overview, Timeline, Vitals, Labs, Medications, Allergies, Documents, AI Insights
4. **Overview Tab:**
   - Quick stats: age, gender, medical aid, last appointment
   - Clinical summary/notes
   - Active medications
   - Known allergies
5. **Timeline Tab:**
   - Chronological health events and consultations
   - Each entry: date, type, notes, provider
6. **Vitals Tab:**
   - Historical vitals with chart
   - Latest values highlighted
   - "Add Vital" button → modal to record new vital (BP, HR, etc.)
   - Save → API: `POST /api/practitioner/patients/[id]/vitals`
7. **Labs Tab:**
   - Lab results with interpretation (normal/abnormal)
8. **Medications Tab:**
   - Active and past prescriptions
   - "Add Prescription" button (if enabled)
   - Modal: drug name, dosage, frequency, duration, refills
   - Save → API: `POST /api/practitioner/prescriptions`
9. **Allergies Tab:**
   - Known allergies and reactions
10. **Documents Tab:**
    - Uploaded documents, reports, scan files
    - "Upload Document" button
    - File upload → `POST /api/practitioner/patients/[id]/documents`
11. **Risk Score Editing:**
    - Click risk score card → edit modal
    - Update risk factors (e.g., diabetes, hypertension)
    - Select severity
    - Save → API: `PATCH /api/practitioner/patients/[id]/risk`
12. **AI Clinical Support (if available):**
    - "AI Insights" or "Clinical Decision Support" tab
    - Shows drug interactions, contraindications
    - AI recommendations based on patient profile
13. **Print/Export:**
    - "Print Patient Profile" → generates PDF
    - "Export as CSV" (if applicable)
14. **Responsive:** Tabs stack on mobile, forms resize

**Expected Outcome:** All patient data loads, vitals/medications/allergies can be added via API, risk score editable, PDF export works.

---

### 4.4 Consultations History

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/practitioner/consultations` OR `/practitioner/appointments?tab=completed`
2. **Consultations List:**
   - Table showing completed consultations
   - Patient name, date, duration, reason, notes
   - Status: Completed
3. **Click Consultation:**
   - Opens detail modal showing:
     - Patient info
     - SOAP note (if filled during consultation)
     - AI recommendations provided
     - Notes/follow-up actions
4. **Edit SOAP Note:**
   - If note exists, can click "Edit"
   - Update fields
   - Save → API: `PATCH /api/practitioner/consultations/[id]/soap`
5. **Print/Export:**
   - "Print Consultation" → PDF
   - "Download SOAP" → PDF export of note

**Expected Outcome:** Consultations load, SOAP notes display and edit, PDFs export correctly.

---

### 4.5 Billing & Earnings

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/practitioner/billing`
2. **Earnings Summary:**
   - Total earnings (month/year/all-time)
   - Pending payments
   - Paid-out amounts
   - Payment method on file
3. **Transaction List:**
   - Each consultation/service generates transaction
   - Date, patient, amount, status (Pending/Paid)
   - Sorting by date or amount
4. **Payout Management:**
   - Next payout date
   - "Request Payout" button (if threshold met)
   - Payout history (previous transfers)
5. **CSV/PDF Export:**
   - "Download Billing" → exports transaction list as CSV or PDF
6. **API Verification:**
   - `GET /api/practitioner/billing` → fetches earnings data
   - Should return real data, not randomized amounts

**Expected Outcome:** Earnings display real consultation revenue, payouts calculate correctly, exports work.

---

## MODULE 5: Hospital & Hospital Admin

### 5.1 Facility Overview / Dashboard

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. **Login as Hospital Admin** → lands on `/hospital_admin`
2. **Dashboard KPIs:**
   - Total patients, active consultations, today's appointments
   - Staff count (doctors, nurses)
   - Operational status
3. **Charts:**
   - Doctor overview (docs by specialty)
   - Patient overview (active vs past)
   - Hospital charts (occupancy, wait times if available)
4. **Recent Activity:**
   - Recent consultations, new patient registrations
   - Staff changes
5. **API Verification:**
   - Network tab: `GET /api/hospital/dashboard` loads KPI data
   - Data updates on refresh

**Expected Outcome:** Dashboard loads real facility data via API, charts render correctly.

---

### 5.2 Facility Management

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/hospital_admin/facility` or settings
2. **Facility Details:**
   - Name, address, contact info, license number
   - Logo upload
   - Capacity info
3. **Edit Facility:**
   - Click "Edit" → form opens with all fields
   - Update name, address, etc.
   - Click "Save" → API: `PATCH /api/hospital/facility`
   - Toast: "Facility updated"
4. **Logo Upload:**
   - Upload image → preview
   - Save → stores in Supabase
5. **Services Offered:**
   - Checkboxes or list of medical services
   - Select/deselect services
   - Save changes

**Expected Outcome:** Facility data editable and persists via API.

---

### 5.3 Staff Management

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/hospital_admin/staff`
2. **Staff List:**
   - Table showing: Name, License Number, Specialty, Status, Actions
3. **Add Staff:**
   - "Add Staff" button → modal with form
   - Name, email, license, specialization
   - Save → API: `POST /api/hospital/staff`
   - New staff appears in list
4. **Edit Staff:**
   - Click edit icon on staff row
   - Modal opens with pre-filled data
   - Update fields
   - Save → API: `PATCH /api/hospital/staff/[id]`
5. **Toggle Duty Status:**
   - Click toggle on staff row
   - Change from On-Duty to Off-Duty (or vice versa)
   - API: `PATCH /api/hospital/staff/[id]` with status update
6. **Delete Staff:**
   - Click delete icon → confirmation dialog
   - "Are you sure?" → Click "Delete"
   - API: `DELETE /api/hospital/staff/[id]`
   - Staff removed from list
7. **View Staff Profile:**
   - Click staff name → detail page `/hospital_admin/staff/[id]/profile`
   - Shows: full profile, performance metrics, consultations
8. **Invite Staff:**
   - "Invite Doctor" button → modal
   - Enter email
   - Sends invite link to email
   - Doctor clicks link → onboarding flow to link to this hospital
9. **Responsive:**
   - 375px: cards view (not horizontal scroll)
   - 768px/1280px: table view
10. **Data Integrity:**
    - Reload page → same staff list (not random)

**Expected Outcome:** Add/edit/delete staff via API, changes persist, invites send emails.

---

### 5.4 Appointments Management

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/hospital_admin/appointments`
2. **Appointments List:**
   - Table: Patient, Doctor, Date/Time, Status, Actions
3. **Filter:**
   - By status (Scheduled, Ongoing, Completed, Cancelled)
   - By date range
   - By doctor/patient
4. **Create Appointment:**
   - "Create Appointment" button → multi-step modal
   - Step 1: Select patient (search or dropdown)
   - Step 2: Select doctor
   - Step 3: Pick date/time
   - Step 4: Confirm
   - Submit → API: `POST /api/hospital/appointments`
5. **Cancel Appointment:**
   - Click "Cancel" on appointment row
   - Confirmation → Click "Cancel"
   - API: `DELETE /api/hospital/appointments/[id]`
   - Appointment moves to "Cancelled" section
6. **View Appointment Details:**
   - Click appointment row → detail modal
   - Patient info, doctor, date, reason, notes
7. **Responsive:** Table has card fallback on mobile

**Expected Outcome:** Appointments list loads, create/cancel work via API.

---

### 5.5 Hospital Performance Dashboard

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/hospital_admin/performance`
2. **KPI Cards:**
   - Total Consultations: should show real number
   - Patient Satisfaction: e.g., "4.8 / 5"
   - Active Patients: real count
   - Revenue Growth: e.g., "12%"
   - All values should be from DB, not hardcoded
3. **Charts:**
   - **Consultation Volume:** Line chart showing last 6 months
     - X-axis: Month, Y-axis: Count
     - Should show realistic data (not flat line)
   - **Appointment Types:** Pie chart (Consultation, Procedure, Follow-up, Lab)
   - **Patient Satisfaction Trend:** Bar chart showing rating over time
4. **API Verification:**
   - Network tab: `GET /api/hospital/performance` returns data
   - Data includes: kpis, consultationVolume, satisfactionTrend, appointmentTypes
5. **Loading State:**
   - On first load: spinner visible
   - After load: content appears
6. **Error Handling:**
   - If API fails: error message displays (not blank page)
7. **Data Consistency:**
   - Refresh page → same KPI values (not random)

**Expected Outcome:** KPI cards show real data, charts render with realistic data points, loading/error states work.

---

### 5.6 Hospital Analytics

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/hospital_admin/analytics`
2. **Charts:**
   - **Occupancy Trend:** Line chart, 12-month data with occupancy %
   - **Revenue by Department:** Bar chart (Emergency, Surgery, Cardiology, etc.)
   - **Patient Demographics:** Pie or doughnut chart (age groups: 0-18, 19-35, 36-50, 51-65, 65+)
   - **Appointment Distribution:** Bar chart (Consultation, Procedure, Follow-up, Lab)
3. **Summary Section:**
   - Avg Occupancy: e.g., "72%"
   - Total Revenue: e.g., "$275,000"
   - Total Patients: e.g., "16,700"
   - Total Appointments: e.g., "8,500"
4. **API Verification:**
   - `GET /api/hospital/analytics` returns: occupancyTrend, revenueByDept, patientDemographics, appointmentDistribution, summary
5. **Data Consistency:**
   - Refresh → same data
   - No random/fabricated values

**Expected Outcome:** All charts render with real data, summary stats calculate correctly.

---

### 5.7 SLA Tracking

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/hospital_admin/sla`
2. **SLA Targets Table:**
   - Rows: Emergency Response, Wait Times, Telehealth Connect, Lab Turnaround, Booking Time, Discharge Processing
   - Columns: Target, Current, Status (Met/At Risk/Breached)
3. **Status Indicators:**
   - Green (Met): actual ≤ target
   - Yellow (At Risk): actual approaching target
   - Red (Breached): actual > target
4. **Sorting/Filtering:**
   - Sort by target, current value, or status
   - Filter by status (show only "At Risk", etc.)
5. **Data Sources:**
   - API: `GET /api/hospital/sla`
   - Should return real facility SLAs (not hardcoded for all facilities)
6. **Responsive:** Table → cards on mobile

**Expected Outcome:** SLA targets display with correct status indicators, data is facility-specific.

---

### 5.8 Billing & Finance

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/hospital_admin/billing` or `/hospital_admin/finance`
2. **Financial Summary:**
   - Total Revenue (month/year)
   - Pending Payments
   - Paid-out Amounts
3. **Transaction List:**
   - Table: Date, Patient/Description, Amount, Payment Method, Status
   - Filter by date range, payment method, status
   - Sorting
4. **CSV/PDF Export:**
   - "Download Billing" → generates CSV or PDF report
   - Report includes: all transactions, summary totals
5. **API Verification:**
   - `GET /api/hospital/billing` fetches transactions
   - Data should be real (not randomized)

**Expected Outcome:** Financial data displays, filtering works, exports generate correctly.

---

### 5.9 Staff Profile (Detail View)

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/hospital_admin/staff/[staffId]/profile`
2. **Tabs:**
   - Overview, Performance, Consultations, Availability
3. **Overview Tab:**
   - Name, specialty, license, contact info
   - Status (On-Duty, Off-Duty)
   - Avg Response Time (e.g., "18 min")
4. **Performance Tab:**
   - Consultation count
   - Patient satisfaction rating
   - Cancellation rate
5. **Consultations Tab:**
   - List of consultations completed by this staff
   - Date, patient, duration, notes
6. **Availability Tab:**
   - Weekly schedule (if available)
   - Working hours
7. **Responsive:** Tabs stack on mobile, content scales

**Expected Outcome:** Staff profile displays all info across tabs, responsive design works.

---

## MODULE 6: Admin (Mega/Super Admin)

### 6.1 User Management

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/mega_admin/users` or `/super_admin/users`
2. **User List:**
   - Table: Name, Email, Role, Status, Actions
   - Roles: Patient, Practitioner, Hospital, Hospital Admin, Mega Admin, Super Admin
3. **Search & Filter:**
   - Search by name or email
   - Filter by role
   - Filter by status (Active, Suspended)
4. **Suspend/Unsuspend User:**
   - Click "Suspend" on active user
   - **Confirmation dialog:** "Are you sure you want to suspend this user?" (required)
   - Confirm → API: `PATCH /api/admin/users/[id]` with status=suspended
   - Toast: "User suspended"
   - User row updates to show "Suspended" status
   - Click "Unsuspend" → reverse operation
5. **Change User Role:**
   - Click "Change Role" or dropdown on user row
   - Modal/select shows available roles
   - **Confirmation:** "Are you sure you want to change this user's role to [NEW ROLE]?" (required)
   - Select new role → Confirm
   - API: `PATCH /api/admin/users/[id]` with role update
   - Toast: "Role updated"
6. **Role Scoping (if Mega vs Super):**
   - Super Admin: can assign Patient, Practitioner, Hospital roles
   - Mega Admin: can assign all roles
   - Verify API 403s if attempting to assign role beyond scope
7. **Responsive:** Table → cards on mobile
8. **Confirmation Dialog Test:**
   - Verify dialogs appear for suspend/role change (CRITICAL)
   - User should NOT be able to accidentally change roles

**Expected Outcome:** User list loads, suspend/unsuspend works with confirmation, role changes require confirmation and persist via API, scoping enforced.

---

### 6.2 Facility Management

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/mega_admin/facilities`
2. **Facilities List:**
   - Table: Name, Location, Doctors, Patients, Appointment Count, Status, Actions
3. **Filter/Sort:**
   - Sort by name, location, status
   - Filter by status (Open, Closed)
4. **Open/Close Facility:**
   - Click toggle on facility row
   - Change from Open to Closed (or vice versa)
   - Confirmation dialog
   - API: `PATCH /api/admin/facilities/[id]` with status update
   - Toggle updates in real-time
5. **View Facility Details:**
   - Click facility name → detail page
   - Shows: info, staff list, performance stats
6. **Edit Facility Name (if exposed):**
   - Try to update facility name
   - Should work or show appropriate error
   - API: `PATCH /api/admin/facilities/[id]`
7. **Pagination:**
   - If 50+ facilities, show pagination
8. **Responsive:** Table → cards

**Expected Outcome:** Facilities list loads, open/close toggle works with confirmation, changes persist.

---

### 6.3 Platform Analytics

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/mega_admin/analytics` or view Analytics section
2. **Charts:**
   - Consultations trend (monthly)
   - Revenue trend
   - New signups (monthly)
   - Users by role (pie chart)
3. **Data Consistency:**
   - Refresh page → same chart data
   - Charts should match Overview dashboard data (verify no duplicates/inconsistencies)

**Expected Outcome:** Analytics charts load and update on refresh.

---

### 6.4 System Reports

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/mega_admin/reports`
2. **Report Builder:**
   - Dropdown/select: Report type (Users, Facilities, Consultations, Finance, Audit Log)
   - Date range picker
   - Additional filters (role, status, etc.)
3. **Generate Report:**
   - Click "Generate" or "Apply Filters"
   - Table displays filtered data
4. **CSV Export:**
   - "Download as CSV" button
   - File downloads with all report data
5. **PDF Export:**
   - "Download as PDF" button
   - PDF generated with formatted data, summary
6. **Report Types:**
   - **Users Report:** All users with role and status
   - **Facilities Report:** All facilities with staff/patient/appointment counts
   - **Consultations Report:** All consultations with date, participants, status
   - **Finance Report:** All transactions, revenue by facility/practitioner
   - **Audit Log Report:** All admin actions with timestamp and user
7. **Responsive:** Table with card fallback on mobile

**Expected Outcome:** Reports filter and export correctly, PDFs format well.

---

### 6.5 Audit Log

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/mega_admin/audit`
2. **Audit Log Table:**
   - Columns: Timestamp, Admin, Action, Target, Status (Success/Failed)
   - Rows show every admin action (user suspend, role change, facility update, etc.)
3. **Search:**
   - Search by admin name, action, or target
   - Filters log in real-time
4. **Sorting:**
   - Sort by timestamp (newest/oldest)
   - Sort by action type
5. **Detail Modal (optional):**
   - Click log entry → shows full details
     - Before/after values (if applicable)
     - IP address or user agent (optional)
6. **Data Integrity:**
   - Perform an admin action (e.g., suspend a user)
   - Return to Audit Log
   - New entry should appear (Refresh might be needed)
   - Entry should show correct: timestamp, admin name, action (suspend), target (user), status (success)
7. **Immutability:**
   - Verify no "Edit" or "Delete" buttons on audit entries
   - Audit log is append-only
8. **Responsive:** Table → cards

**Expected Outcome:** Audit log displays all admin actions, entries appear after actions are performed, immutable.

---

### 6.6 Platform Settings

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/mega_admin/settings`
2. **Settings Sections:**
   - Maintenance Mode
   - Feature Flags (if present)
   - Default Fee / Pricing
   - POPIA Compliance Version
3. **Maintenance Mode:**
   - Toggle switch
   - **Confirmation dialog:** "⚠️ Maintenance mode will take the entire platform offline. Are you sure?" (required)
   - Toggle on → all non-admin users redirected to maintenance page
   - Toggle off → platform resumes
   - API: `PATCH /api/admin/settings` with maintenance_mode=true/false
4. **Mega vs Super Admin Scoping:**
   - Mega Admin: can edit all settings
   - Super Admin: settings inputs disabled, Save button hidden
   - Server-side: API 403s if super_admin attempts edit
5. **Default Fee:**
   - Input field with price
   - Edit → Save
   - API: `PATCH /api/admin/settings`
6. **Feature Flags (if present):**
   - Checkboxes for experimental features
   - Toggle → Save
7. **Audit Trail:**
   - Settings changes should log to Audit Log
   - Return to audit log, verify entry exists
8. **Responsive:** Form adapts to mobile

**Expected Outcome:** Settings editable by Mega Admin only, changes persist, maintenance mode confirmation works, changes logged.

---

### 6.7 Alerts / Incident Monitoring

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. Navigate to `/mega_admin/alerts`
2. **Alert Feed:**
   - Shows system alerts and pending issues
   - May include: pending payouts, high-risk consultations, facility issues
3. **Alert Details:**
   - Click alert → detail view
   - Shows context and recommended action
4. **Action Buttons (if interactive):**
   - "Acknowledge" or "Dismiss" (if implemented)
   - Should mark alert as resolved

**Expected Outcome:** Alert feed displays relevant system issues.

---

## MODULE 7: Security & Cross-Cutting

### 7.1 Rate Limiting

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. **Login Rate Limiting (5 attempts per 15 minutes):**
   - Go to `/login`
   - Enter wrong password 5 times in a row
   - 6th attempt → 429 Too Many Requests
   - Check response: "Rate limit exceeded. Try again in X minutes"
   - Wait 15 minutes (or mock time) → try again → should work
2. **Register Rate Limiting (3 per hour):**
   - Register 3 accounts in quick succession
   - 4th attempt → 429 Rate limit
3. **OTP Send Rate Limiting (3 per 5 minutes):**
   - Request OTP 3 times
   - 4th → rate limited
4. **Reset Password Limiting (3 per 15 minutes):**
   - Request password reset 3 times
   - 4th → rate limited
5. **Network Inspection:**
   - Check DevTools → Rate limit headers:
     - `X-RateLimit-Limit: 5`
     - `X-RateLimit-Remaining: 4` (decreases with each request)
     - `X-RateLimit-Reset: [timestamp]`

**Expected Outcome:** Requests rate-limited at specified thresholds, headers show limits correctly.

---

### 7.2 Password Security

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. **Password Reset Token:**
   - Request password reset
   - Check email for reset link
   - Link format: `/reset-password?token=<32-byte-token>`
   - Try using token twice:
     - First use: works
     - Second use: fails (single-use enforcement)
   - Try modifying token in URL → fails
   - Wait 10+ minutes, try token → expires
2. **Password Hashing:**
   - Register with password "TestPassword123"
   - Check DB (User.password) → should be bcrypt hash, not plaintext
   - Try logging in with wrong password → fails
   - Login with correct password → succeeds
3. **Forgot Password Email:**
   - Request password reset for multiple accounts
   - Check that different reset links are generated (not same token)

**Expected Outcome:** Password reset tokens single-use and time-limited, passwords hashed, no enumeration possible.

---

### 7.3 Chat Authorization (CRITICAL SECURITY TEST)

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. **Setup:**
   - Create 2 patient accounts: PatientA and PatientB
   - PatientA books consultation with PractitionerX
   - PatientB books consultation with PractitionerX
2. **Normal Chat:**
   - Log in as PatientA
   - Navigate to chat for PatientA's consultation
   - Send message → works
3. **IDOR Attack Test (CRITICAL):**
   - While logged in as PatientA, try to send message to PatientB's consultation
   - Open browser console → execute:
     ```javascript
     const consultationIdB = 'patientb-consultation-id'; // get from other patient's chat URL
     const senderId = 'patientA-id'; // try to spoof
     fetch('/api/chat/messages', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         consultationId: consultationIdB,
         senderId: senderId,
         message: 'hacked message'
       })
     });
     ```
   - Expected: 403 Forbidden
   - Message should NOT be sent
   - Check DB: message should not exist
4. **Direct URL Manipulation:**
   - PatientA's chat URL: `/patient/chat/[consultationIdA]`
   - Try changing URL to PatientB's ID: `/patient/chat/[consultationIdB]`
   - Expected: page loads but says "Unauthorized" or shows error
   - No messages visible
5. **Server-Side Validation:**
   - Network tab: POST /api/chat/messages should include authentication header
   - Response should show 401 or 403 on unauthorized access

**Expected Outcome:** Message sending blocked for non-participants, URL manipulation prevented, server returns 403.

---

### 7.4 OAuth Flow with OTP Enforcement

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. **OAuth Registration:**
   - Go to `/register`
   - Click "Sign up with Google" or "Sign up with Facebook"
   - Authenticate with OAuth provider
   - Should redirect to OTP verification
2. **OTP Required:**
   - Before OTP verification: should NOT be able to access dashboard
   - Try accessing `/patient` directly → redirects to OTP page
   - Must complete OTP to access dashboard
3. **Password-Based vs OAuth:**
   - Account registered with OAuth should NOT have password in DB
   - OAuth users must use OTP email verification, not password reset
4. **Linking Prevention:**
   - Existing account registered via password
   - Try OAuth with same email
   - Should prevent linking (allowDangerousEmailAccountLinking=false)
   - Error: "Account already exists"

**Expected Outcome:** OAuth requires OTP verification before access, prevents email account linking.

---

### 7.5 Responsive Design Testing

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**
1. **3 Breakpoints (EVERY PAGE):**
   - Mobile: 375px width
   - Tablet: 768px width
   - Desktop: 1280px width
2. **Key Patient Pages:**
   - `/patient` (home) → stacks at mobile, multi-column at desktop
   - `/patient/doctors` → cards stack on mobile, grid at tablet/desktop
   - `/patient/appointments` → card list on mobile, table on desktop
   - `/patient/health-record` → tabs stack on mobile, side-by-side at desktop
   - `/patient/billing` → forms stack on mobile
3. **Key Admin Pages:**
   - `/hospital_admin/staff` → cards on mobile, table on desktop
   - `/mega_admin/users` → cards on mobile, table on desktop
4. **Modals:**
   - 375px: full-screen sheet from bottom
   - 768px/1280px: centered modal
5. **Touch Targets:**
   - All buttons: minimum 44×44px (especially on mobile)
   - Links/interactive elements: easy to tap
6. **Horizontal Scroll:**
   - Should NOT require horizontal scroll except for dense tables
   - Dense tables should collapse to card view on mobile (not horizontal scroll)
7. **Typography:**
   - Text readable at all sizes (no tiny text on mobile)
   - Headings scale appropriately
8. **Images:**
   - Logos, avatars scale appropriately
   - No overflow or distortion

**Expected Outcome:** All pages readable and usable at 375px, 768px, and 1280px without horizontal scrolling for primary content.

---

## MODULE 8: API Verification

### 8.1 API Endpoints Checklist

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**

Use Postman, Insomnia, or browser DevTools Network tab to verify each endpoint:

**Authentication APIs:**
- [ ] `POST /api/auth/register` — creates user, returns token
- [ ] `POST /api/auth/login` — authenticates, returns JWT
- [ ] `POST /api/auth/otp/send` — sends OTP email
- [ ] `POST /api/auth/otp/verify` — validates OTP, marks email verified
- [ ] `POST /api/auth/forgot-password` — generates reset token
- [ ] `POST /api/auth/reset-password` — resets password with token

**Patient APIs:**
- [ ] `GET /api/patient/dashboard` — returns vitals, appointments, doctors
- [ ] `POST /api/patient/vitals` — creates vital record
- [ ] `GET /api/patient/practitioners` — lists doctors with ratings
- [ ] `GET /api/patient/practitioners/[id]` — doctor detail with rating/reviews
- [ ] `GET /api/patient/appointments` — lists appointments
- [ ] `POST /api/bookings` — creates appointment booking
- [ ] `DELETE /api/patient/appointments/[id]` — cancels appointment
- [ ] `GET /api/patient/health-record` — returns full health record
- [ ] `POST /api/patient/health-record/allergies` — adds allergy
- [ ] `POST /api/patient/prescriptions` — refill request
- [ ] `GET /api/patient/wellness/score` — returns wellness score + streak
- [ ] `POST /api/patient/wellness/checkin` — submits daily checkin
- [ ] `GET /api/articles` — lists articles/health tips
- [ ] `GET /api/billing` — billing summary
- [ ] `GET /api/chat/messages` — chat history
- [ ] `POST /api/chat/messages` — send message

**Hospital Admin APIs:**
- [ ] `GET /api/hospital/dashboard` — facility KPIs
- [ ] `GET /api/hospital/performance` — performance charts data
- [ ] `GET /api/hospital/analytics` — analytics charts
- [ ] `GET /api/hospital/sla` — SLA tracking
- [ ] `GET /api/hospital/staff` — staff list
- [ ] `POST /api/hospital/staff` — create staff
- [ ] `PATCH /api/hospital/staff/[id]` — update staff
- [ ] `DELETE /api/hospital/staff/[id]` — delete staff
- [ ] `GET /api/hospital/appointments` — appointments list
- [ ] `POST /api/hospital/appointments` — create appointment
- [ ] `DELETE /api/hospital/appointments/[id]` — cancel appointment

**Admin APIs:**
- [ ] `GET /api/admin/users` — user list
- [ ] `PATCH /api/admin/users/[id]` — update user (suspend, role)
- [ ] `GET /api/admin/facilities` — facilities list
- [ ] `PATCH /api/admin/facilities/[id]` — update facility
- [ ] `GET /api/admin/audit` — audit log
- [ ] `GET /api/admin/finance` — financial summary
- [ ] `GET /api/admin/overview` — platform overview

**Verify for Each Endpoint:**
- [ ] Correct HTTP method (GET/POST/PATCH/DELETE)
- [ ] Authentication required (JWT in Authorization header)
- [ ] Authorization correct (role-based access)
- [ ] Status codes: 200 (success), 201 (created), 400 (bad request), 401 (not authenticated), 403 (not authorized), 404 (not found), 429 (rate limited), 500 (server error)
- [ ] Response schema matches documentation
- [ ] Data is real (not hardcoded or random)

**Expected Outcome:** All endpoints return correct status codes, require proper auth, and return real data.

---

## MODULE 9: Data Verification

### 9.1 Database Integrity

**Status:** ✅ COMPLETE - NOT YET TESTED

**Test Instructions:**

Check MongoDB/Postgres directly (via DB client or admin panel):

1. **Users Collection:**
   - Passwords are bcrypt hashes (40+ character strings starting with `$2a$` or `$2b$`)
   - OTP field exists on unverified users
   - `emailVerified: true` only after OTP completion
   - `resetTokenHash` exists during password reset flow (expires after 10 min)

2. **Appointments Collection:**
   - Dates are ISO 8601 format
   - Status field has valid values (scheduled, completed, cancelled)
   - References to patientId and practitionerId are valid

3. **Messages Collection:**
   - senderId matches authenticated user (not client-supplied)
   - consultationId links to valid consultation
   - Timestamps in ISO format

4. **Vitals/Health Data:**
   - Timestamps recorded on creation
   - Values are numeric (not random)

**Expected Outcome:** All data stored correctly, no plaintext passwords, relationships intact.

---

## Final Verification Checklist

Before marking demo-ready:

- [ ] All 9 landing page sections render (Navbar, Hero, Stats, About, Approach, Why Choose, Testimonials, Blog, Footer)
- [ ] Authentication: register, OTP verify, login, forgot password, reset password all work end-to-end
- [ ] Patient can book doctor appointment and see in calendar
- [ ] Patient can send message to practitioner in chat
- [ ] Practitioner sees patient in queue and can join video call
- [ ] Practitioner can fill SOAP note and save it
- [ ] Hospital admin sees performance/analytics/SLA data from APIs (not hardcoded)
- [ ] Admin can suspend/unsuspend users with confirmation dialog
- [ ] All pages responsive at 375px, 768px, 1280px
- [ ] No horizontal scroll needed on mobile for primary content
- [ ] Doctor ratings are consistent (same value on refresh, not random)
- [ ] Chat authorization blocks IDOR attempts (403 for non-participants)
- [ ] Rate limiting enforced on auth endpoints
- [ ] All API calls return real data from DB, not fake/randomized

---

**Testing Status Legend:**
- ✅ COMPLETE - NOT YET TESTED = Feature is implemented, awaiting user verification
- ✅ COMPLETE - TESTED BY [USER/DATE] = User has verified feature works

---

**Last Updated:** Aug 12, 2026  
**Ready for:** Client demo, investor presentation, QA testing
