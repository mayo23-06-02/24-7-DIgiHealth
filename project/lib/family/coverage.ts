import FamilyLink from "@/lib/models/FamilyLink";
import { isMongoObjectId } from "@/lib/utils/mongoId";

/**
 * Member-side family lookups.
 *
 * Deliberately a separate module from lib/family/access.ts, which is the
 * guardian side: that file imports `subscriptionFilter` from
 * lib/billing/entitlement.ts, and entitlement now needs to ask who covers a
 * member. Putting these here keeps the dependency one-way — entitlement reads
 * this, this reads nothing but the model — rather than creating a cycle
 * between the two.
 */

/**
 * Match a member's FamilyLink rows regardless of id shape.
 *
 * The exact mirror of `guardianFilter` in lib/family/access.ts. `memberKey`
 * holds the member's session id as a plain string and so works for a Postgres
 * uuid as well as an ObjectId; `memberId` is ObjectId-typed and is the only
 * field on rows written before `memberKey` was populated, so both are matched.
 */
export function memberFilter(memberId: string) {
  const or: Record<string, unknown>[] = [{ memberKey: String(memberId) }];
  if (isMongoObjectId(memberId)) or.push({ memberId });
  return { $or: or };
}

/**
 * The session id of the guardian whose plan covers this account, or null.
 *
 * Only an `active` link is cover. A pending invite is somebody who has been
 * asked and has not answered, and a revoked one is somebody who was removed —
 * neither is being paid for.
 *
 * Returns the guardian's id in whatever shape their session uses, because that
 * is what `subscriptionFilter` needs to find their subscription: `guardianKey`
 * when it was written, falling back to `guardianId` for older rows.
 */
export async function getCoveringGuardianId(
  memberId: string,
): Promise<string | null> {
  if (!memberId) return null;

  const link = await FamilyLink.findOne({
    ...memberFilter(memberId),
    status: "active",
  })
    .select("guardianKey guardianId")
    .sort({ acceptedAt: -1 })
    .lean<{ guardianKey?: string; guardianId?: unknown } | null>();

  if (!link) return null;
  return link.guardianKey || (link.guardianId ? String(link.guardianId) : null);
}
