import mongoose, { Schema, Document } from 'mongoose';

export interface IBed extends Document {
  facilityId: mongoose.Types.ObjectId;
  ward: "general" | "icu" | "emergency";
  bedNumber: string;
  status: "available" | "occupied" | "cleaning";
  patientId?: mongoose.Types.ObjectId;
  notes?: string;
}

const BedSchema = new Schema({
  facilityId: { type: Schema.Types.ObjectId, ref: 'Facility', required: true },
  ward: { type: String, enum: ["general", "icu", "emergency"], required: true },
  bedNumber: { type: String, required: true },
  status: { type: String, enum: ["available", "occupied", "cleaning"], default: "available" },
  patientId: { type: Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String }
}, { timestamps: true });

export default mongoose.models.Bed || mongoose.model<IBed>('Bed', BedSchema);
