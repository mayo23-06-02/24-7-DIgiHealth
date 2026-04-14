import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPatientEvent extends Document {
  patientId: Types.ObjectId;
  title: string;
  date: string;       // stored as "Mon Apr 14 2026" (toDateString)
  time: string;       // "09:00"
  type: 'note' | 'reminder' | 'appointment';
  notes?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PatientEventSchema = new Schema<IPatientEvent>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, default: '09:00' },
    type: { type: String, enum: ['note', 'reminder', 'appointment'], default: 'reminder' },
    notes: { type: String },
    color: { type: String, default: 'primary' },
  },
  { timestamps: true }
);

export const PatientEvent =
  mongoose.models.PatientEvent ||
  mongoose.model<IPatientEvent>('PatientEvent', PatientEventSchema);

export default PatientEvent;
