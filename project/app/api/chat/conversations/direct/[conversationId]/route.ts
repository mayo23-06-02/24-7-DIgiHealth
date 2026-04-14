import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Conversation } from '@/lib/models/Conversation';
import User from '@/lib/models/User';

export async function GET(req: Request, { params }: { params: { conversationId: string } }) {
  try {
    await connectToDatabase();
    const { conversationId } = params;

    const conversation = await Conversation.findById(conversationId)
      .populate({ path: 'patientId', model: User, select: 'firstName lastName avatar' })
      .populate({ path: 'practitionerId', model: User, select: 'firstName lastName avatar' })
      .lean();

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json(conversation);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
