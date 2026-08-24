import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import StaffInvite from '@/lib/models/StaffInvite';
import Facility from '@/lib/models/Facility';

import { apiError } from "@/lib/api/errors";
/**
 * GET /api/invites/[token] — public lookup used by the registration wizard
 * to confirm an invite link is real before the doctor fills anything in.
 * No auth: the invitee isn't signed in yet.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    await connectToDatabase();
    const { token } = await params;

    const invite = await StaffInvite.findOne({ token }).lean();
    if (!invite) {
      return NextResponse.json({ success: false, error: 'This invite link is not valid.' }, { status: 404 });
    }

    const inv = invite as any;

    if (inv.status === 'accepted') {
      return NextResponse.json({ success: false, error: 'This invite has already been used.' }, { status: 410 });
    }
    if (inv.status === 'cancelled') {
      return NextResponse.json({ success: false, error: 'This invite is no longer active.' }, { status: 410 });
    }
    if (new Date(inv.expiresAt) < new Date()) {
      if (inv.status !== 'expired') {
        await StaffInvite.findByIdAndUpdate(inv._id, { status: 'expired' });
      }
      return NextResponse.json(
        { success: false, error: 'This invite has expired. Ask your hospital admin to resend it.' },
        { status: 410 },
      );
    }

    const facility = await Facility.findById(inv.facilityId).select('name').lean();

    return NextResponse.json({
      success: true,
      data: {
        email: inv.email,
        facilityName: (facility as any)?.name || 'the facility',
      },
    });
  } catch (error: any) {
    console.error('[GET /api/invites/[token]]', error);
    return apiError(error);
  }
}
