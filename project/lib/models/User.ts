import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: 'patient' | 'practitioner' | 'hospital_admin' | 'emt' | 'inspector' | 'super_admin' | 'mega_admin';
  status: 'active' | 'suspended' | 'pending_verification';
  firstName: string;
  lastName: string;
  saId?: string;
  mobile?: string;
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { 
      type: String, 
      enum: ['patient', 'practitioner', 'hospital_admin', 'emt', 'inspector', 'super_admin', 'mega_admin'], 
      required: true 
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'pending_verification'],
      default: 'active'
    },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    saId: { type: String, sparse: true, unique: true },
    mobile: { type: String },
    mfaEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;
