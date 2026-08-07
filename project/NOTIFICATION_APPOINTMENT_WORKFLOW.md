# Notification Appointment Workflow Guide

## Overview
This document outlines the enhanced notification system workflow for appointments. When a user clicks "Manage Appointment" on an appointment notification, they are taken to the appointments page with the specific appointment automatically opened in a detailed modal.

---

## Workflow Diagram

```
1. User sees notification in Activity Center
   ↓
2. User clicks "Manage Appointment" button
   ↓
3. User is navigated to appointments page with query parameters:
   - tab=requests (or relevant tab)
   - appointmentId=<id>
   - modal=true
   ↓
4. Page loads and detects query parameters
   ↓
5. Modal automatically opens with appointment details
   ↓
6. User can view details, log history, and take actions
   ↓
7. Query parameters are cleaned up after modal opens
```

---

## Implementation Details

### 1. NotificationBell Component Updates

**File:** `components/shared/Header/NotificationBell.tsx`

When user clicks "Manage Appointment", they are directed to:

```tsx
href={`/${user?.role}/appointments?tab=requests&appointmentId=${selectedNotif.data?.consultationId || selectedNotif.data?.appointmentId}&modal=true`}
```

**Query Parameters:**
- `tab=requests` - Opens the "Requests" tab (pending/reschedule requests)
- `appointmentId` - ID of the specific appointment to display
- `modal=true` - Flag to automatically open the modal

---

### 2. Patient Appointments Page Updates

**File:** `components/dashboard/patient/PatientAppointments.tsx`

The page now:

#### 2.1 Reads Query Parameters
```tsx
import { useSearchParams } from "next/navigation";

const searchParams = useSearchParams();
const initialTab = (searchParams.get("tab") as AppointmentTab) || "upcoming";
const appointmentIdFromQuery = searchParams.get("appointmentId");
const shouldOpenModal = searchParams.get("modal") === "true";
```

#### 2.2 Auto-Opens Modal on Mount
```tsx
useEffect(() => {
  if (appointmentIdFromQuery && shouldOpenModal && appointments.length > 0) {
    const appointment = appointments.find(
      (a) => a.id === appointmentIdFromQuery || a.consultationId === appointmentIdFromQuery
    );
    if (appointment) {
      setSelectedAppointment(appointment);
      setShowDetailsModal(true);
      // Clean up query parameters after modal opens
      window.history.replaceState({}, "", `/patient/appointments?tab=${initialTab}`);
    }
  }
}, [appointmentIdFromQuery, shouldOpenModal, appointments, initialTab]);
```

#### 2.3 Tab Navigation
The page automatically navigates to the correct tab based on the notification type:
- Appointment requests → `tab=requests`
- Upcoming appointments → `tab=upcoming`
- Rescheduled appointments → Use relevant status

---

## User Journey Examples

### Example 1: Reschedule Request Notification

1. **User receives notification:** "Dr. Smith wants to reschedule your appointment"
2. **Clicks:** "Manage Appointment" button
3. **Navigated to:** `/patient/appointments?tab=requests&appointmentId=apt-123&modal=true`
4. **Page loads:**
   - Switches to "Requests" tab
   - Finds appointment with ID `apt-123`
   - Opens AppointmentDetailsModal
5. **Modal displays:**
   - Doctor info (name, avatar, specialization)
   - Current appointment time
   - Proposed new time (if reschedule request)
   - Action buttons: Accept, Decline, Reschedule
6. **User actions:**
   - Click "Accept" → Confirms new time
   - Click "Decline" → Rejects and keeps original time
   - Click "Reschedule" → Opens booking modal for custom time

### Example 2: New Appointment Request Notification

1. **User receives notification:** "New appointment request from Dr. Johnson"
2. **Clicks:** "Manage Appointment" button
3. **Navigated to:** `/patient/appointments?tab=requests&appointmentId=apt-456&modal=true`
4. **Page loads:**
   - Switches to "Requests" tab
   - Opens modal with pending appointment details
5. **Modal displays:**
   - Doctor info
   - Proposed appointment time
   - Reason for consultation
   - Action buttons: Accept, Decline
6. **User actions:**
   - Click "Accept" → Confirms appointment
   - Click "Decline" → Rejects appointment

---

## Appointment Detail Modal Features

### Current Features (AppointmentDetailsModal)
- ✅ Doctor/Patient profile information
- ✅ Appointment date and time
- ✅ Appointment type (video/chat)
- ✅ Appointment reason/notes
- ✅ Status badge
- ✅ Pending reschedule information
- ✅ Action buttons (Accept/Decline/Reschedule/Cancel)

### Enhanced Features (Future Additions)
The modal can be further enhanced with:

1. **Appointment History/Log**
   - Creation timestamp
   - Last modified timestamp
   - Status changes history
   - All reschedule proposals and responses

2. **Additional Context**
   - Medical history summary
   - Previous consultation notes (if available)
   - Risk score (if practitioner consultation)
   - AI recommendations (if available)

3. **Communication Options**
   - Quick message to doctor
   - View previous messages in chat
   - Call doctor directly (if time available)

---

## API Data Structure

### Notification Data Format

When sending appointment notifications, ensure `data` contains:

```tsx
{
  _id: "notif-123",
  type: "appointment_reschedule_request", // or "new_appointment", "appointment_accepted", etc.
  title: "Reschedule Request",
  body: "Dr. Smith wants to reschedule your appointment to...",
  data: {
    consultationId: "apt-123",        // Used to find appointment
    appointmentId: "apt-123",         // Alternative ID field
    conversationId: "conv-456",       // For message linking
    doctorName: "Dr. Smith",
    newTime: "2026-08-15T14:30:00Z"  // Optional: proposed new time
  },
  createdAt: "2026-08-07T10:00:00Z",
  isRead: false
}
```

### Appointment Data Format

```tsx
interface Appointment {
  id: string;
  consultationId?: string;
  patientId: string;
  patientName: string;
  patientAvatar?: string;
  practitionerId?: string;
  practitionerName?: string;
  practitionerAvatar?: string;
  scheduledStart: string;    // ISO format
  scheduledEnd: string;      // ISO format
  status: string;            // "scheduled", "requested", "cancelled", etc.
  type: string;              // "video", "chat"
  reason?: string;           // Reason for consultation
  riskScore?: number;        // Risk assessment score
  computedStatus?: string;   // Computed status: "upcoming", "past", "pending", etc.
  canAccept?: boolean;       // Whether user can accept/decline
  pendingReschedule?: {      // If reschedule is pending
    proposedStart: string;
    proposedEnd: string;
    proposedByMe: boolean;
  } | null;
}
```

---

## Query Parameter Reference

### Supported Query Parameters

| Parameter | Type | Purpose | Example |
|-----------|------|---------|---------|
| `tab` | string | Which tab to display | `tab=requests` or `tab=upcoming` |
| `appointmentId` | string | ID of appointment to open in modal | `appointmentId=apt-123` |
| `modal` | string | Flag to auto-open modal | `modal=true` |

### Tab Values

| Tab | computedStatus | Description |
|-----|-----------------|-------------|
| `upcoming` | "upcoming" | Scheduled appointments in future |
| `past` | "past" | Completed appointments |
| `pending` | "pending" | Requests waiting for response |
| `requests` | "requests" | Reschedule requests |
| `cancelled` | "cancelled" | Cancelled appointments |
| `all` | Any | All appointments |

---

## Implementation Checklist

### Backend Requirements
- [ ] Ensure appointment notifications include `data.consultationId` or `data.appointmentId`
- [ ] Ensure appointment endpoints return all required fields
- [ ] Support query filtering by appointment ID
- [ ] Provide appointment history/log endpoint (optional)

### Frontend Requirements
- [x] Update NotificationBell to include query parameters
- [x] Update PatientAppointments to read query parameters
- [x] Auto-open modal when parameters present
- [x] Clean up query parameters after modal opens
- [ ] Add log/history section to AppointmentDetailsModal (optional)
- [ ] Add communication options to modal (optional)

### Testing Requirements
- [ ] Test clicking "Manage Appointment" from notification
- [ ] Verify page navigates to correct tab
- [ ] Verify modal opens with correct appointment
- [ ] Test all action buttons (Accept, Decline, Reschedule, Cancel)
- [ ] Test on mobile, tablet, and desktop
- [ ] Test with different appointment states
- [ ] Verify query parameters are cleaned up after modal opens

---

## Troubleshooting

### Modal doesn't open
1. Check if `modal=true` query parameter is present
2. Verify `appointmentId` matches an actual appointment ID
3. Check browser console for errors
4. Ensure appointments have loaded before modal tries to open

### Wrong appointment opens
1. Verify `appointmentId` is correct in query string
2. Check if appointment ID matches `id` or `consultationId` field
3. Ensure appointment lookup logic checks both fields

### Query parameters don't clean up
1. Check if `window.history.replaceState` is being called
2. Verify browser allows history manipulation
3. Check for JavaScript errors in console

---

## Future Enhancements

### Phase 2: Appointment Log/History
Add a tab in the modal showing:
- Creation date/time
- All status changes with timestamps
- Reschedule proposals and responses
- Cancellation reasons (if applicable)

### Phase 3: Direct Communication
Add ability to:
- Send quick message to doctor
- View previous messages with doctor
- Schedule follow-up appointments
- Share medical records with doctor

### Phase 4: Smart Actions
- Auto-suggest best reschedule times
- Show availability conflicts
- Recommend nearby practitioners if needed
- Send reminder notifications

---

## Code References

### Files Modified
1. **components/shared/Header/NotificationBell.tsx**
   - Updated "Manage Appointment" link with query parameters

2. **components/dashboard/patient/PatientAppointments.tsx**
   - Added `useSearchParams` hook
   - Added query parameter reading logic
   - Added auto-modal opening effect
   - Added query parameter cleanup

### Files Available for Enhancement
1. **components/shared/Appointments/AppointmentDetailsModal.tsx**
   - Can add log/history section
   - Can add communication interface
   - Can add more appointment metadata

2. **components/dashboard/patient/PatientAppointments.tsx**
   - Can add advanced filtering
   - Can add calendar sync
   - Can add reminder system

---

## Summary

The notification appointment workflow now provides a seamless experience:
1. **Notification** → User sees appointment update in Activity Center
2. **Action** → Clicks "Manage Appointment" from notification detail
3. **Navigation** → Automatically taken to appointments page with context
4. **Modal** → Detailed appointment information opens automatically
5. **Interaction** → User can accept, decline, reschedule, or cancel
6. **Confirmation** → Action is processed and page updates

This creates a more efficient user experience compared to navigating manually to the appointments page and searching for the appointment.

