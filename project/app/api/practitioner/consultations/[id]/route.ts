import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import { PatientProfile, PractitionerProfile } from '@/lib/models/RoleProfiles';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { notifyAppointmentChange } from '@/lib/booking/notifications';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');

async function getUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    return (payload.userId as string) || null;
  } catch {
    return null;
  }
}

/**
 * Practitioner accept / decline / update consultation.
 * Always notifies the patient (other party).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();
    const actorUserId = await getUserId();

    const consultation = await Consultation.findById(id);
    if (!consultation) {
      return NextResponse.json(
        { success: false, error: 'Consultation not found' },
        { status: 404 },
      );
    }

    if (
      actorUserId &&
      consultation.practitionerId.toString() !== actorUserId
    ) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    const before = {
      status: consultation.status,
      scheduledStart: consultation.scheduledStartTime,
      scheduledEnd: consultation.scheduledEndTime,
      chiefComplaint: consultation.chiefComplaint,
      type: consultation.type,
    };

    if (body.status) {
      if (!['scheduled', 'cancelled', 'in_progress', 'completed'].includes(body.status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status update' },
          { status: 400 },
        );
      }
      consultation.status = body.status;
    }
    if (body.scheduledStart || body.scheduledStartTime) {
      const start = new Date(body.scheduledStart || body.scheduledStartTime);
      if (!Number.isNaN(start.getTime())) {
        consultation.scheduledStartTime = start;
      }
    }
    if (body.scheduledEnd || body.scheduledEndTime) {
      const end = new Date(body.scheduledEnd || body.scheduledEndTime);
      if (!Number.isNaN(end.getTime())) {
        consultation.scheduledEndTime = end;
      }
    }
    if (body.reason || body.chiefComplaint) {
      consultation.chiefComplaint = body.reason || body.chiefComplaint;
    }
    if (body.type) consultation.type = body.type;

    await consultation.save();

    // If accepted, mutually link patient and doctor
    if (body.status === 'scheduled') {
      await Promise.all([
        PractitionerProfile.updateOne(
          { userId: consultation.practitionerId },
          { $addToSet: { assignedPatientIds: consultation.patientId } },
        ),
        PatientProfile.updateOne(
          { userId: consultation.patientId },
          { $addToSet: { myDoctorIds: consultation.practitionerId } },
        ),
      ]);
    }

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
      actorUserId: actorUserId || consultation.practitionerId.toString(),
    });

    return NextResponse.json({ success: true, data: consultation });
  } catch (err: any) {
    console.error('[PATCH /api/practitioner/consultations/[id]]', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}
