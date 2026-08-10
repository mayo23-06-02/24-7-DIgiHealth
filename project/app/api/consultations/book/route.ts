import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import mongoose from 'mongoose';
import { notifyBookingEvent } from '@/lib/booking/notifications';
import { expireStaleBookingRequests } from '@/lib/booking/expire';
import { isMongoObjectId } from '@/lib/utils/mongoId';

/**
 * Legacy patient booking endpoint.
 * Prefer POST /api/bookings for new code (unified booking system).
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    await expireStaleBookingRequests({ notify: true });

    const body = await req.json();
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;
    if (!isMongoObjectId(userId)) {
      return NextResponse.json(
        { success: false, error: 'Booking is not yet available for this account.' },
        { status: 400 },
      );
    }

    if (!body.practitionerId || !mongoose.Types.ObjectId.isValid(body.practitionerId)) {
      return NextResponse.json({ success: false, error: 'Invalid practitionerId' }, { status: 400 });
    }

    const start = new Date(body.scheduledStart);
    const end = new Date(body.scheduledEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ success: false, error: 'Invalid date format' }, { status: 400 });
    }
    if (start.getTime() < Date.now() - 60_000) {
      return NextResponse.json({ success: false, error: 'Cannot book in the past' }, { status: 400 });
    }

    const conflict = await Consultation.findOne({
      practitionerId: body.practitionerId,
      status: { $in: ['requested', 'pending', 'scheduled', 'in_progress'] },
      scheduledStartTime: { $lt: end },
      scheduledEndTime: { $gt: start },
    }).lean();

    if (conflict) {
      return NextResponse.json(
        { success: false, error: 'This time slot conflicts with an existing appointment.' },
        { status: 409 },
      );
    }

    const reason = body.reason || body.chiefComplaint || '';
    const consultation = await Consultation.create({
      patientId: userId,
      practitionerId: body.practitionerId,
      type: body.type || 'video',
      status: body.status || 'requested',
      scheduledStartTime: start,
      scheduledEndTime: end,
      chiefComplaint: reason,
      source: 'patient_self_serve',
      requestedTo: body.practitionerId,
    });

    await notifyBookingEvent('request_created', {
      consultationId: consultation._id,
      patientId: userId,
      practitionerId: body.practitionerId,
      scheduledStart: start,
      reason,
      type: body.type || 'video',
      actorUserId: userId,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: consultation._id.toString(),
        consultationId: consultation._id.toString(),
        patientId: userId,
        practitionerId: body.practitionerId,
        scheduledStart: consultation.scheduledStartTime,
        scheduledEnd: consultation.scheduledEndTime,
        status: consultation.status,
        type: consultation.type,
        reason: consultation.chiefComplaint,
      },
    });
  } catch (err: any) {
    console.error('[POST /api/consultations/book]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
