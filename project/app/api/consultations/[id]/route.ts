import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import {
  notifyBookingEvent,
  notifyAppointmentChange,
} from '@/lib/booking/notifications';
import { expireStaleBookingRequests } from '@/lib/booking/expire';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    await expireStaleBookingRequests();

    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;
    const body = await req.json();

    const consultation = await Consultation.findOne({ _id: id, patientId: userId });
    if (!consultation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const before = {
      status: consultation.status,
      scheduledStart: consultation.scheduledStartTime,
      scheduledEnd: consultation.scheduledEndTime,
      chiefComplaint: consultation.chiefComplaint,
      type: consultation.type,
    };

    if (body.scheduledStartTime) {
      const newStart = new Date(body.scheduledStartTime);
      if (isNaN(newStart.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
      if (newStart < new Date()) return NextResponse.json({ error: 'Cannot reschedule to past' }, { status: 400 });
      consultation.scheduledStartTime = newStart;
      consultation.scheduledEndTime = new Date(newStart.getTime() + 30 * 60000); // default 30 min
      // Back to pending so the practitioner must re-accept
      if (consultation.status === 'scheduled' || consultation.status === 'requested') {
        consultation.status = 'pending';
      }
    }
    if (body.chiefComplaint) consultation.chiefComplaint = body.chiefComplaint;
    await consultation.save();

    await notifyAppointmentChange({
      before,
      after: {
        _id: consultation._id,
        patientId: consultation.patientId,
        practitionerId: consultation.practitionerId,
        status: consultation.status,
        scheduledStartTime: consultation.scheduledStartTime,
        scheduledEndTime: consultation.scheduledEndTime,
        chiefComplaint: consultation.chiefComplaint,
        type: consultation.type,
      },
      actorUserId: userId,
    });

    return NextResponse.json({ success: true, data: consultation });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;

    const consultation = await Consultation.findOne({ _id: id, patientId: userId });
    if (!consultation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    consultation.status = 'cancelled';
    await consultation.save();

    await notifyBookingEvent('cancelled', {
      consultationId: consultation._id,
      patientId: consultation.patientId,
      practitionerId: consultation.practitionerId,
      scheduledStart: consultation.scheduledStartTime,
      reason: consultation.chiefComplaint,
      type: consultation.type,
      actorUserId: userId,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
