import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/mongodb';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import User from '@/lib/models/User';
import { PatientProfile } from '@/lib/models/RoleProfiles';
import { Subscription } from '@/lib/models/Billing';
import FamilyLink, { syncFamilyLinkIndexes } from '@/lib/models/FamilyLink';
import { getGuardianFamilySlots } from '@/lib/family/access';

/** guardian@example.com -> guardian+family-ab12cd34@example.com — a real,
 * technically-unique address that still lands in the guardian's inbox via
 * standard plus-addressing, since the child never logs in independently. */
function deriveChildEmail(guardianEmail: string): string {
  const [local, domain] = guardianEmail.split('@');
  const suffix = crypto.randomBytes(4).toString('hex');
  return `${local}+family-${suffix}@${domain}`;
}

/** POST — guardian adds a child directly, no consent step. */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    await syncFamilyLinkIndexes();
    const guardian = await getRequestUser();
    if (!guardian) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    const gender = body.gender;
    const idNumber = body.idNumber ? String(body.idNumber).trim() : undefined;
    const ageRange = ['0-2', '3-5', '5-12', '13-18'].includes(body.ageRange) ? body.ageRange : undefined;
    const relationship = ['child', 'spouse', 'parent', 'other'].includes(body.relationship) ? body.relationship : 'child';

    if (!firstName || !lastName) {
      return NextResponse.json({ success: false, error: 'First and last name are required' }, { status: 400 });
    }
    if (!dateOfBirth || Number.isNaN(dateOfBirth.getTime())) {
      return NextResponse.json({ success: false, error: 'A valid date of birth is required' }, { status: 400 });
    }
    if (!['male', 'female', 'other'].includes(gender)) {
      return NextResponse.json({ success: false, error: 'Gender is required' }, { status: 400 });
    }

    const slots = await getGuardianFamilySlots(guardian.userId);
    if (slots.remaining <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Your ${slots.tier} plan includes ${slots.maxFamilyMembers} family member(s) and you're already using all of them. Upgrade your plan to add more.`,
        },
        { status: 409 },
      );
    }

    const guardianUser = await User.findById(guardian.userId).select('email').lean();
    if (!guardianUser) return NextResponse.json({ success: false, error: 'Guardian account not found' }, { status: 404 });

    // Collision on the derived email is astronomically unlikely (4 random
    // bytes) but retry once rather than fail outright.
    let childEmail = deriveChildEmail((guardianUser as any).email);
    if (await User.exists({ email: childEmail })) {
      childEmail = deriveChildEmail((guardianUser as any).email);
    }

    const childUser = await User.create({
      email: childEmail,
      firstName,
      lastName,
      role: 'patient',
      status: 'active',
      emailVerified: true, // guardian-managed, never independently verified
      mfaEnabled: false,
    });

    await PatientProfile.create({
      userId: childUser._id,
      dateOfBirth,
      gender,
      idNumber,
      ageRange,
      subscriptionTier: 'pro',
    });

    const guardianSub = await Subscription.findOne({ patientId: guardian.userId, status: 'active' }).lean();

    await Subscription.create({
      patientId: childUser._id,
      payerId: guardian.userId,
      tier: guardianSub ? (guardianSub as any).tier : 'individual',
      status: 'active',
      startDate: new Date(),
      nextBillingDate: guardianSub ? (guardianSub as any).nextBillingDate : undefined,
      autoRenew: false, // renewal is driven by the guardian's own subscription, not this one independently
      price: 0, // no separate charge — consolidated under the guardian's plan
    });

    const link = await FamilyLink.create({
      guardianId: guardian.userId,
      memberId: childUser._id,
      relationship,
      isMinor: true,
      status: 'active',
      linkedVia: 'guardian_created',
      acceptedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: {
        linkId: link._id.toString(),
        member: { id: childUser._id.toString(), firstName, lastName, email: childEmail },
      },
    });
  } catch (err: any) {
    console.error('[POST /api/patient/family/child]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
