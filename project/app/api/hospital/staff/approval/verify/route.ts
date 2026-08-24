import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { StaffApprovalRequest } from '@/lib/models/StaffApprovalRequest';
import User from '@/lib/models/User';
import Facility from '@/lib/models/Facility';

import { apiError } from "@/lib/api/errors";
/** GET — verify approval request by token */
export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 });
    }

    const request = await StaffApprovalRequest.findOne({ token, status: 'pending' }).lean();
    if (!request) {
      return NextResponse.json({ success: false, error: 'Invalid or expired approval request' }, { status: 404 });
    }

    // Check if expired
    if (new Date(request.expiresAt) < new Date()) {
      await StaffApprovalRequest.findByIdAndUpdate(request._id, { status: 'expired' });
      return NextResponse.json({ success: false, error: 'Approval request has expired' }, { status: 404 });
    }

    // Fetch facility and requester details
    const [facility, requester] = await Promise.all([
      Facility.findById(request.facilityId).select('name').lean(),
      User.findById(request.requestedBy).select('firstName lastName').lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        _id: request._id.toString(),
        facilityId: request.facilityId.toString(),
        facilityName: (facility as any)?.name || 'Unknown Facility',
        requestedBy: request.requestedBy.toString(),
        requestedByName: requester ? [requester.firstName, requester.lastName].filter(Boolean).join(' ') : 'Unknown',
        department: request.department,
        shiftStart: request.shiftStart,
        shiftEnd: request.shiftEnd,
        hourlyRate: request.hourlyRate,
        expiresAt: request.expiresAt,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/hospital/staff/approval/verify]', error);
    return apiError(error);
  }
}
