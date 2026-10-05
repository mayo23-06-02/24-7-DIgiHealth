import { NextRequest, NextResponse } from 'next/server';
import { Consultation } from '@/lib/models/Consultation';
import User from '@/lib/models/User';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getBlockedAcceptorId } from '@/lib/booking/requester';

import { apiError } from "@/lib/api/errors";
import { isValidId } from '@/lib/db';
export async function GET(req: NextRequest) {
  try {
    // Auto-cancel unaccepted requests past their start time
    const { expireStaleBookingRequests } = await import('@/lib/booking/expire');
    await expireStaleBookingRequests();
    // Email reminder for consultations starting in ~10 minutes (throttled, idempotent)
    const { sendDueAppointmentReminders } = await import('@/lib/email/reminders');
    void sendDueAppointmentReminders();

    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;

    // A session id that is not a uuid cannot own any rows, so there is nothing to look up.
    if (!isValidId(userId)) {
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