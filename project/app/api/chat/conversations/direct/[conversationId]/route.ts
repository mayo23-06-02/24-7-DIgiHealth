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
      .populate({ path: 'patientId', model: User, select: 'firstName lastName avatar' })
      .populate({ path: 'practitionerId', model: User, select: 'firstName lastName avatar' })
      .populate({ path: 'consultationId', model: Consultation, select: 'scheduledStartTime scheduledEndTime status' })
      .lean();

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json(conversation);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
