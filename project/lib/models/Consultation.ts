import { defineModel, type Document, type ModelClass } from '@/lib/db';
export interface IConsultation extends Document {
  patientId: string;
  practitionerId: string;
  facilityId?: string;
  type: 'video' | 'voice' | 'chat' | 'in_person';
  status: 'requested' | 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'missed';
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  chiefComplaint?: string;
  clinicalRisk?: { score: number; color: 'green' | 'gray' | 'red'; factors: string[] };
  soapNotes?: { subjective?: string; objective?: string; assessment?: string; plan?: string; signedAt?: Date };
  callMinutesUsed: number;
  /** Unified booking origin */
  source?: 'patient_self_serve' | 'practitioner_schedule' | 'hospital_desk' | 'system';
  /**
   * A reschedule that hasn't been accepted by the other party yet.
   * scheduledStartTime/scheduledEndTime stay untouched until accepted, so the
   * confirmed slot never silently moves without the other party's consent.
   */
  pendingReschedule?: {
    proposedStart: Date;
    proposedEnd: Date;
    proposedBy: string;
    proposedAt: Date;
  };
  requestedTo?: string;
  /** Set once the 10-minutes-before-start email reminder has gone out, so it never sends twice. */
  reminderEmailSentAt?: Date;
}

export const Consultation: ModelClass<IConsultation> = defineModel<IConsultation>({
  name: 'Consultation', table: 'consultations',
  nest: { soapNotes: 'soap_', clinicalRisk: 'clinical_risk_' },
  columns: {
    'pendingReschedule.proposedStart': 'reschedule_proposed_start',
    'pendingReschedule.proposedEnd': 'reschedule_proposed_end',
    'pendingReschedule.proposedBy': 'reschedule_proposed_by',
    'pendingReschedule.proposedAt': 'reschedule_proposed_at',
  },
  refs: { patientId: 'User', practitionerId: 'User', facilityId: 'Facility', requestedTo: 'User' },
});
export default Consultation;
