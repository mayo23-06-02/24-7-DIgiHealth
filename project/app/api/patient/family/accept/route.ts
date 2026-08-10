import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import FamilyLink from '@/lib/models/FamilyLink';
import { Subscription } from '@/lib/models/Billing';
import { normalizeEmail } from '@/lib/supabase/auth';

/** POST — the invited adult accepts, now that they're logged in. Only the
 * actual invited email can consume the token — being logged in with the
 * link isn't enough on its own. */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

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
    link.status = 'active';
    link.acceptedAt = new Date();
    await link.save();

    await Subscription.updateOne(
      { patientId: user.userId },
      { $set: { payerId: link.guardianId } },
      { upsert: false },
    );

    return NextResponse.json({ success: true, data: { linkId: link._id.toString() } });
  } catch (err: any) {
    console.error('[POST /api/patient/family/accept]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
