import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Facility from '@/lib/models/Facility';
import StaffInvite from '@/lib/models/StaffInvite';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { resolveHospitalId } from '@/lib/hospital/resolveHospitalId';
import { getAppOrigin, normalizeEmail, isValidEmail } from '@/lib/supabase/auth';
import { sendEmail } from '@/lib/email/resend';
import { staffInviteEmailHtml } from '@/lib/email/templates/staffInvite';
import { syncStaffInvite, facilityIdFor } from '@/lib/postgres/facility';
import { getSupabaseAdmin } from '@/lib/supabase/server';

const INVITE_TTL_MINUTES = 15;

/** GET — list this facility's pending invites */
export async function GET() {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const hospitalId = await resolveHospitalId(user.userId, user.email);
    if (!hospitalId) {
      return NextResponse.json({ success: false, error: 'No facility linked to this account' }, { status: 404 });
    }

    const invites = await StaffInvite.find({ facilityId: hospitalId, status: 'pending' })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: invites });
  } catch (error: any) {
    console.error('[GET /api/hospital/staff/invite]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/** POST — invite a new (unregistered) doctor by email */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const hospitalId = await resolveHospitalId(user.userId, user.email);
    if (!hospitalId) {
      return NextResponse.json({ success: false, error: 'No facility linked to this account' }, { status: 404 });
    }

    const body = await req.json();
    const email = normalizeEmail(body.email || '');
    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, error: 'A valid email address is required' }, { status: 400 });
    }

    const shiftStart = body.shiftStart || '08:00';
    const shiftEnd = body.shiftEnd || '16:00';
    const hourlyRate = Number(body.hourlyRate) || 0;

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      if ((existingUser as any).role === 'practitioner') {
        return NextResponse.json(
          { success: false, error: 'A doctor with this email is already registered — search and add them directly instead.' },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { success: false, error: 'This email belongs to an existing account and cannot be invited as a doctor.' },
        { status: 409 },
      );
    }

    // Superseding a prior pending invite avoids two live links for the same person.
    await StaffInvite.updateMany(
      { email, facilityId: hospitalId, status: 'pending' },
      { status: 'cancelled' },
    );
    try {
      const pgFacilityId = await facilityIdFor(hospitalId);
      if (pgFacilityId) {
        await getSupabaseAdmin()
          .from('staff_invites')
          .update({ status: 'cancelled' })
          .eq('email', email)
          .eq('facility_id', pgFacilityId)
          .eq('status', 'pending');
      }
    } catch (e) {
      console.warn('[pg-sync] cancel prior invites skipped:', e);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_TTL_MINUTES * 60 * 1000);

    const invite = await StaffInvite.create({
      email,
      facilityId: hospitalId,
      invitedBy: user.userId,
      token,
      status: 'pending',
      shiftStart,
      shiftEnd,
      hourlyRate,
      expiresAt,
    });
    await syncStaffInvite(hospitalId, user.userId, invite as any);

    const facility = await Facility.findById(hospitalId).select('name').lean();
    const facilityName = (facility as any)?.name || 'the facility';
    const adminName = [user.firstName, user.lastName].filter(Boolean).join(' ');

    const origin = getAppOrigin(req.url);
    const inviteUrl = `${origin}/register/practitioner?invite=${token}`;

    const { error } = await sendEmail({
      to: email,
      subject: `You're invited to join ${facilityName} on 24/7 DigiHealth`,
      html: staffInviteEmailHtml({ facilityName, inviteUrl, adminName }),
    });

    if (error) {
      // Don't leave an orphaned invite the admin can't retry cleanly.
      await StaffInvite.findByIdAndDelete(invite._id);
      try {
        await getSupabaseAdmin().from('staff_invites').delete().eq('mongo_id', invite._id.toString());
      } catch (e) {
        console.warn('[pg-sync] delete orphaned invite skipped:', e);
      }
      return NextResponse.json({ success: false, error: `Failed to send invite email: ${error}` }, { status: 502 });
    }

    return NextResponse.json({ success: true, data: { email, expiresAt } });
  } catch (error: any) {
    console.error('[POST /api/hospital/staff/invite]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
