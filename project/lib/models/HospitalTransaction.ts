import mongoose, { Schema, Document } from 'mongoose';

export interface IHospitalTransaction extends Document {
  facilityId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  amount: number;
  type: "consultation_fee" | "procedure" | "pharmacy";
  status: "paid" | "pending" | "refunded";
  paymentMethod: "cash" | "card" | "medical_aid";
  timestamp: Date;
}

const HospitalTransactionSchema = new Schema({
  facilityId: { type: Schema.Types.ObjectId, ref: 'Facility', required: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ["consultation_fee", "procedure", "pharmacy"], required: true },
  status: { type: String, enum: ["paid", "pending", "refunded"], default: "pending" },
  paymentMethod: { type: String, enum: ["cash", "card", "medical_aid"], required: true },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.HospitalTransaction || mongoose.model<IHospitalTransaction>('HospitalTransaction', HospitalTransactionSchema);
