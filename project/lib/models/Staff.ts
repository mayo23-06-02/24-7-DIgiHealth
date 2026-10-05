import { defineModel, type Document, type ModelClass } from '@/lib/db';
export interface IStaff extends Document {
  fileNumber?: string;
  status?: 'pending' | 'active' | 'suspended' | 'left';
  userId?: string;
  facilityId: string;
  role: "doctor" | "nurse" | "admin" | "technician";
  department: string;
  shiftSchedule: { start: string; end: string; days: number[] };
  isOnDuty: boolean;
  hourlyRate: number;
  qualifications: string[];
}

export const Staff: ModelClass<IStaff> = defineModel<IStaff>({
  name: 'Staff', table: 'staff',
  columns: {
    'shiftSchedule.start': 'shift_start',
    'shiftSchedule.end': 'shift_end',
    'shiftSchedule.days': 'shift_days',
  },
  refs: { userId: 'User', facilityId: 'Facility' },
});
export default Staff;
