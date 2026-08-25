import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import User from '@/lib/models/User';
import { riskBandFromScore } from '@/lib/riskScore';
import { getBlockedAcceptorId } from '@/lib/booking/requester';
import { requireRole } from '@/lib/auth/access';

import { apiError } from "@/lib/api/errors";
/**
 * Identity comes from the verified session, never from the request.
 *
 * The previous version tried a JWT first but accepted it only if the account
 * held the practitioner role — so a patient, holding a perfectly valid token,
 * failed that test and fell through to an `x-practitioner-id` header the
 * client sets and the proxy does not overwrite. Any signed-in account could
 * therefore read any practitioner's appointment book, and an unattributed
 * request was served as MOCK_PRACTITIONER_ID rather than rejected.
 *
 * Failing the role check now denies instead of falling back, which is the
 * whole difference.
 */
async function getPractitionerId(): Promise<string> {
  const user = await requireRole('practitioner', 'mega_admin');
  return user.userId;
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { expireStaleBookingRequests } = await import('@/lib/booking/expire');
    await expireStaleBookingRequests();
    // Email reminder for consultations starting in ~10 minutes (throttled, idempotent)
    const { sendDueAppointmentReminders } = await import('@/lib/email/reminders');
    void sendDueAppointmentReminders();
    const practitionerId = await getPractitionerId();
    const { searchParams } = new URL(req.url);

    const tab = searchParams.get('tab') || 'upcoming';
    const search = searchParams.get('search') || '';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    console.log('[GET /api/practitioner/appointments] practitionerId:', practitionerId, 'tab:', tab);

    const now = new Date();
    const filter: any = { practitionerId };

    // Don't apply time-based filters by default to show all appointments
    // Only apply if tab is specifically requested
    if (tab !== 'all') {
      switch (tab) {
        case 'upcoming':
          filter.scheduledStartTime = { $gte: now };
          filter.status = { $in: ['scheduled', 'in_progress'] };
          break;
        case 'past':
          filter.scheduledStartTime = { $lt: now };
          filter.status = { $in: ['completed', 'cancelled'] };
          break;
        case 'completed':
        case 'honored':
          // Successful / honored consultations only
          filter.status = 'completed';
          break;
        case 'cancelled':
          filter.status = 'cancelled';
          break;
        case 'requests':
          filter.status = { $in: ['pending', 'requested'] };
          break;
      }
    }

    if (from) filter.scheduledStartTime = { ...filter.scheduledStartTime, $gte: new Date(from) };
    if (to) filter.scheduledStartTime = { ...filter.scheduledStartTime, $lte: new Date(to) };

    console.log('[GET /api/practitioner/appointments] filter:', JSON.stringify(filter));

    const consultations = await Consultation.find(filter)
      .sort({ scheduledStartTime: 1 })
      .lean();

    console.log('[GET /api/practitioner/appointments] consultations found:', consultations.length);

    // Enrich with patient info
    const enriched = await Promise.all(
      consultations.map(async (c) => {
        const patient = await User.findById(c.patientId, 'firstName lastName').lean() as any;
        const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient';

        if (search && !patientName.toLowerCase().includes(search.toLowerCase())) return null;

        const start = new Date((c as any).scheduledStartTime || c.scheduledStart);
        const end = new Date((c as any).scheduledEndTime || c.scheduledEnd);
        const durationMinutes = Math.max(
          0,
          Math.round((end.getTime() - start.getTime()) / 60000) ||
            (c as any).callMinutesUsed ||
            0,
        );
        const pending = (c as any).pendingReschedule;
        const blockedAcceptorId = getBlockedAcceptorId({
          source: (c as any).source,
          patientId: c.patientId,
          practitionerId: c.practitionerId,
          pendingReschedule: pending,
        });
        const canAccept =
          (c.status === 'requested' || c.status === 'pending') &&
          (c.requestedTo
            ? c.requestedTo.toString() === practitionerId
            : practitionerId !== blockedAcceptorId);

        return {
          id: c._id.toString(),
          consultationId: c._id.toString(),
          patientId: c.patientId.toString(),
          patientName,
          scheduledStart: start,
          scheduledEnd: end,
          durationMinutes,
          callMinutesUsed: (c as any).callMinutesUsed || 0,
          status: c.status,
          type: c.type,
          reason: c.chiefComplaint,
          riskScore: c.clinicalRisk?.score || 0,
          riskColor: riskBandFromScore(c.clinicalRisk?.score || 0),
          riskFactors: c.clinicalRisk?.factors || [],
          soapNotes: c.soapNotes,
          aiRecommendations: (c as any).aiRecommendations || [],
          canAccept,
          pendingReschedule: pending
            ? {
                proposedStart: pending.proposedStart,
                proposedEnd: pending.proposedEnd,
                proposedByMe: pending.proposedBy?.toString() === practitionerId,
              }
            : null,
        };
      })
    );

    const result = enriched.filter(Boolean);
    console.log('[GET /api/practitioner/appointments] enriched result:', result.length);

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error('[GET /api/practitioner/appointments]', err);
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const practitionerId = await getPractitionerId();
    const { notifyBookingEvent } = await import('@/lib/booking/notifications');

    const start = new Date(body.scheduledStart);
    const end = new Date(body.scheduledEnd);
    const reason = body.reason || body.chiefComplaint || '';

    const consultation = await Consultation.create({
      practitionerId,
      patientId: body.patientId,
      type: body.type || 'video',
      status: body.status || 'pending',
      scheduledStartTime: start,
      scheduledEndTime: end,
      chiefComplaint: reason,
      source: 'practitioner_schedule',
    });

    // Patient gets notified of the scheduled/pending booking
    await notifyBookingEvent(
      consultation.status === 'scheduled' ? 'scheduled_created' : 'request_created',
      {
        consultationId: consultation._id,
        patientId: body.patientId,
        practitionerId,
        scheduledStart: start,
        reason,
        type: body.type || 'video',
        actorUserId: practitionerId,
      },
    );

    return NextResponse.json({ success: true, data: consultation });
  } catch (err: any) {
    return apiError(err);
  }
}
