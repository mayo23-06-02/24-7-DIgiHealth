import mongoose, { Schema, Document } from 'mongoose';

export interface IStaff extends Document {
  userId?: mongoose.Types.ObjectId;
  facilityId: mongoose.Types.ObjectId;
  role: "doctor" | "nurse" | "admin" | "technician";
  department: string;
  shiftSchedule: { start: string; end: string; days: number[] };
  isOnDuty: boolean;
  hourlyRate: number;
  qualifications: string[];
}

const StaffSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  facilityId: { type: Schema.Types.ObjectId, ref: 'Facility', required: true },
  role: { type: String, enum: ["doctor", "nurse", "admin", "technician"], required: true },
  department: { type: String, required: true },
  shiftSchedule: {
    start: { type: String, required: true },
    end: { type: String, required: true },
    days: [{ type: Number }]
  },
  isOnDuty: { type: Boolean, default: false },
  hourlyRate: { type: Number, required: true },
  qualifications: [{ type: String }]
}, { timestamps: true });

export default mongoose.models.Staff || mongoose.model<IStaff>('Staff', StaffSchema);
