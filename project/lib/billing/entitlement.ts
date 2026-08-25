import { connectToDatabase } from "@/lib/mongodb";
import { Subscription } from "@/lib/models/Billing";
import User from "@/lib/models/User";
import { isMongoObjectId } from "@/lib/utils/mongoId";
import { getCoveringGuardianId } from "@/lib/family/coverage";
import { TIER_CONFIG, isValidTier, type SubscriptionTier } from "./tiers";

/**
 * Where an account's access comes from.
 *
 * `family_inactive` is deliberately not folded into `none`. Somebody whose
 * guardian's plan has lapsed is not an unpaid stranger — they are a dependant
 * whose cover stopped through no act of their own, and the two are handled
 * differently: `none` goes to checkout, `family_inactive` is told to speak to
 * the guardian and is never shown a payment form. A child account must not be
 * asked for a card.
 */
export type CoverageSource = "own" | "family" | "family_inactive" | "none";

export type Entitlement = {
  hasPlan: boolean;
  source: CoverageSource;
  tier: SubscriptionTier | null;
  status: string | null;
  price: number;
  nextBillingDate: string | null;
  /** Set only for a family source — who is paying, so the UI can name them. */
  coveredBy: { guardianId: string; name: string } | null;
};

const NONE: Entitlement = {
  hasPlan: false,
  source: "none",
  tier: null,
  status: null,
  price: 0,
  nextBillingDate: null,
  coveredBy: null,
};

/** Statuses that count as paid-up access. */
const ACTIVE_STATUSES = new Set(["active", "trial"]);

/** Tiers that actually include dependants. `individual` covers nobody. */
const COVERING_TIERS = new Set<SubscriptionTier>(
  (Object.values(TIER_CONFIG) as { id: SubscriptionTier; maxFamilyMembers: number }[])
    .filter((t) => t.maxFamilyMembers > 0)
    .map((t) => t.id),
);

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

type SubRow = {
  status?: string;
  tier?: string;
  price?: number;
  nextBillingDate?: Date | string;
  /** Set when this row records somebody else's cover — see below. */
  payerId?: unknown;
} | null;

/** The newest subscription row for an id, in either id shape. */
async function latestSubscription(userId: string): Promise<SubRow> {
  return Subscription.findOne(subscriptionFilter(userId))
    .sort({ updatedAt: -1 })
    .lean<SubRow>();
}

function activeTierOf(sub: SubRow): SubscriptionTier | null {
  if (!sub) return null;
  const status = sub.status ?? null;
  const tier = sub.tier && isValidTier(sub.tier) ? sub.tier : null;
  if (!tier || !status || !ACTIVE_STATUSES.has(status)) return null;
  return tier;
}

/** Guardian's display name, for the "ask X to renew" copy. Never fatal. */
async function guardianName(guardianId: string): Promise<string> {
  if (!isMongoObjectId(guardianId)) return "your family plan holder";
  try {
    const row = await User.findById(guardianId)
      .select("firstName lastName")
      .lean<{ firstName?: string; lastName?: string } | null>();
    const name = [row?.firstName, row?.lastName].filter(Boolean).join(" ").trim();
    return name || "your family plan holder";
  } catch {
    return "your family plan holder";
  }
}

/**
 * Whether this account currently holds cover, and where it comes from.
 *
 * The gate in middleware, the checkout page and the billing tab all resolve
 * entitlement through here, so the three cannot disagree about whether someone
 * has paid — which is the failure mode that would either lock a paying patient
 * out or let an unpaid one through. Family cover was added here for the same
 * reason: a dependant who is covered must read as covered everywhere at once,
 * or they end up bounced between a dashboard that lets them in and a checkout
 * page that insists they pay.
 *
 * Own cover always wins. A dependant who buys their own plan is an ordinary
 * paying customer and is treated as one.
 */
export async function getEntitlement(userId: string): Promise<Entitlement> {
  if (!userId) return NONE;

  try {
    await connectToDatabase();

    const own = await latestSubscription(userId);

    /*
     * A `payerId` means this row is not cover, it is a pointer at cover.
     *
     * Guardian-created children get their own Subscription written for them at
     * price 0 with payerId set (see app/api/patient/family/child). That row is
     * a mirror of the guardian's plan, and mirrors drift: its status stays
     * "active" for ever, including long after the guardian has cancelled. Read
     * as own cover it would hand a child permanent free access and a billing
     * page listing a plan nobody is paying for.
     *
     * So the row is used only for who to ask, and liveness always comes from
     * the payer's real subscription — the one that actually gets cancelled.
     */
    const payerId = own?.payerId ? String(own.payerId) : null;
    const ownTier = payerId ? null : activeTierOf(own);

    if (ownTier) {
      return {
        hasPlan: true,
        source: "own",
        tier: ownTier,
        status: own!.status ?? null,
        price: own!.price ?? TIER_CONFIG[ownTier].price,
        nextBillingDate: own!.nextBillingDate
          ? new Date(own!.nextBillingDate).toISOString()
          : null,
        coveredBy: null,
      };
    }

    // No cover of their own. Are they on somebody else's family plan? The
    // pointer above is the guardian-created child path; the FamilyLink is the
    // invited-adult path, who has no subscription row at all.
    const guardianId = payerId || (await getCoveringGuardianId(userId));

    if (guardianId) {
      const guardianSub = await latestSubscription(guardianId);
      const guardianTier = activeTierOf(guardianSub);
      const covers = !!guardianTier && COVERING_TIERS.has(guardianTier);

      return {
        // The dependant is not billed, so no price and no billing date — those
        // belong to the guardian and are none of this account's business.
        hasPlan: covers,
        source: covers ? "family" : "family_inactive",
        // The guardian's tier, so consultation allowances are right.
        tier: guardianTier,
        status: guardianSub?.status ?? null,
        price: 0,
        nextBillingDate: null,
        coveredBy: { guardianId, name: await guardianName(guardianId) },
      };
    }

    // A cancelled or past-due subscription of their own is a record of a plan,
    // not access to one — those accounts go back through checkout.
    const rawTier = own?.tier;
    return {
      ...NONE,
      tier: rawTier && isValidTier(rawTier) ? rawTier : null,
      status: own?.status ?? null,
    };
  } catch (err) {
    // Deliberately fails closed: an unreadable subscription must not be
    // treated as a valid one.
    console.error("[entitlement] lookup failed", err);
    return NONE;
  }
}
