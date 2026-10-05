import { NextRequest, NextResponse } from 'next/server';
import { StaffApprovalRequest } from '@/lib/models/StaffApprovalRequest';
import User from '@/lib/models/User';
import Facility from '@/lib/models/Facility';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import Staff from '@/lib/models/Staff';

import { apiError } from "@/lib/api/errors";
/** POST — respond to approval request (approve/reject) */
export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser();
    if (!user || user.role !== 'practitioner') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { token, action } = body;

    if (!token || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }

    const request = await StaffApprovalRequest.findOne({ token, status: 'pending' });
    if (!request) {
      return NextResponse.json({ success: false, error: 'Invalid or expired approval request' }, { status: 404 });
    }

    // Verify the request is for this doctor
    if (request.doctorId.toString() !== user.userId) {
      return NextResponse.json({ success: false, error: 'This approval request is not for your account' }, { status: 403 });
    }

    // Check if expired
    if (new Date(request.expiresAt) < new Date()) {
      await StaffApprovalRequest.findByIdAndUpdate(request._id, { status: 'expired' });
      return NextResponse.json({ success: false, error: 'Approval request has expired' }, { status: 404 });
    }

    if (action === 'reject') {
      await StaffApprovalRequest.findByIdAndUpdate(request._id, {
        status: 'rejected',
        respondedAt: new Date(),
      });
      return NextResponse.json({ success: true });
    }

    // Approve: add the doctor to the facility roster
    try {
      await Staff.create({
        userId: user.userId,
        facilityId: request.facilityId,
        role: 'doctor',
        department: request.department,
        shiftSchedule: {
          start: request.shiftStart,
          end: request.shiftEnd,
          days: [1, 2, 3, 4, 5], // Default to weekdays
        },
        isOnDuty: false,
        hourlyRate: Number(request.hourlyRate) || 0,
        qualifications: [],
      });
    } catch (staffError) {
      console.error('[POST /api/hospital/staff/approval/respond] staff insert error:', staffError);
      return NextResponse.json({ success: false, error: 'Failed to add staff record' }, { status: 500 });
    }

    // Update approval request status
    await StaffApprovalRequest.findByIdAndUpdate(request._id, {
      status: 'approved',
      respondedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[POST /api/hospital/staff/approval/respond]', error);
    return apiError(error);
  }
}
