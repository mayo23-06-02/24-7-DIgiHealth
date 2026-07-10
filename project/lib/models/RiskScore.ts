import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IRiskScore extends Document {
  patientId: Types.ObjectId;
  practitionerId: Types.ObjectId;
  consultationId?: Types.ObjectId;
  score: number;
  color: 'green' | 'gray' | 'orange' | 'red';
  factors: string[];
  condition?: string;
  calculatedAt: Date;
  notes?: string;
}

const RiskScoreSchema = new Schema<IRiskScore>(
  {
    // patientId stores User id for the patient (same convention as consultations)
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    practitionerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    consultationId: { type: Schema.Types.ObjectId, ref: 'Consultation' },
    score: { type: Number, min: 0, max: 100, required: true },
    color: { type: String, enum: ['green', 'gray', 'orange', 'red'], required: true },
    factors: [{ type: String }],
    condition: { type: String },
    notes: { type: String },
    calculatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

RiskScoreSchema.index({ patientId: 1, calculatedAt: -1 });
RiskScoreSchema.index({ practitionerId: 1 });

const RiskScore: Model<IRiskScore> =
  mongoose.models.RiskScore || mongoose.model<IRiskScore>('RiskScore', RiskScoreSchema);
export default RiskScore;
