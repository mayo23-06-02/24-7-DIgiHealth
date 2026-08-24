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

/**
 * Match a guardian's FamilyLink rows regardless of id shape.
 *
 * `guardianKey` is written for every new link; `guardianId` is only set when
 * the id can be cast to an ObjectId, and remains the only field on rows
 * created before this existed.
 */
export function guardianFilter(guardianId: string) {
  const or: Record<string, unknown>[] = [{ guardianKey: String(guardianId) }];
  if (isMongoObjectId(guardianId)) or.push({ guardianId });
  return { $or: or };
}

export interface FamilySlots {
  tier: SubscriptionTier;
  maxFamilyMembers: number;
  used: number;
  remaining: number;
}

/**
 * How many more family members this guardian's plan allows them to add.
 *
 * Postgres-native guardians used to be short-circuited to zero slots on the
 * assumption they had no subscription row. Since checkout writes `patientKey`
 * they do — so a patient who had just paid for a Family plan was told their
 * "individual plan includes 0 family member(s)" and could never invite anyone.
 * The subscription is now resolved through the shared filter, which matches on
 * either id shape.
 */
export async function getGuardianFamilySlots(guardianId: string): Promise<FamilySlots> {
  const sub = await Subscription.findOne({
    ...subscriptionFilter(guardianId),
    status: 'active',
  }).lean();
  const tier: SubscriptionTier = sub && isValidTier((sub as any).tier) ? (sub as any).tier : 'individual';
  const maxFamilyMembers = TIER_CONFIG[tier].maxFamilyMembers;

  const used = await FamilyLink.countDocuments({
    ...guardianFilter(guardianId),
    status: { $in: ['pending', 'active'] },
  });

  return { tier, maxFamilyMembers, used, remaining: Math.max(0, maxFamilyMembers - used) };
}
