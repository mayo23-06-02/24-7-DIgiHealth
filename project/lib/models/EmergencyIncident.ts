import mongoose, { Schema, Document } from 'mongoose';

export interface IEmergencyIncident extends Document {
  facilityId: mongoose.Types.ObjectId;
  ambulanceId: string;
  patientName: string;
  etaMinutes: number;
  status: "en_route" | "arrived" | "in_treatment";
  triageLevel: "red" | "yellow" | "green";
  timestamp: Date;
}

const EmergencyIncidentSchema = new Schema({
  facilityId: { type: Schema.Types.ObjectId, ref: 'Facility', required: true },
  ambulanceId: { type: String, required: true },
  patientName: { type: String, required: true },
  etaMinutes: { type: Number, required: true },
  status: { type: String, enum: ["en_route", "arrived", "in_treatment"], default: "en_route" },
  triageLevel: { type: String, enum: ["red", "yellow", "green"], required: true },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.EmergencyIncident || mongoose.model<IEmergencyIncident>('EmergencyIncident', EmergencyIncidentSchema);
