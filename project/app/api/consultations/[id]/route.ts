import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');

async function getAuthUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    return payload.userId as string;
  } catch {
    return null;
  }
}

// PATCH /api/consultations/[id] — reschedule (change scheduledStartTime/End)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();
    const { scheduledStartTime, scheduledEndTime } = body;

    if (!scheduledStartTime) {
      return NextResponse.json({ error: 'scheduledStartTime is required' }, { status: 400 });
    }

    const start = new Date(scheduledStartTime);
    if (isNaN(start.getTime())) {
      return NextResponse.json({ error: 'Invalid scheduledStartTime' }, { status: 400 });
    }

    // Default end = start + 1 hour
    const end = scheduledEndTime ? new Date(scheduledEndTime) : new Date(start.getTime() + 60 * 60 * 1000);

    const consultation = await Consultation.findOneAndUpdate(
      { _id: id, patientId: userId },
      { scheduledStartTime: start, scheduledEndTime: end, status: 'scheduled' },
      { new: true }
    );

    if (!consultation) {
      return NextResponse.json({ error: 'Consultation not found or not authorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, consultation });
  } catch (error) {
    console.error('PATCH consultation error:', error);
    return NextResponse.json({ error: 'Failed to update consultation' }, { status: 500 });
  }
}

// DELETE /api/consultations/[id] — cancel
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    const { id } = await params;

    const consultation = await Consultation.findOneAndUpdate(
      { _id: id, patientId: userId },
      { status: 'cancelled' },
      { new: true }
    );

    if (!consultation) {
      return NextResponse.json({ error: 'Consultation not found or not authorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE consultation error:', error);
    return NextResponse.json({ error: 'Failed to cancel consultation' }, { status: 500 });
  }
}
