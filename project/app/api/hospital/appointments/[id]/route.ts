import { NextResponse } from 'next/server';
import HospitalAppointment from '@/lib/models/HospitalAppointment';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { resolveHospitalId } from '@/lib/hospital/resolveHospitalId';

import { apiError } from "@/lib/api/errors";
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
    // Only these fields may change; the people on an appointment cannot be swapped.
    const $set: Record<string, unknown> = {};
    for (const key of ['status', 'type', 'room', 'scheduledStart', 'scheduledEnd'] as const) {
      if (body[key] !== undefined) $set[key] = body[key];
    }
    const updated = await HospitalAppointment.findOneAndUpdate(
      { _id: id, facilityId: hospitalId },
      { $set },
      { new: true },
    );
    if (!updated) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return apiError(error);
  }
}
