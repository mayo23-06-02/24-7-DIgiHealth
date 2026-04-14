import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Conversation } from '@/lib/models/Conversation';
import { Call } from '@/lib/models/Call';
import Consultation from '@/lib/models/Consultation';

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const { callId } = await req.json();

    const call = await Call.findById(callId);
    if (!call) return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    if (call.status === 'ended') return NextResponse.json({ success: true, message: 'Already ended' });

    const endedAt = new Date();
    const durationSeconds = Math.floor((endedAt.getTime() - call.startedAt.getTime()) / 1000);
    
    call.endedAt = endedAt;
    call.durationSeconds = durationSeconds;
    call.status = 'ended';
    await call.save();

    // Update conversation minutes used
    const conversation = await Conversation.findOne({ consultationId: call.consultationId });
    if (conversation) {
        const minutesToAdd = Math.ceil(durationSeconds / 60);
        conversation.minutesUsed += minutesToAdd;
        await conversation.save();
    }

    // Update Consultation callMinutesUsed
    await Consultation.findByIdAndUpdate(call.consultationId, { $inc: { callMinutesUsed: Math.ceil(durationSeconds / 60) } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
