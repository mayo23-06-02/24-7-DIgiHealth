import { defineModel, type Document, type ModelClass } from '@/lib/db';
/**
 * An invite issued by a platform admin (mega_admin/super_admin) via User
 * Management, for a role that still completes its own profile through the
 * normal registration wizard (patient, practitioner, hospital_admin) —
 * distinct from StaffInvite, which is a hospital admin inviting a doctor to
 * their specific facility's roster.
 *
 * super_admin/mega_admin invites never create one of these: those accounts
 * are created in full immediately (see /api/admin/users/invite), since
 * there's no wizard for them to complete.
 */
export interface IPlatformInvite extends Document {
  email: string;
  role: "patient" | "practitioner" | "hospital_admin";
  invitedBy: string;
  token: string;
  status: "pending" | "accepted" | "cancelled" | "expired";
  expiresAt: Date;
  acceptedAt?: Date;
}

export const PlatformInvite: ModelClass<IPlatformInvite> = defineModel<IPlatformInvite>({
  name: 'PlatformInvite', table: 'platform_invites',
  refs: { invitedBy: 'User' },
});
export default PlatformInvite;
