import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/mongodb';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import User from '@/lib/models/User';
import FamilyLink, { syncFamilyLinkIndexes } from '@/lib/models/FamilyLink';
import { getGuardianFamilySlots } from '@/lib/family/access';
import { getAppOrigin, normalizeEmail, isValidEmail } from '@/lib/supabase/auth';
import { sendEmail } from '@/lib/email/postmark';
import { familyInviteEmailHtml } from '@/lib/email/templates/familyInvite';

const INVITE_TTL_MINUTES = 15;

/** POST — guardian invites an adult (spouse/parent) by email. Requires their
 * acceptance (see /api/patient/family/accept) before any access is granted. */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    await syncFamilyLinkIndexes();
    const guardian = await getRequestUser();
    if (!guardian) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const email = normalizeEmail(body.email || '');
    const relationship = ['child', 'spouse', 'parent', 'other'].includes(body.relationship) ? body.relationship : 'other';
    const inviteName = String(body.name || '').trim() || undefined;

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, error: 'A valid email address is required' }, { status: 400 });
    }
    if (guardian.email && normalizeEmail(guardian.email) === email) {
      return NextResponse.json({ success: false, error: "You can't invite yourself" }, { status: 400 });
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

    // Superseding a prior pending invite avoids two live links to the same person.
    await FamilyLink.updateMany(
      { guardianId: guardian.userId, inviteEmail: email, status: 'pending' },
      { status: 'revoked', revokedAt: new Date() },
    );

    const existingUser = await User.findOne({ email }).select('_id role').lean();
    if (existingUser && (existingUser as any).role !== 'patient') {
      return NextResponse.json(
        { success: false, error: 'This email belongs to a non-patient account and cannot be added as a family member.' },
        { status: 409 },
      );
    }

    const token = crypto.randomBytes(32).toString('hex');
    const inviteExpiresAt = new Date(Date.now() + INVITE_TTL_MINUTES * 60 * 1000);

    const linkData: any = {
      guardianId: guardian.userId,
      inviteEmail: email,
      inviteName,
      relationship,
      isMinor: false,
      status: 'pending',
      linkedVia: 'email_invite',
      inviteToken: token,
      inviteExpiresAt,
    };
    if (existingUser) {
      linkData.memberId = (existingUser as any)._id;
    }

    const link = await FamilyLink.create(linkData);

    const guardianName = [guardian.firstName, guardian.lastName].filter(Boolean).join(' ') || 'A 24/7 DigiHealth user';
    const origin = getAppOrigin(req.url);
    const inviteUrl = `${origin}/patient/family/accept?invite=${token}`;

    const { error } = await sendEmail({
      to: email,
      subject: `${guardianName} invited you to a family account on 24/7 DigiHealth`,
      html: familyInviteEmailHtml({ guardianName, relationship, inviteUrl, inviteeName: inviteName }),
    });

    if (error) {
      console.warn('[POST /api/patient/family/invite] Email provider warning (proceeding for testing):', error);
    }

    return NextResponse.json({ success: true, data: { email, name: inviteName, expiresAt: inviteExpiresAt, inviteUrl } });
  } catch (err: any) {
    console.error('[POST /api/patient/family/invite]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
