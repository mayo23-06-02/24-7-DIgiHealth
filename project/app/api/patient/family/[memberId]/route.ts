import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import FamilyLink from '@/lib/models/FamilyLink';
import { Subscription } from '@/lib/models/Billing';
import { getActiveFamilyLink } from '@/lib/family/access';

/** PATCH — guardian toggles isMinor (the medical-history access switch) or
 * updates the relationship label. This is the single write path that
 * changes whether the guardian can see a member's clinical data. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    await connectToDatabase();
    const guardian = await getRequestUser();
    if (!guardian) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { memberId } = await params;
    const link = await getActiveFamilyLink(guardian.userId, memberId);
    if (!link) return NextResponse.json({ success: false, error: 'No active family link with this member' }, { status: 404 });

    const body = await req.json();
    if (typeof body.isMinor === 'boolean') link.isMinor = body.isMinor;
    if (['child', 'spouse', 'parent', 'other'].includes(body.relationship)) link.relationship = body.relationship;
    await link.save();

    return NextResponse.json({ success: true, data: { id: link._id.toString(), isMinor: link.isMinor, relationship: link.relationship } });
  } catch (err: any) {
    console.error('[PATCH /api/patient/family/[memberId]]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/** DELETE — guardian revokes the link. Reverts the member to self-pay
 * (clears payerId) rather than leaving them silently unbilled. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    await connectToDatabase();
    const guardian = await getRequestUser();
    if (!guardian) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { memberId } = await params;
    const link = await getActiveFamilyLink(guardian.userId, memberId);
    if (!link) return NextResponse.json({ success: false, error: 'No active family link with this member' }, { status: 404 });

    link.status = 'revoked';
    link.revokedAt = new Date();
    await link.save();

    await Subscription.updateOne(
      { patientId: memberId, payerId: guardian.userId },
      { $unset: { payerId: 1 } },
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/patient/family/[memberId]]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
