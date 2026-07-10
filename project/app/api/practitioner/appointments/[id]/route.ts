import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { notifyAppointmentChange } from '@/lib/booking/notifications';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { payload } = await jwtVerify(token, SECRET);
    const userId = payload.userId as string;
    const body = await req.json();

    const consultation = await Consultation.findOne({
      _id: id,
      practitionerId: userId,
    });
    if (!consultation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const before = {
      status: consultation.status,
      scheduledStart: consultation.scheduledStartTime,
      scheduledEnd: consultation.scheduledEndTime,
      chiefComplaint: consultation.chiefComplaint,
      type: consultation.type,
    };

    if (body.status) consultation.status = body.status;
    if (body.scheduledStart) {
      const newStart = new Date(body.scheduledStart);
      if (isNaN(newStart.getTime())) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
      }
      consultation.scheduledStartTime = newStart;
    }
    if (body.scheduledEnd) {
      const newEnd = new Date(body.scheduledEnd);
      if (isNaN(newEnd.getTime())) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
      }
      consultation.scheduledEndTime = newEnd;
    }
    if (body.chiefComplaint || body.reason) {
      consultation.chiefComplaint = body.chiefComplaint || body.reason;
    }
    if (body.type) consultation.type = body.type;

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
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return PUT(req, { params });
}
