import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import FamilyLink from '@/lib/models/FamilyLink';
import { normalizeEmail } from '@/lib/supabase/auth';
import { isMongoObjectId } from '@/lib/utils/mongoId';
import { getEntitlement } from '@/lib/billing/entitlement';
import { signSessionToken, setSessionCookie } from '@/lib/auth/sessionToken';

import { apiError } from "@/lib/api/errors";
/** POST — the invited adult accepts, now that they're logged in. Only the
 * actual invited email can consume the token — being logged in with the
 * link isn't enough on its own. */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    if (!isMongoObjectId(user.userId)) {
      return NextResponse.json(
        { success: false, error: 'Family accounts are not yet available for this account.' },
        { status: 400 },
      );
    }

    const { token } = await req.json();
    if (!token) return NextResponse.json({ success: false, error: 'Missing invite token' }, { status: 400 });

    const link = await FamilyLink.findOne({ inviteToken: token });
    if (!link) return NextResponse.json({ success: false, error: 'This invite link is not valid.' }, { status: 404 });
    if (link.status === 'active') {
      return NextResponse.json({ success: false, error: 'This invite has already been used.' }, { status: 410 });
    }
    if (link.status === 'revoked') {
      return NextResponse.json({ success: false, error: 'This invite is no longer active.' }, { status: 410 });
    }
    if (link.inviteExpiresAt && link.inviteExpiresAt < new Date()) {
      return NextResponse.json({ success: false, error: 'This invite has expired.' }, { status: 410 });
    }
    if (!user.email || normalizeEmail(user.email) !== normalizeEmail(link.inviteEmail || '')) {
      return NextResponse.json(
        { success: false, error: 'This invite was sent to a different email address than your account.' },
        { status: 403 },
      );
    }

    link.memberId = user.userId as any;
    // Written alongside memberId for the same reason guardianKey is written
    // alongside guardianId: it is the member's session id as a plain string, so
    // it matches whichever id shape the account uses. memberFilter reads it.
    link.memberKey = String(user.userId);
    link.status = 'active';
    link.acceptedAt = new Date();
    await link.save();

    /*
     * The guardian's plan now covers this account.
     *
     * The token is re-issued here rather than left to expire because the plan
     * gate reads coverage from the token: without this the member would accept
     * the invite and still be redirected to checkout for up to 24 hours, which
     * looks exactly like the bug this fixes.
     *
     * There used to be a Subscription.updateOne here stamping payerId with
     * upsert:false. It was a no-op for precisely the accounts it targeted — a
     * new dependant has no subscription row to update — and coverage is now
     * derived from the FamilyLink itself, so there is one source of truth
     * instead of two that could disagree.
     */
    const entitlement = await getEntitlement(user.userId);

    const response = NextResponse.json({
      success: true,
      data: { linkId: link._id.toString() },
    });
    const sessionToken = await signSessionToken({
      userId: user.userId,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      hasPlan: entitlement.hasPlan,
      coverage: entitlement.source,
    });
    return setSessionCookie(response, sessionToken);
  } catch (err: any) {
    console.error('[POST /api/patient/family/accept]', err);
    return apiError(err);
  }
}
