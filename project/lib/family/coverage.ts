import FamilyLink from "@/lib/models/FamilyLink";

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

/** Match a member's FamilyLink rows. The mirror of `guardianFilter` in lib/family/access.ts. */
export function memberFilter(memberId: string) {
  return { memberId: String(memberId) };
}

/**
 * The session id of the guardian whose plan covers this account, or null.
 *
 * Only an `active` link is cover. A pending invite is somebody who has been
 * asked and has not answered, and a revoked one is somebody who was removed —
 * neither is being paid for.
 *
 * Returns the guardian's user id, which is what `subscriptionFilter` needs to
 * find their subscription.
 */
export async function getCoveringGuardianId(
  memberId: string,
): Promise<string | null> {
  if (!memberId) return null;

  const link = await FamilyLink.findOne({
    ...memberFilter(memberId),
    status: "active",
  })
    .select("guardianId")
    .sort({ acceptedAt: -1 })
    .lean<{ guardianId?: unknown } | null>();

  if (!link) return null;
  return link.guardianId ? String(link.guardianId) : null;
}
