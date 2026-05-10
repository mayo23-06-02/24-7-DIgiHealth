import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import User from '@/lib/models/User';
import { Review } from '@/lib/models/ReviewsDocs';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');

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
      query.status = { $in: ['scheduled', 'in_progress', 'requested', 'pending'] };
      query.scheduledStartTime = { $gte: now };
    } else if (statusFilter === 'pending') {
      query.status = { $in: ['requested', 'pending'] };
    } else if (statusFilter === 'past') {
      query.status = 'completed';
    } else if (statusFilter === 'cancelled') {
      query.status = 'cancelled';
    }

    const consultations = await Consultation.find(query)
      .populate({ path: 'practitionerId', model: User, select: 'firstName lastName email' })
      .sort({ scheduledStartTime: statusFilter === 'past' ? -1 : 1 })
      .lean();

    let reviewMap = new Map();
    if (consultations.length > 0) {
      const consultationIds = consultations.map(c => c._id);
      const reviews = await Review.find({ consultationId: { $in: consultationIds } }).lean();
      reviewMap = new Map(reviews.map(r => [r.consultationId?.toString() || '', r.rating]));
    }

    const mapped = consultations.map(c => {
      const prac = c.practitionerId as any;
      const cIdStr = c._id.toString();
      return {
        id: cIdStr,
        title: c.chiefComplaint || 'Clinical Consultation',
        time: new Date(c.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duration: '1h',
        color: c.type === 'video' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700',
        doctor: prac ? `Dr. ${prac.firstName} ${prac.lastName}` : 'Unknown Doctor',
        doctorAvatar: prac ? `https://ui-avatars.com/api/?name=${prac.firstName}+${prac.lastName}&background=0052cc&color=fff` : '',
        practitionerId: prac ? prac._id.toString() : '',
        type: c.type,
        status: c.status,
        date: new Date(c.scheduledStartTime).toDateString(),
        scheduledStartTime: c.scheduledStartTime,
        description: c.chiefComplaint,
        rating: reviewMap.get(cIdStr) || 0
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Appointments API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}
