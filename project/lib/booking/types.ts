/**
 * Unified booking types used across patient, practitioner, and hospital flows.
 */

export type BookingRole = "patient" | "practitioner" | "hospital_admin";

export type ConsultationMethod = "video" | "chat" | "in_person";

export type BookingStatus =
  | "requested"
  | "pending"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "missed";

/** Who initiates the booking */
export type BookingSource =
  | "patient_self_serve"
  | "practitioner_schedule"
  | "hospital_desk"
  | "system";

export interface BookingParticipant {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  specialisation?: string;
  subtitle?: string;
}

/**
 * Slot status for the picker UI.
 * - available: selectable
 * - past: before now (greyed out)
 * - booked: already scheduled/selected (greyed out)
 * - unavailable: outside practitioner schedule (greyed out)
 */
export type SlotStatus = "available" | "past" | "booked" | "unavailable";

export interface BookingSlot {
  /** "HH:mm" 24h local */
  time: string;
  /** Convenience: true only when status === "available" */
  available: boolean;
  status: SlotStatus;
  /** Short reason for disabled slots */
  reason?: string;
  label?: string;
}

export interface CreateBookingInput {
  patientId?: string;
  practitionerId?: string;
  facilityId?: string;
  scheduledStart: string;
  scheduledEnd: string;
  type?: ConsultationMethod;
  reason?: string;
  chiefComplaint?: string;
  status?: BookingStatus;
  source?: BookingSource;
  bookingId?: string;
  durationMinutes?: number;
  notes?: string;
}

export interface BookingRecord {
  id: string;
  consultationId: string;
  patientId: string;
  patientName?: string;
  practitionerId: string;
  practitionerName?: string;
  practitionerAvatar?: string;
  facilityId?: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: BookingStatus;
  type: ConsultationMethod;
  reason?: string;
  durationMinutes?: number;
  source?: BookingSource;
  createdAt?: string;
  updatedAt?: string;
}

export interface BookingListParams {
  tab?: string;
  from?: string;
  to?: string;
  search?: string;
  patientId?: string;
  practitionerId?: string;
  status?: string;
  limit?: number;
}

export interface BookingApiResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UnifiedBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: BookingRole | "patient" | "practitioner";
  doctor?: BookingParticipant | null;
  patient?: BookingParticipant | null;
  editingApptId?: string | null;
  initialForm?: {
    date?: string;
    time?: string;
    reason?: string;
    durationMinutes?: number;
    type?: string;
  };
  onSuccess?: (booking?: BookingRecord) => void;
  allowedTypes?: ConsultationMethod[];
  title?: string;
}
