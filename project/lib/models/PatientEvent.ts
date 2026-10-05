import { defineModel, type Document, type ModelClass } from '@/lib/db';
export interface IPatientEvent extends Document {
  patientId: string;
  title: string;
  date: string;       // stored as "Mon Apr 14 2026" (toDateString)
  time: string;       // "09:00"
  type: 'note' | 'reminder' | 'appointment';
  notes?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const PatientEvent: ModelClass<IPatientEvent> = defineModel<IPatientEvent>({
  name: 'PatientEvent', table: 'patient_events',
  columns: { date: 'event_date', time: 'event_time' },
  refs: { patientId: 'User' },
});
export default PatientEvent;
