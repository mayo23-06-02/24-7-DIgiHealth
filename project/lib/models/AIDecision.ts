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

export interface IClinicalDecisionSupport extends Document {
  practitionerId: Types.ObjectId;
  patientId: Types.ObjectId;
  consultationId: Types.ObjectId;
  riskScore: number;
  suggestedDiagnoses: string[];
  recommendedTests: string[];
  drugInteractions: any[];
  generatedAt: Date;
}
const ClinicalDecisionSupportSchema = new Schema<IClinicalDecisionSupport>({
  practitionerId: { type: Schema.Types.ObjectId, ref: 'User' },
  patientId: { type: Schema.Types.ObjectId, ref: 'User' },
  consultationId: { type: Schema.Types.ObjectId, ref: 'Consultation' },
  riskScore: Number,
  suggestedDiagnoses: [String],
  recommendedTests: [String],
  drugInteractions: [Schema.Types.Mixed],
  generatedAt: { type: Date, default: Date.now }
});

export const AITriageSession = mongoose.models.AITriageSession || mongoose.model<IAITriageSession>('AITriageSession', AITriageSessionSchema);
export const ClinicalDecisionSupport = mongoose.models.ClinicalDecisionSupport || mongoose.model<IClinicalDecisionSupport>('ClinicalDecisionSupport', ClinicalDecisionSupportSchema);
