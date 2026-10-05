import { defineModel, type Document, type ModelClass } from '@/lib/db';
export interface IFamilyLink extends Document {
  guardianId?: string;
  guardianKey?: string;
  memberKey?: string;
  /** Unset until an email-invited adult actually accepts (they may not have
   * an account yet at invite time) — inviteEmail identifies them until then. */
  memberId?: string;
  inviteEmail?: string;
  /** Name the guardian gave when sending the invite — shown for a pending
   * invite before the invitee has an account to pull a name from. */
  inviteName?: string;
  relationship: 'child' | 'spouse' | 'parent' | 'other';
  /** Guardian-controlled toggle — the only thing that gates medical-history access. */
  isMinor: boolean;
  status: 'pending' | 'active' | 'revoked';
  /** Which onboarding path created this link. */
  linkedVia: 'guardian_created' | 'email_invite';
  inviteToken?: string;
  inviteExpiresAt?: Date;
  acceptedAt?: Date;
  /** Guardian's confirmation, at child-creation time, that they're the
   * parent/legal guardian and authorised to consent on the child's behalf. */
  guardianConsentAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const FamilyLink: ModelClass<IFamilyLink> = defineModel<IFamilyLink>({
  name: 'FamilyLink', table: 'family_links',
  aliases: { guardianKey: 'guardian_id', memberKey: 'member_id' },
  refs: { guardianId: 'User', memberId: 'User' },
});
export default FamilyLink;
