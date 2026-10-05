import { defineModel, type Document, type ModelClass } from '@/lib/db';
export interface IStaffInvite extends Document {
  email: string;
  facilityId: string;
  invitedBy: string;
  token: string;
  status: 'pending' | 'accepted' | 'cancelled' | 'expired';
  shiftStart: string;
  shiftEnd: string;
  hourlyRate: number;
  expiresAt: Date;
  acceptedAt?: Date;
}

export const StaffInvite: ModelClass<IStaffInvite> = defineModel<IStaffInvite>({
  name: 'StaffInvite', table: 'staff_invites',
  refs: { facilityId: 'Facility', invitedBy: 'User' },
});
export default StaffInvite;
