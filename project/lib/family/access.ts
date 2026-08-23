import FamilyLink, { IFamilyLink } from '@/lib/models/FamilyLink';
import { Subscription } from '@/lib/models/Billing';
import { TIER_CONFIG, isValidTier, SubscriptionTier } from '@/lib/billing/tiers';
import { isMongoObjectId } from '@/lib/utils/mongoId';

/** The one active link between a guardian and a member, or null. Mirrors the
 * bespoke-check style already used for practitioner→patient access (see
 * app/api/practitioner/patients/[id]/health-record/route.ts) rather than a
 * generic ACL system.
 *
 * FamilyLink is still Mongo-only, so a Postgres-native guardian or member
 * (uuid id, see lib/utils/mongoId.ts) can have no such link — short-circuit
 * before Mongoose casts a uuid into an ObjectId query and throws. */
export async function getActiveFamilyLink(
  guardianId: string,
  memberId: string,
): Promise<IFamilyLink | null> {
  if (!isMongoObjectId(guardianId) || !isMongoObjectId(memberId)) return null;
  return FamilyLink.findOne({ guardianId, memberId, status: 'active' });
}

/** Can the guardian manage this member's profile/appointments/billing?
 * True for any active link regardless of the isMinor toggle — billing/
 * account management is separate from medical-record privacy. */
export async function canManageMember(guardianId: string, memberId: string): Promise<boolean> {
  const link = await getActiveFamilyLink(guardianId, memberId);
  return !!link;
}

/** Can the guardian view this member's clinical data (ClinicalData.* collections)?
 * Only true while the member is flagged as a minor — the core privacy boundary
 * of this feature. An adult dependent's medical history is never visible to
 * their guardian, even though the guardian pays for and manages the account. */
export async function canViewMedicalHistory(guardianId: string, memberId: string): Promise<boolean> {
  const link = await getActiveFamilyLink(guardianId, memberId);
  return !!link && link.isMinor === true;
}

export interface FamilySlots {
  tier: SubscriptionTier;
  maxFamilyMembers: number;
  used: number;
  remaining: number;
}

/** How many more family members this guardian's plan allows them to add.
 * Subscription/FamilyLink are still Mongo-only — a Postgres-native guardian
 * (uuid id) has no rows in either, so report zero slots rather than let
 * Mongoose throw casting the uuid into an ObjectId query. */
export async function getGuardianFamilySlots(guardianId: string): Promise<FamilySlots> {
  if (!isMongoObjectId(guardianId)) {
    return { tier: 'individual', maxFamilyMembers: 0, used: 0, remaining: 0 };
  }

  const sub = await Subscription.findOne({ patientId: guardianId, status: 'active' }).lean();
  const tier: SubscriptionTier = sub && isValidTier((sub as any).tier) ? (sub as any).tier : 'individual';
  const maxFamilyMembers = TIER_CONFIG[tier].maxFamilyMembers;

  const used = await FamilyLink.countDocuments({ guardianId, status: { $in: ['pending', 'active'] } });

  return { tier, maxFamilyMembers, used, remaining: Math.max(0, maxFamilyMembers - used) };
}
