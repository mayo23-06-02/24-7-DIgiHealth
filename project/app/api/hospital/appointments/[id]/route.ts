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
    const updated = await HospitalAppointment.findOneAndUpdate(
      { _id: id, facilityId: hospitalId },
      body,
      { new: true },
    );
    if (!updated) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const pgUpdates: Record<string, unknown> = {};
    if (typeof body.status === 'string') pgUpdates.status = body.status;
    if (typeof body.type === 'string') pgUpdates.type = body.type;
    if (typeof body.room === 'string') pgUpdates.room = body.room;
    if (body.scheduledStart) pgUpdates.scheduled_start = body.scheduledStart;
    if (body.scheduledEnd) pgUpdates.scheduled_end = body.scheduledEnd;
    if (Object.keys(pgUpdates).length) {
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return apiError(error);
  }
}
