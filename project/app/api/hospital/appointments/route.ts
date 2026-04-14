import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import HospitalAppointment from '@/lib/models/HospitalAppointment';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    const filter: any = {};
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
      .sort({ scheduledStart: 1 });

    return NextResponse.json({ success: true, data: appointments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const appointment = await HospitalAppointment.create(body);
    return NextResponse.json({ success: true, data: appointment });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
