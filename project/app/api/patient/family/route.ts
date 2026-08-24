import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import FamilyLink from '@/lib/models/FamilyLink';
import { getGuardianFamilySlots } from '@/lib/family/access';
import { PatientProfile } from '@/lib/models/RoleProfiles';
import { isMongoObjectId } from '@/lib/utils/mongoId';

import { apiError } from "@/lib/api/errors";
/** GET — the caller's family links, both as guardian (members they manage)
 * and as member (guardians who manage them, for transparency). */
export async function GET() {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    // Postgres-native accounts have no Mongo identity (see lib/utils/mongoId.ts)
    // — FamilyLink/PatientProfile are still Mongo-only, so they genuinely have
    // no family links / profile recorded rather than a lookup failure.
    const hasMongoIdentity = isMongoObjectId(user.userId);

    let asGuardian: any[] = [];
    let asMember: any[] = [];
    let slots: { tier: string; maxFamilyMembers: number; used: number; remaining: number } = {
      tier: 'individual',
      maxFamilyMembers: 0,
      used: 0,
      remaining: 0,
    };
    let patientProfile: any = null;

    if (hasMongoIdentity) {
      [asGuardian, asMember, slots, patientProfile] = await Promise.all([
        FamilyLink.find({ guardianId: user.userId, status: { $in: ['pending', 'active'] } })
          .populate('memberId', 'firstName lastName email')
          .sort({ createdAt: -1 })
          .lean(),
        FamilyLink.find({ memberId: user.userId, status: 'active' })
          .populate('guardianId', 'firstName lastName email')
          .sort({ createdAt: -1 })
          .lean(),
        getGuardianFamilySlots(user.userId),
        PatientProfile.findOne({ userId: user.userId }).lean(),
      ]);
    }

    // Determine if user is a child (under 18)
    let isChild = false;
    if (patientProfile?.ageRange) {
      isChild = true;
    } else if (patientProfile?.dateOfBirth) {
      const dob = new Date(patientProfile.dateOfBirth);
      const now = new Date();
      const ageInYears = now.getFullYear() - dob.getFullYear();
      const monthDiff = now.getMonth() - dob.getMonth();
      const adjustedAge = monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())
        ? ageInYears - 1
        : ageInYears;
      isChild = adjustedAge < 18;
    }

    return NextResponse.json({
      success: true,
      data: {
        isChild,
        asGuardian: asGuardian.map((l: any) => ({
          id: l._id.toString(),
          member: l.memberId
            ? { id: l.memberId._id.toString(), name: `${l.memberId.firstName} ${l.memberId.lastName}`, email: l.isMinor ? user.email : l.memberId.email }
            : { id: null, name: l.inviteName || null, email: l.inviteEmail },
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
    return apiError(err);
  }
}
