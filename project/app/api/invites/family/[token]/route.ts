import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import FamilyLink from '@/lib/models/FamilyLink';
import User from '@/lib/models/User';

import { apiError } from "@/lib/api/errors";
/**
 * GET /api/invites/family/[token] — public lookup used by the accept page to
 * confirm an invite link is real before the invitee is asked to act on it.
 * No auth: the invitee may not even have an account yet.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    await connectToDatabase();
    const { token } = await params;

    const invite = await FamilyLink.findOne({ inviteToken: token }).lean();
    if (!invite) {
      return NextResponse.json({ success: false, error: 'This invite link is not valid.' }, { status: 404 });
    }

    const inv = invite as any;

    if (inv.status === 'active') {
      return NextResponse.json({ success: false, error: 'This invite has already been used.' }, { status: 410 });
    }
    if (inv.status === 'revoked') {
      return NextResponse.json({ success: false, error: 'This invite is no longer active.' }, { status: 410 });
    }
    if (inv.inviteExpiresAt && new Date(inv.inviteExpiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This invite has expired. Ask them to resend it.' },
        { status: 410 },
      );
    }

    const guardian = await User.findById(inv.guardianId).select('firstName lastName').lean();

    // Lets the registration wizard tell someone who already has an account to
    // sign in and accept, rather than walking them through a signup that would
    // fail on the duplicate address.
    const existing = await User.findOne({ email: inv.inviteEmail }).select('_id').lean();

    return NextResponse.json({
      success: true,
      data: {
        guardianName: guardian ? `${(guardian as any).firstName} ${(guardian as any).lastName}` : 'A 24/7 DigiHealth user',
        relationship: inv.relationship,
        inviteEmail: inv.inviteEmail,
        hasAccount: !!existing,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/invites/family/[token]]', error);
    return apiError(error);
  }
}
