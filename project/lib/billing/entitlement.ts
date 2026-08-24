import { connectToDatabase } from "@/lib/mongodb";
import { Subscription } from "@/lib/models/Billing";
import { isMongoObjectId } from "@/lib/utils/mongoId";
import { TIER_CONFIG, isValidTier, type SubscriptionTier } from "./tiers";

export type Entitlement = {
  hasPlan: boolean;
  tier: SubscriptionTier | null;
  status: string | null;
  price: number;
  nextBillingDate: string | null;
};

const NONE: Entitlement = {
  hasPlan: false,
  tier: null,
  status: null,
  price: 0,
  nextBillingDate: null,
};

/** Statuses that count as paid-up access. */
const ACTIVE_STATUSES = new Set(["active", "trial"]);

/**
 * Build the filter that finds a user's subscription regardless of whether
 * their session id is a Postgres uuid or a Mongo ObjectId.
 *
 * `patientKey` is written by every new subscription; `patientId` is only
 * added for ObjectId accounts, since the field is ObjectId-typed and a uuid
 * cannot be cast into it.
 */
export function subscriptionFilter(userId: string) {
  const or: Record<string, unknown>[] = [{ patientKey: String(userId) }];
  if (isMongoObjectId(userId)) or.push({ patientId: userId });
  return { $or: or };
}

/**
 * Whether this account currently holds a plan.
 *
 * The gate in middleware, the checkout page and the billing tab all resolve
 * entitlement through here, so the three cannot disagree about whether someone
 * has paid — which is the failure mode that would either lock a paying patient
 * out or let an unpaid one through.
 */
export async function getEntitlement(userId: string): Promise<Entitlement> {
  if (!userId) return NONE;

  try {
    await connectToDatabase();
    const sub = await Subscription.findOne(subscriptionFilter(userId))
      .sort({ updatedAt: -1 })
      .lean();

    if (!sub) return NONE;

    const status = (sub as any).status ?? null;
    const rawTier = (sub as any).tier;
    const tier = rawTier && isValidTier(rawTier) ? rawTier : null;

    // A cancelled or past-due subscription is a record of a plan, not access
    // to one — those accounts go back through checkout.
    if (!tier || !status || !ACTIVE_STATUSES.has(status)) {
      return { ...NONE, tier, status };
    }

    return {
      hasPlan: true,
      tier,
      status,
      price: (sub as any).price ?? TIER_CONFIG[tier].price,
      nextBillingDate: (sub as any).nextBillingDate
        ? new Date((sub as any).nextBillingDate).toISOString()
        : null,
    };
  } catch (err) {
    // Deliberately fails closed: an unreadable subscription must not be
    // treated as a valid one.
    console.error("[entitlement] lookup failed", err);
    return NONE;
  }
}
