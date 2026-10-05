import { defineModel, type Document, type ModelClass } from '@/lib/db';
export interface IAITriageSession extends Document {
  patientId: string;
  symptoms: string;
  parsedSymptoms: string[];
  aiResponse: any;
  recommendation: string;
  urgencyScore: number;
  consultationId?: string;
}

export interface ISuggestedDiagnosis {
  condition: string;
  confidence: number;
  reasoning: string;
  redFlag: boolean;
}

export interface IClinicalDecisionSupport extends Document {
  practitionerId: string;
  patientId: string;
  consultationId?: string;
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

export const AITriageSession: ModelClass<IAITriageSession> = defineModel<IAITriageSession>({
  name: 'AITriageSession', table: 'ai_triage_sessions',
  refs: { patientId: 'User', consultationId: 'Consultation' },
});
export const ClinicalDecisionSupport: ModelClass<IClinicalDecisionSupport> = defineModel<IClinicalDecisionSupport>({
  name: 'ClinicalDecisionSupport', table: 'clinical_decision_support',
  refs: { practitionerId: 'User', patientId: 'User', consultationId: 'Consultation' },
});
