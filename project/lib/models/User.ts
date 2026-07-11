import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  /** Optional — OTP-only accounts use a non-login placeholder */
  passwordHash?: string;
  role: 'patient' | 'practitioner' | 'hospital_admin' | 'inspector' | 'super_admin' | 'mega_admin';
  status: 'active' | 'suspended' | 'pending_verification';
  firstName: string;
  lastName: string;
  saId?: string;
  mobile?: string;
  phoneE164?: string;
  mfaEnabled: boolean;
  /** Supabase Auth user id (set when email is verified via OTP) */
  supabaseUid?: string;
  /**
   * Email confirmed via OTP after registration.
   * Login is blocked while false. Legacy seed users may omit this field
   * (treated as verified on login).
   */
  emailVerified: boolean;
  emailVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: false },
    role: { 
      type: String, 
      enum: ['patient', 'practitioner', 'hospital_admin', 'inspector', 'super_admin', 'mega_admin'], 
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
    phoneE164: { type: String, sparse: true, index: true },
    mfaEnabled: { type: Boolean, default: false },
    supabaseUid: { type: String, sparse: true, index: true },
    // default true so seed/legacy accounts remain login-able;
    // registration sets false until /verify-email completes
    emailVerified: { type: Boolean, default: true, index: true },
    emailVerifiedAt: { type: Date },
  },
  { timestamps: true }
);

UserSchema.index({ role: 1 });

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;
