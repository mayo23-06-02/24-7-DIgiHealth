import mongoose, { Schema, Document } from 'mongoose';

export interface IHospitalAppointment extends Document {
  facilityId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  practitionerId: mongoose.Types.ObjectId;
  type: "consultation" | "procedure" | "lab";
  scheduledStart: Date;
  scheduledEnd: Date;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  room: string;
}

const HospitalAppointmentSchema = new Schema({
  facilityId: { type: Schema.Types.ObjectId, ref: 'Facility', required: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  practitionerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ["consultation", "procedure", "lab"], required: true },
  scheduledStart: { type: Date, required: true },
  scheduledEnd: { type: Date, required: true },
  status: { type: String, enum: ["scheduled", "in_progress", "completed", "cancelled"], default: "scheduled" },
  room: { type: String, required: true }
}, { timestamps: true });

export default mongoose.models.HospitalAppointment || mongoose.model<IHospitalAppointment>('HospitalAppointment', HospitalAppointmentSchema);
