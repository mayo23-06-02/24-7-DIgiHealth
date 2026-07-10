import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IConsultation extends Document {
  patientId: Types.ObjectId;
  practitionerId: Types.ObjectId;
  facilityId?: Types.ObjectId;
  type: 'video' | 'chat' | 'in_person';
  status: 'requested' | 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'missed';
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  chiefComplaint?: string;
  clinicalRisk?: { score: number; color: 'green' | 'gray' | 'red'; factors: string[] };
  soapNotes?: { subjective?: string; objective?: string; assessment?: string; plan?: string; signedAt?: Date };
  callMinutesUsed: number;
  /** Unified booking origin */
  source?: 'patient_self_serve' | 'practitioner_schedule' | 'hospital_desk' | 'system';
}

const ConsultationSchema = new Schema<IConsultation>({
  patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  practitionerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  facilityId: { type: Schema.Types.ObjectId, ref: 'Facility' },
  type: { type: String, enum: ['video', 'chat', 'in_person'], required: true },
  status: { type: String, enum: ['requested', 'pending', 'scheduled', 'in_progress', 'completed', 'cancelled', 'missed'], default: 'requested' },
  scheduledStartTime: { type: Date, required: true },
  scheduledEndTime: { type: Date, required: true },
  chiefComplaint: { type: String },
  clinicalRisk: { score: Number, color: { type: String, enum: ['green', 'gray', 'red'] }, factors: [String] },
  soapNotes: { subjective: String, objective: String, assessment: String, plan: String, signedAt: Date },
  callMinutesUsed: { type: Number, default: 0 },
  source: {
    type: String,
    enum: ['patient_self_serve', 'practitioner_schedule', 'hospital_desk', 'system'],
  },
}, { timestamps: true });

ConsultationSchema.index({ patientId: 1, scheduledStartTime: -1 });
ConsultationSchema.index({ practitionerId: 1, scheduledStartTime: -1 });

export const Consultation = mongoose.models.Consultation || mongoose.model<IConsultation>('Consultation', ConsultationSchema);
export default Consultation;