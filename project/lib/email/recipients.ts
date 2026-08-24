import type { Types } from "mongoose";
import User from "@/lib/models/User";
import FamilyLink from "@/lib/models/FamilyLink";

type UserId = Types.ObjectId | string;

export interface EmailRecipient {
  email: string;
  recipientName?: string;
  /** Set when writing to a guardian about a minor dependent, not the reader's own appointment. */
  onBehalfOf?: string;
}

/**
 * Who actually receives mail about this user.
 *
 * A minor dependent's stored email is a plus-addressed synthetic address (see
 * app/api/patient/family/child/route.ts) that resolves to the guardian's real
 * inbox anyway — so resolving the guardian explicitly is not strictly
 * necessary for delivery. It is worth doing regardless: it makes the "on
 * behalf of {child}" framing possible, and it does not depend on every
 * recipient mail provider honouring plus-addressing.
 *
 * This lives in one place because getting it wrong means sending a child's
 * clinical appointment details to the wrong inbox — not the kind of rule that
 * should exist in two copies free to drift apart.
 */
export async function resolveRecipientForUser(user: {
  _id: UserId;
  firstName?: string;
  email?: string;
}): Promise<EmailRecipient | null> {
  const link = await FamilyLink.findOne({
    memberId: user._id,
    status: "active",
    isMinor: true,
  })
    .populate("guardianId", "firstName email")
    .lean();

  const guardian = (link as { guardianId?: { firstName?: string; email?: string } } | null)
    ?.guardianId;

  if (guardian?.email) {
    return {
      email: guardian.email,
      recipientName: guardian.firstName,
      onBehalfOf: user.firstName,
    };
  }

  if (!user.email) return null;
  return { email: user.email, recipientName: user.firstName };
}

/** Same, when all you have is an id. */
export async function resolveRecipientById(
  userId: UserId,
): Promise<EmailRecipient | null> {
  const user = await User.findById(userId)
    .select("firstName email")
    .lean<{ _id: UserId; firstName?: string; email?: string } | null>();
  if (!user) return null;
  return resolveRecipientForUser(user);
}
