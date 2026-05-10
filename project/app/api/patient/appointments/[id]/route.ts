import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { payload } = await jwtVerify(token, SECRET);
    const userId = payload.userId as string;

    const body = await req.json();
    const { status, scheduledStartTime, chiefComplaint } = body;

    // Ensure the patient owns this consultation
    const consultation = await Consultation.findOne({ _id: id, patientId: userId });
    if (!consultation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (status) consultation.status = status;
    if (scheduledStartTime) {
        consultation.scheduledStartTime = new Date(scheduledStartTime);
        consultation.status = 'requested'; // Reset to requested so doctor must re-accept
    }
    if (chiefComplaint) consultation.chiefComplaint = chiefComplaint;

    await consultation.save();

    return NextResponse.json({ success: true, data: consultation });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    return PUT(req, { params });
}
