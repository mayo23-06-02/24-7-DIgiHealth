import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { guardianFilter } from '@/lib/family/access';
import FamilyLink from '@/lib/models/FamilyLink';
import { Subscription } from '@/lib/models/Billing';
import { getActiveFamilyLink } from '@/lib/family/access';
import { Notification } from '@/lib/models/Communications';

import { apiError } from "@/lib/api/errors";
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
    return apiError(err);
  }
}

/** DELETE — guardian revokes the link. Keyed by the FamilyLink's own _id
 * (not the member's user id) so a pending email invite — which has no
 * linked user yet — can be revoked exactly like an active member.
 * Reverts an active member to self-pay (clears payerId) rather than
 * leaving them silently unbilled. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    await connectToDatabase();
    const guardian = await getRequestUser();
    if (!guardian) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { memberId: linkId } = await params;
    // Matched through guardianFilter so this works for both id shapes. It
    // previously refused every Postgres-native guardian outright, which meant
    // a patient who had invited someone could never revoke that invite.
    const link = await FamilyLink.findOne({
      _id: linkId,
      ...guardianFilter(String(guardian.userId)),
      status: { $ne: 'revoked' },
    });
    if (!link) return NextResponse.json({ success: false, error: 'No family link found' }, { status: 404 });

    link.status = 'revoked';
    link.revokedAt = new Date();
    await link.save();

    if (link.memberId) {
      await Subscription.updateOne(
        { patientId: link.memberId, payerId: guardian.userId },
        { $unset: { payerId: 1 } },
      );

      // Only active members have an account to notify — a revoked pending
      // invite never had one.
      const guardianName = `${guardian.firstName || ''} ${guardian.lastName || ''}`.trim() || 'Your guardian';
      await Notification.create({
        userId: link.memberId,
        type: 'family_link_removed',
        title: 'Family account link removed',
        body: `${guardianName} removed you from their family account. You're now responsible for your own billing.`,
        data: { guardianId: guardian.userId },
        isRead: false,
        deliveredVia: ['in_app'],
      }).catch((err: unknown) => console.error('[DELETE /api/patient/family/[memberId]] notification failed:', err));
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/patient/family/[memberId]]', err);
    return apiError(err);
  }
}
