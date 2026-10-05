import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { resolveHospitalId } from '@/lib/hospital/resolveHospitalId';
import Staff from '@/lib/models/Staff';

import { apiError } from "@/lib/api/errors";

/** Fields a hospital admin may change on a staff record. */
const EDITABLE = ['role', 'department', 'isOnDuty', 'hourlyRate', 'qualifications', 'shiftSchedule'] as const;

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const hospitalId = await resolveHospitalId(user.userId, user.email);
    if (!hospitalId) {
      return NextResponse.json({ success: false, error: 'No facility linked to this account' }, { status: 404 });
    }

    const { id } = await params;
    const body = await req.json();
    // `onDuty` is the legacy spelling the toggle button still sends
    if (body.onDuty !== undefined && body.isOnDuty === undefined) body.isOnDuty = body.onDuty;

    const $set: Record<string, unknown> = {};
    for (const key of EDITABLE) if (body[key] !== undefined) $set[key] = body[key];

    const updatedStaff = await Staff.findOneAndUpdate(
      { _id: id, facilityId: hospitalId },
      { $set },
      { new: true },
    ).lean();
    if (!updatedStaff) {
      return NextResponse.json({ success: false, error: 'Staff not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedStaff });
  } catch (error: any) {
    return apiError(error);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const hospitalId = await resolveHospitalId(user.userId, user.email);
    if (!hospitalId) {
      return NextResponse.json({ success: false, error: 'No facility linked to this account' }, { status: 404 });
    }

    const { id } = await params;
    await Staff.deleteOne({ _id: id, facilityId: hospitalId });

    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    return apiError(error);
  }
}
