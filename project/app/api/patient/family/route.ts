import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import FamilyLink from '@/lib/models/FamilyLink';
import { getGuardianFamilySlots } from '@/lib/family/access';

/** GET — the caller's family links, both as guardian (members they manage)
 * and as member (guardians who manage them, for transparency). */
export async function GET() {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const [asGuardian, asMember, slots] = await Promise.all([
      FamilyLink.find({ guardianId: user.userId, status: { $in: ['pending', 'active'] } })
        .populate('memberId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .lean(),
      FamilyLink.find({ memberId: user.userId, status: 'active' })
        .populate('guardianId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .lean(),
      getGuardianFamilySlots(user.userId),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        asGuardian: asGuardian.map((l: any) => ({
          id: l._id.toString(),
          member: l.memberId
            ? { id: l.memberId._id.toString(), name: `${l.memberId.firstName} ${l.memberId.lastName}`, email: l.memberId.email }
            : { id: null, name: null, email: l.inviteEmail },
          relationship: l.relationship,
          isMinor: l.isMinor,
          status: l.status,
          linkedVia: l.linkedVia,
          inviteExpiresAt: l.inviteExpiresAt,
        })),
        asMember: asMember.map((l: any) => ({
          id: l._id.toString(),
          guardian: { id: l.guardianId._id.toString(), name: `${l.guardianId.firstName} ${l.guardianId.lastName}`, email: l.guardianId.email },
          relationship: l.relationship,
          isMinor: l.isMinor,
          acceptedAt: l.acceptedAt,
        })),
        slots,
      },
    });
  } catch (err: any) {
    console.error('[GET /api/patient/family]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
