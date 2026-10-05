import { defineModel, type Document, type ModelClass } from '@/lib/db';
export interface IRiskScore extends Document {
  /** Hospital that owns this record; unset = entered by the patient. */
  facilityId?: string;
  patientId: string;
  practitionerId: string;
  consultationId?: string;
  score: number;
  color: 'green' | 'gray' | 'orange' | 'red';
  factors: string[];
  condition?: string;
  calculatedAt: Date;
  notes?: string;
}

export const RiskScore: ModelClass<IRiskScore> = defineModel<IRiskScore>({
  name: 'RiskScore', table: 'risk_scores',
  refs: { patientId: 'User', practitionerId: 'User', consultationId: 'Consultation' },
});
export default RiskScore;
