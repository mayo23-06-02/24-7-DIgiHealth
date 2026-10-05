import { defineModel, type Document, type ModelClass } from '@/lib/db';
export interface IStaffApprovalRequest extends Document {
  doctorId: string;
  facilityId: string;
  requestedBy: string;
  token: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';
  department: string;
  shiftStart: string;
  shiftEnd: string;
  hourlyRate: number;
  expiresAt: Date;
  respondedAt?: Date;
}

export const StaffApprovalRequest: ModelClass<IStaffApprovalRequest> = defineModel<IStaffApprovalRequest>({
  name: 'StaffApprovalRequest', table: 'staff_approval_requests',
  refs: { doctorId: 'User', facilityId: 'Facility', requestedBy: 'User' },
});
export default StaffApprovalRequest;
