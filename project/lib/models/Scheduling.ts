import { defineModel, type Document, type ModelClass } from '@/lib/db';
export interface IPractitionerSchedule extends Document {
  practitionerId: string;
  date: Date;
  slots: { startTime: string; endTime: string; status: string }[];
  recurring?: { dayOfWeek: number; startHour: number; endHour: number };
}

export const PractitionerSchedule: ModelClass<IPractitionerSchedule> = defineModel<IPractitionerSchedule>({
  name: 'PractitionerSchedule', table: 'practitioner_schedules',
  columns: { date: 'schedule_date' },
  nest: { recurring: 'recurring_' },
  refs: { practitionerId: 'User' },
  children: { slots: { table: 'practitioner_schedule_slots', fk: 'schedule_id' } },
});
