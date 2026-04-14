import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IRiskScore extends Document {
  patientId: Types.ObjectId;
  practitionerId: Types.ObjectId;
  consultationId?: Types.ObjectId;
  score: number;
  color: 'green' | 'amber' | 'red';
  factors: string[];
  condition?: string;
  calculatedAt: Date;
}

const RiskScoreSchema = new Schema<IRiskScore>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    practitionerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    consultationId: { type: Schema.Types.ObjectId, ref: 'Consultation' },
    score: { type: Number, min: 0, max: 100, required: true },
    color: { type: String, enum: ['green', 'amber', 'red'], required: true },
    factors: [{ type: String }],
    condition: { type: String },
    calculatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

RiskScoreSchema.index({ patientId: 1, calculatedAt: -1 });
RiskScoreSchema.index({ practitionerId: 1 });

const RiskScore: Model<IRiskScore> =
  mongoose.models.RiskScore || mongoose.model<IRiskScore>('RiskScore', RiskScoreSchema);
export default RiskScore;
