import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Call } from '@/lib/models/Call';

export async function GET(req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    await connectToDatabase();
    const { conversationId } = await params;

    const activeCall = await Call.findOne({ 
      conversationId, 
      status: 'active' 
    }).sort({ startedAt: -1 });

    if (activeCall) {
      return NextResponse.json({ 
        active: true, 
        roomUrl: activeCall.dailyRoomUrl, 
        callId: activeCall._id 
      });
    }

    return NextResponse.json({ active: false });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
