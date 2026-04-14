import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Consultation from '@/lib/models/Consultation';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    const { status } = body;

    if (!['scheduled', 'cancelled'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status update' }, { status: 400 });
    }

    const consultation = await Consultation.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!consultation) {
      return NextResponse.json({ success: false, error: 'Consultation not found' }, { status: 404 });
    }

    // MVP Note: In a full system, you would insert an entry into a Notification collection
    // here so the patient receives an in-app ping about the acceptance/rejection.
    // e.g. await Notification.create({ userId: consultation.patientId, message: "Your consultation was accepted!" })

    return NextResponse.json({ success: true, data: consultation });
  } catch (err: any) {
    console.error('[PATCH /api/practitioner/consultations/[id]]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
