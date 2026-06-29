import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import User from '@/lib/models/User';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;

    const consultations = await Consultation.find({ patientId: userId })
      .populate('practitionerId', 'firstName lastName avatarUrl')
      .sort({ scheduledStartTime: -1 })
      .lean();

    const enriched = consultations.map(c => {
      const prac = c.practitionerId as any;
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
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (err: any) {
    console.error('[GET /api/patient/appointments]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}