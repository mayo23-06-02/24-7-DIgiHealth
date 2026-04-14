import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import User from '@/lib/models/User';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-for-dev-only');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    await connectToDatabase();
    
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, SECRET);
    const userId = payload.userId as string;

    const query: any = { patientId: userId };
    const now = new Date();

    if (statusFilter === 'upcoming') {
      query.status = { $in: ['scheduled', 'in_progress'] };
      query.scheduledStartTime = { $gte: now };
    } else if (statusFilter === 'past') {
      query.status = 'completed';
    } else if (statusFilter === 'cancelled') {
      query.status = 'cancelled';
    }

    const consultations = await Consultation.find(query)
      .populate({ path: 'practitionerId', model: User, select: 'firstName lastName email' })
      .sort({ scheduledStartTime: statusFilter === 'past' ? -1 : 1 });

    const mapped = consultations.map(c => ({
      id: c._id.toString(),
      title: c.chiefComplaint || 'Clinical Consultation',
      time: new Date(c.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      duration: '1h',
      color: c.type === 'video' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700',
      doctor: `Dr. ${c.practitionerId.firstName} ${c.practitionerId.lastName}`,
      doctorAvatar: `https://ui-avatars.com/api/?name=${c.practitionerId.firstName}+${c.practitionerId.lastName}&background=0052cc&color=fff`,
      type: c.type,
      status: c.status,
      date: new Date(c.scheduledStartTime).toDateString(),
      scheduledStartTime: c.scheduledStartTime,
      description: c.chiefComplaint
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Appointments API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}
