import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import { Notification } from '@/lib/models/Communications';
import User from '@/lib/models/User';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await connectToDatabase();
    
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, SECRET);
    const userId = payload.userId as string;

    const consultation = await Consultation.findById(id);
    if (!consultation) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });
    }

    // Verify current user is the practitioner for this consultation
    if (consultation.practitionerId.toString() !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    consultation.status = 'scheduled';
    await consultation.save();

    // Notify Patient
    const doctorUser = await User.findById(userId);
    await Notification.create({
      userId: consultation.patientId,
      type: 'appointment_approved',
      title: 'Appointment Approved',
      body: `Dr. ${doctorUser?.firstName} ${doctorUser?.lastName} has approved your consultation for ${new Date(consultation.scheduledStartTime).toLocaleString()}.`,
      data: { consultationId: consultation._id },
      isRead: false
    });

    return NextResponse.json({ 
      success: true, 
      consultation 
    });
  } catch (error) {
    console.error('Approve API Error:', error);
    return NextResponse.json({ error: 'Failed to approve consultation' }, { status: 500 });
  }
}
