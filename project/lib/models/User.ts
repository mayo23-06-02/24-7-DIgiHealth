import { defineModel, type Document, type ModelClass } from '@/lib/db';
export interface IUser extends Document {
  provisionedVia?: 'self' | 'hospital_form' | 'hospital_import';
  provisionedBy?: string;
  profileCompletedAt?: Date;
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
  /** Bcrypt hash of the current 6-digit verification code, if one is pending */
  otpCodeHash?: string;
  otpExpiresAt?: Date;
  /** Bcrypt hash of a password reset token (generated via forgot-password flow) */
  resetTokenHash?: string;
  /** Expiry of the current reset token (single-use, 10 min TTL) */
  resetTokenExpiresAt?: Date;
  notificationPrefs?: { email: boolean; push: boolean; sms: boolean };
  trustedDevices?: { id: string; name: string; lastUsed: string; active: boolean }[];
  createdAt: Date;
  updatedAt: Date;
}

export const User: ModelClass<IUser> = defineModel<IUser>({
  name: 'User', table: 'users',
});
export default User;
