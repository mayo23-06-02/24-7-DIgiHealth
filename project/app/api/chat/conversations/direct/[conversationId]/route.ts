import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Conversation } from '@/lib/models/Conversation';
import User from '@/lib/models/User';
import Consultation from '@/lib/models/Consultation';

export async function GET(req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    await connectToDatabase();
    const { conversationId } = await params;

    const conversation = await Conversation.findById(conversationId)
      .populate({ path: 'patientId', model: User, select: 'firstName lastName' })
      .populate({ path: 'practitionerId', model: User, select: 'firstName lastName' })
      .populate({ path: 'consultationId', model: Consultation, select: 'scheduledStartTime scheduledEndTime status' })
      .lean();

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Normalize ids to strings for the client
    const c = conversation as any;
    return NextResponse.json({
      ...c,
      _id: c._id?.toString(),
      patientId: c.patientId
        ? {
            ...c.patientId,
            _id: c.patientId._id?.toString(),
          }
        : c.patientId,
      practitionerId: c.practitionerId
        ? {
            ...c.practitionerId,
            _id: c.practitionerId._id?.toString(),
          }
        : c.practitionerId,
      consultationId: c.consultationId
        ? typeof c.consultationId === 'object'
          ? {
              ...c.consultationId,
              _id: c.consultationId._id?.toString(),
            }
          : c.consultationId?.toString()
        : c.consultationId,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
