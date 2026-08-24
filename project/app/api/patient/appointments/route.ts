import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import User from '@/lib/models/User';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getBlockedAcceptorId } from '@/lib/booking/requester';
import { isMongoObjectId } from '@/lib/utils/mongoId';

import { apiError } from "@/lib/api/errors";
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    // Auto-cancel unaccepted requests past their start time
    const { expireStaleBookingRequests } = await import('@/lib/booking/expire');
    await expireStaleBookingRequests();
    // Email reminder for consultations starting in ~10 minutes (throttled, idempotent)
    const { sendDueAppointmentReminders } = await import('@/lib/email/reminders');
    void sendDueAppointmentReminders();

    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;

    // Postgres-native accounts have no Mongo identity — Consultation is
    // still Mongo-only, so they can't have any (see lib/utils/mongoId.ts).
    if (!isMongoObjectId(userId)) {
      return NextResponse.json({ success: true, data: [] });
    }

    const consultations = await Consultation.find({ patientId: userId })
      .populate('practitionerId', 'firstName lastName avatarUrl')
      .sort({ scheduledStartTime: 1 })
      .lean();

    const enriched = consultations.map(c => {
      const prac = c.practitionerId as any;
      const pending = (c as any).pendingReschedule;
      const blockedAcceptorId = getBlockedAcceptorId({
        source: (c as any).source,
        patientId: userId,
        practitionerId: prac ? prac._id : (c as any).practitionerId,
        pendingReschedule: pending,
      });
      const canAccept =
        (c.status === 'requested' || c.status === 'pending') &&
        (c.requestedTo
          ? c.requestedTo.toString() === userId
          : userId !== blockedAcceptorId);
      return {
        id: c._id.toString(),
        consultationId: c._id.toString(),
        practitionerId: prac ? prac._id.toString() : '',
        practitionerName: prac ? `Dr. ${prac.firstName} ${prac.lastName}` : 'Unknown Practitioner',
        practitionerAvatar: prac?.avatarUrl || '',
        patientId: userId,
        patientName: 'You', // Keep for reference, but we'll map to practitioner for display
        scheduledStart: c.scheduledStartTime,
        scheduledEnd: c.scheduledEndTime,
        status: c.status,
        type: c.type,
        reason: c.chiefComplaint,
        duration: '30 min',
        canAccept,
        pendingReschedule: pending
          ? {
              proposedStart: pending.proposedStart,
              proposedEnd: pending.proposedEnd,
              proposedByMe: pending.proposedBy?.toString() === userId,
            }
          : null,
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (err: any) {
    console.error('[GET /api/patient/appointments]', err);
    return apiError(err);
  }
}