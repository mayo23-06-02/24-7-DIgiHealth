import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PatientEvent } from '@/lib/models/PatientEvent';
import { Consultation } from '@/lib/models/Consultation';
import { Prescription } from '@/lib/models/ClinicalData';
import { PractitionerProfile } from '@/lib/models/RoleProfiles';
import User from '@/lib/models/User';
import { Facility } from '@/lib/models/Facility';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { isMongoObjectId } from '@/lib/utils/mongoId';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');

async function getPatientId() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.userId as string;
  } catch {
    return null;
  }
}

export async function GET() {
  const patientId = await getPatientId();
  if (!patientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Postgres-native accounts have no Mongo `User` row (see
  // lib/utils/mongoId.ts) — every collection below is still Mongo-only, so
  // they genuinely have an empty agenda rather than a lookup failure.
  if (!isMongoObjectId(patientId)) return NextResponse.json([]);

  await connectToDatabase();
  const patient = await User.findById(patientId);
  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // 1. Consultations from DB
  const cons = await Consultation.find({ patientId: patient._id })
    .populate({ path: 'practitionerId', model: User, select: 'firstName lastName' })
    .populate({ path: 'facilityId', model: Facility, select: 'name' })
    .sort({ scheduledStartTime: 1 });

  const pracIds = cons.map(c => c.practitionerId?._id);
  const profiles = await PractitionerProfile.find({ userId: { $in: pracIds } });
  const specMap = new Map(profiles.map(p => [p.userId.toString(), p.specialisation]));

  const mappedCons = cons.flatMap(c => {
    const isPast = new Date(c.scheduledStartTime) < new Date();
    const prac = c.practitionerId as any;
    const drName = prac ? `Dr. ${prac.firstName} ${prac.lastName}` : 'Unknown Doctor';
    const field = prac ? specMap.get(prac._id.toString()) || 'General' : 'General';
    const img = prac ? `https://ui-avatars.com/api/?name=${prac.firstName}+${prac.lastName}&background=4493b8&color=fff` : '';
    const pending = (c as any).pendingReschedule;

    const original = {
      id: c._id,
      type: 'doctor',
      dr: drName,
      field,
      date: new Date(c.scheduledStartTime).toDateString(),
      time: new Date(c.scheduledStartTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      img,
      concern: c.chiefComplaint || 'Scheduled Consultation',
      // Original slot is flagged separately (reschedulePending) rather than
      // having its status overwritten, so its real appointment state (e.g.
      // "confirmed") isn't lost while a proposal is outstanding.
      status: c.status === 'requested' ? 'requested' : c.status === 'scheduled' ? 'confirmed' : c.status,
      countdown: isPast ? 'Past' : 'Upcoming',
      consultationId: c._id,
      reschedulePending: !!pending,
      // The consultation's actual method — distinct from the 'doctor' agenda
      // category above. Without this the calendar had no way to tell a voice
      // booking from a video one and always drew the video icon/label.
      callType: c.type,
    };

    if (!pending) return [original];

    // A reschedule proposal is appointment activity in its own right — surface
    // it as its own calendar entry at the proposed date/time so patients see
    // it, rather than only the stale original slot.
    const proposedStart = new Date(pending.proposedStart);
    const proposed = {
      id: `${c._id}-reschedule-proposed`,
      type: 'doctor',
      dr: drName,
      field,
      date: proposedStart.toDateString(),
      time: proposedStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      img,
      concern: c.chiefComplaint || 'Scheduled Consultation',
      status: 'reschedule_proposed',
      countdown: proposedStart.getTime() < Date.now() ? 'Past' : 'Proposed',
      consultationId: c._id,
      isProposedReschedule: true,
      callType: c.type,
    };

    return [original, proposed];
  });

  // 2. Prescriptions (Refills)
  const prescs = await Prescription.find({ patientId: patient._id, status: 'active', refillsRemaining: { $gt: 0 } });
  const mappedPres = prescs.map((p, i) => ({
    id: p._id,
    type: 'refill',
    title: p.medicationName,
    location: 'Telehealth Pharmacy',
    date: new Date(Date.now() + 86400000 * (i + 5)).toDateString(),
    time: '09:00 AM',
    img: '',
    concern: p.instructions,
    status: 'pending',
    countdown: `In ${i + 5} days`,
  }));

  // 3. Patient personal events
  const events = await PatientEvent.find({ patientId: patient._id }).sort({ date: 1 }).lean();
  const mappedEvents = events.map(e => ({
    id: e._id,
    type: e.type,
    title: e.title,
    date: e.date,
    time: e.time,
    img: '',
    concern: e.notes || '',
    status: 'confirmed',
    countdown: 'Personal',
    color: e.color,
  }));

  const agenda = [...mappedCons, ...mappedPres, ...mappedEvents]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return NextResponse.json(agenda);
}

export async function POST(request: Request) {
  const patientId = await getPatientId();
  if (!patientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectToDatabase();
  const body = await request.json();
  const { title, date, time, type, notes, color } = body;

  if (!title?.trim() || !date) {
    return NextResponse.json({ error: 'Title and date are required' }, { status: 400 });
  }

  const event = await PatientEvent.create({ patientId, title: title.trim(), date, time, type, notes, color });
  return NextResponse.json(event, { status: 201 });
}
