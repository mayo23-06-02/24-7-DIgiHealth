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

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-for-dev-only');

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

  const mappedCons = cons.map(c => {
    const isPast = new Date(c.scheduledStartTime) < new Date();
    return {
      id: c._id,
      type: 'doctor',
      dr: c.practitionerId ? `Dr. ${c.practitionerId.firstName} ${c.practitionerId.lastName}` : 'Unknown Doctor',
      field: c.practitionerId ? specMap.get(c.practitionerId._id.toString()) || 'General' : 'General',
      date: new Date(c.scheduledStartTime).toDateString(),
      time: new Date(c.scheduledStartTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      img: c.practitionerId ? `https://ui-avatars.com/api/?name=${c.practitionerId.firstName}+${c.practitionerId.lastName}&background=0052cc&color=fff` : '',
      concern: c.chiefComplaint || 'Scheduled Consultation',
      status: c.status,
      countdown: isPast ? 'Past' : 'Upcoming',
      consultationId: c._id,
    };
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
