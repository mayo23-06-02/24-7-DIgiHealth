import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;

    // Validate dates
    const start = new Date(body.scheduledStart);
    const end = new Date(body.scheduledEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }
    if (start < new Date()) {
      return NextResponse.json({ error: 'Cannot book in the past' }, { status: 400 });
    }

    const consultation = await Consultation.create({
      patientId: userId,
      practitionerId: body.practitionerId,
      type: body.type || 'video',
      status: body.status || 'requested',
      scheduledStartTime: start,
      scheduledEndTime: end,
      chiefComplaint: body.reason || body.chiefComplaint,
    });

    return NextResponse.json({ success: true, data: consultation });
  } catch (err: any) {
    console.error('[POST /api/consultations/book]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}