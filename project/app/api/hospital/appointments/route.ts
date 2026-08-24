import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import HospitalAppointment from '@/lib/models/HospitalAppointment';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { resolveHospitalId } from '@/lib/hospital/resolveHospitalId';
import { syncHospitalAppointment } from '@/lib/postgres/facility';

import { apiError } from "@/lib/api/errors";
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const hospitalId = await resolveHospitalId(user.userId, user.email);
    if (!hospitalId) {
      return NextResponse.json({ success: false, error: 'No facility linked to this account.' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    const filter: any = { facilityId: hospitalId };
    if (status) filter.status = status;
    if (date) {
      const d = new Date(date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      filter.scheduledStart = { $gte: d, $lt: next };
    }

    const appointments = await HospitalAppointment.find(filter)
      .populate('patientId', 'firstName lastName email')
      .populate('practitionerId', 'firstName lastName profile')
      .sort({ scheduledStart: 1 })
      .lean();

    return NextResponse.json({ success: true, data: appointments });
  } catch (error: any) {
    console.error('[GET /api/hospital/appointments]', error);
    return apiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const hospitalId = await resolveHospitalId(user.userId, user.email);
    if (!hospitalId) {
      return NextResponse.json({ success: false, error: 'No facility linked to this account.' }, { status: 404 });
    }

    const body = await req.json();
    const appointment = await HospitalAppointment.create({
      ...body,
      facilityId: hospitalId
    });
    await syncHospitalAppointment(
      hospitalId,
      appointment.patientId.toString(),
      appointment.practitionerId.toString(),
      appointment as any,
    );

    return NextResponse.json({ success: true, data: appointment });
  } catch (error: any) {
    console.error('[POST /api/hospital/appointments]', error);
    return apiError(error);
  }
}
