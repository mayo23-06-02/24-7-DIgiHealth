import { defineModel, type Document, type ModelClass } from '@/lib/db';

export interface IWellnessCheckIn extends Document {
  patientId: string;
  mood: number;
  sleepHours: number;
  steps: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWellnessScore extends Document {
  patientId: string;
  date: Date;
  score: number;
  createdAt: Date;
  updatedAt: Date;
}

export const WellnessCheckIn: ModelClass<IWellnessCheckIn> = defineModel<IWellnessCheckIn>({
  name: 'WellnessCheckIn', table: 'wellness_checkins',
  columns: { date: 'checkin_date' },
  refs: { patientId: 'User' },
});

export const WellnessScore: ModelClass<IWellnessScore> = defineModel<IWellnessScore>({
  name: 'WellnessScore', table: 'wellness_scores',
  columns: { date: 'score_date' },
  refs: { patientId: 'User' },
});
