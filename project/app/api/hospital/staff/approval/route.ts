import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Facility from '@/lib/models/Facility';
import { StaffApprovalRequest } from '@/lib/models/StaffApprovalRequest';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { resolveHospitalId } from '@/lib/hospital/resolveHospitalId';
import { getAppOrigin } from '@/lib/supabase/auth';
import { sendEmail } from '@/lib/email/resend';
import { staffApprovalEmailHtml } from '@/lib/email/templates/staffApproval';

import { apiError } from "@/lib/api/errors";
const APPROVAL_TTL_HOURS = 48;

/** POST — send approval request to an existing doctor */
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
    const { doctorId, department, shiftStart, shiftEnd, hourlyRate } = body;

    if (!doctorId) {
      return NextResponse.json({ success: false, error: 'Doctor ID is required' }, { status: 400 });
    }

    // Verify the doctor exists and is a practitioner
    const doctor = await User.findById(doctorId).lean();
    if (!doctor || doctor.role !== 'practitioner') {
      return NextResponse.json({ success: false, error: 'Doctor not found or invalid' }, { status: 404 });
    }

    // Check if there's already a pending or approved request for this doctor
    const existingRequest = await StaffApprovalRequest.findOne({
      doctorId,
      facilityId: hospitalId,
      status: { $in: ['pending', 'approved'] },
    });
    if (existingRequest) {
      if (existingRequest.status === 'approved') {
        return NextResponse.json(
          { success: false, error: 'This doctor is already linked to your facility' },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { success: false, error: 'A pending approval request already exists for this doctor' },
        { status: 409 },
      );
    }

    // Cancel any previous pending requests
    await StaffApprovalRequest.updateMany(
      { doctorId, facilityId: hospitalId, status: 'pending' },
      { status: 'cancelled' },
    );

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + APPROVAL_TTL_HOURS * 60 * 60 * 1000);

    const approvalRequest = await StaffApprovalRequest.create({
      doctorId,
      facilityId: hospitalId,
      requestedBy: user.userId,
      token,
      status: 'pending',
      department,
      shiftStart,
      shiftEnd,
      hourlyRate,
      expiresAt,
    });

    const facility = await Facility.findById(hospitalId).select('name').lean();
    const facilityName = (facility as any)?.name || 'the facility';
    const adminName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    const doctorName = [doctor.firstName, doctor.lastName].filter(Boolean).join(' ');

    const origin = getAppOrigin(req.url);
    const approvalUrl = `${origin}/doctor/facility-approval?token=${token}`;

    const { error } = await sendEmail({
      to: doctor.email,
      subject: `Facility Link Request: ${facilityName}`,
      html: staffApprovalEmailHtml({
        facilityName,
        doctorName,
        approvalUrl,
        adminName,
        department,
      }),
    });

    if (error) {
      await StaffApprovalRequest.findByIdAndDelete(approvalRequest._id);
      return NextResponse.json({ success: false, error: `Failed to send approval email: ${error}` }, { status: 502 });
    }

    return NextResponse.json({ success: true, data: { email: doctor.email, expiresAt } });
  } catch (error: any) {
    console.error('[POST /api/hospital/staff/approval]', error);
    return apiError(error);
  }
}
