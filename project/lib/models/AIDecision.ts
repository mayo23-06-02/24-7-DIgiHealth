import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAITriageSession extends Document {
  patientId: Types.ObjectId;
  symptoms: string;
  parsedSymptoms: string[];
  aiResponse: any;
  recommendation: string;
  urgencyScore: number;
  consultationId?: Types.ObjectId;
}
const AITriageSessionSchema = new Schema<IAITriageSession>({
  patientId: { type: Schema.Types.ObjectId, ref: 'User' },
  symptoms: String,
  parsedSymptoms: [String],
  aiResponse: Schema.Types.Mixed,
  recommendation: String,
  urgencyScore: Number,
  consultationId: { type: Schema.Types.ObjectId, ref: 'Consultation' }
}, { timestamps: true });

export interface ISuggestedDiagnosis {
  condition: string;
  confidence: number;
  reasoning: string;
  redFlag: boolean;
}

export interface IClinicalDecisionSupport extends Document {
  practitionerId: Types.ObjectId;
  patientId: Types.ObjectId;
  consultationId?: Types.ObjectId;
  symptoms: string;
  suggestedDiagnoses: ISuggestedDiagnosis[];
  recommendedTests: string[];
  /** @deprecated drug-interaction checking is handled by the deterministic
   * checker in components/dashboard/practitioner/ClinicalDecisionSupport.tsx —
   * kept only so older documents still validate; AI-generated records leave
   * this empty. */
  drugInteractions: any[];
  riskScore: number;
  riskAssessment: string;
  status: 'pending' | 'accepted' | 'dismissed';
  reviewedAt?: Date;
  modelUsed: string;
  generatedAt: Date;
}

const SuggestedDiagnosisSchema = new Schema<ISuggestedDiagnosis>(
  {
    condition: { type: String, required: true },
    confidence: { type: Number, required: true, min: 0, max: 100 },
    reasoning: { type: String, required: true },
    redFlag: { type: Boolean, default: false },
  },
  { _id: false },
);

const ClinicalDecisionSupportSchema = new Schema<IClinicalDecisionSupport>({
  practitionerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  consultationId: { type: Schema.Types.ObjectId, ref: 'Consultation' },
  symptoms: { type: String, required: true },
  suggestedDiagnoses: [SuggestedDiagnosisSchema],
  recommendedTests: [String],
  drugInteractions: [Schema.Types.Mixed],
  riskScore: Number,
  riskAssessment: String,
  status: { type: String, enum: ['pending', 'accepted', 'dismissed'], default: 'pending' },
  reviewedAt: Date,
  modelUsed: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now },
});

ClinicalDecisionSupportSchema.index({ patientId: 1, generatedAt: -1 });

export const AITriageSession = mongoose.models.AITriageSession || mongoose.model<IAITriageSession>('AITriageSession', AITriageSessionSchema);
export const ClinicalDecisionSupport = mongoose.models.ClinicalDecisionSupport || mongoose.model<IClinicalDecisionSupport>('ClinicalDecisionSupport', ClinicalDecisionSupportSchema);
