import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStaffInvite extends Document {
  email: string;
  facilityId: mongoose.Types.ObjectId;
  invitedBy: mongoose.Types.ObjectId;
  token: string;
  status: 'pending' | 'accepted' | 'cancelled' | 'expired';
  shiftStart: string;
  shiftEnd: string;
  hourlyRate: number;
  expiresAt: Date;
  acceptedAt?: Date;
}

const StaffInviteSchema = new Schema<IStaffInvite>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    facilityId: { type: Schema.Types.ObjectId, ref: 'Facility', required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'cancelled', 'expired'],
      default: 'pending',
    },
    shiftStart: { type: String, default: '08:00' },
    shiftEnd: { type: String, default: '16:00' },
    hourlyRate: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date },
  },
  { timestamps: true },
);

StaffInviteSchema.index({ email: 1, facilityId: 1, status: 1 });

export const StaffInvite: Model<IStaffInvite> =
  mongoose.models.StaffInvite || mongoose.model<IStaffInvite>('StaffInvite', StaffInviteSchema);
export default StaffInvite;
