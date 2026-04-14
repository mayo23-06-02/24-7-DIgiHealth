import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import HospitalAppointment from '@/lib/models/HospitalAppointment';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const updated = await HospitalAppointment.findByIdAndUpdate(params.id, body, { new: true });
    if (!updated) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
