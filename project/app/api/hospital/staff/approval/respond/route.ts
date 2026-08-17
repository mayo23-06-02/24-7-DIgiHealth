import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { StaffApprovalRequest } from '@/lib/models/StaffApprovalRequest';
import User from '@/lib/models/User';
import Facility from '@/lib/models/Facility';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { resolvePgUserId } from '@/lib/postgres/resolveId';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { resolvePostgresHospitalId } from '@/lib/postgres/resolveId';

/** POST — respond to approval request (approve/reject) */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
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

    // Approve: Add doctor to staff
    const pgUserId = await resolvePgUserId(user.userId);
    const pgFacilityId = await resolvePostgresHospitalId(request.facilityId.toString(), '');

    console.log('[POST /api/hospital/staff/approval/respond] Approval details:', {
      doctorMongoId: user.userId,
      facilityMongoId: request.facilityId.toString(),
      pgUserId,
      pgFacilityId,
    });

    if (!pgUserId || !pgFacilityId) {
      console.error('[POST /api/hospital/staff/approval/respond] Failed to resolve IDs:', {
        pgUserId,
        pgFacilityId,
        doctorMongoId: user.userId,
        facilityMongoId: request.facilityId.toString(),
      });
      return NextResponse.json({ success: false, error: `Failed to resolve user or facility IDs. User ID resolved: ${!!pgUserId}, Facility ID resized: ${!!pgFacilityId}` }, { status: 500 });
    }

    // Add to staff table in PostgreSQL
    const { error: staffError } = await getSupabaseAdmin()
      .from('staff')
      .insert({
        user_id: pgUserId,
        facility_id: pgFacilityId,
        role: 'doctor',
        department: request.department,
        shift_start: request.shiftStart,
        shift_end: request.shiftEnd,
        shift_days: [1, 2, 3, 4, 5], // Default to weekdays
        is_on_duty: false,
        hourly_rate: Number(request.hourlyRate) || 0,
        qualifications: [],
      });

    if (staffError) {
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
