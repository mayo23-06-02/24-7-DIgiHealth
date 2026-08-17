import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStaffApprovalRequest extends Document {
  doctorId: mongoose.Types.ObjectId;
  facilityId: mongoose.Types.ObjectId;
  requestedBy: mongoose.Types.ObjectId;
  token: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';
  department: string;
  shiftStart: string;
  shiftEnd: string;
  hourlyRate: number;
  expiresAt: Date;
  respondedAt?: Date;
}

const StaffApprovalRequestSchema = new Schema<IStaffApprovalRequest>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    facilityId: { type: Schema.Types.ObjectId, ref: 'Facility', required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled', 'expired'],
      default: 'pending',
    },
    department: { type: String, required: true },
    shiftStart: { type: String, default: '08:00' },
    shiftEnd: { type: String, default: '16:00' },
    hourlyRate: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    respondedAt: { type: Date },
  },
  { timestamps: true },
);

StaffApprovalRequestSchema.index({ doctorId: 1, facilityId: 1, status: 1 });

export const StaffApprovalRequest: Model<IStaffApprovalRequest> =
  mongoose.models.StaffApprovalRequest || mongoose.model<IStaffApprovalRequest>('StaffApprovalRequest', StaffApprovalRequestSchema);
export default StaffApprovalRequest;
