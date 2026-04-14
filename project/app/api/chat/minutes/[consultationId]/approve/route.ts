import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Conversation } from '@/lib/models/Conversation';

export async function POST(req: Request, { params }: { params: { consultationId: string } }) {
  try {
    await connectToDatabase();
    
    const conversation = await Conversation.findOne({ consultationId: params.consultationId });
    if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    conversation.minutesApproved += conversation.minutesRequested;
    conversation.minutesRequested = 0;
    await conversation.save();

    return NextResponse.json({ success: true, conversation });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
