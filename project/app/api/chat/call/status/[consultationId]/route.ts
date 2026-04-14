import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Call } from '@/lib/models/Call';

export async function GET(req: Request, { params }: { params: Promise<{ consultationId: string }> }) {
  try {
    const { consultationId } = await params;
    await connectToDatabase();
    
    const activeCall = await Call.findOne({ 
        consultationId, 
        status: 'active' 
    });
    
    if (!activeCall) {
        return NextResponse.json({ active: false });
    }
    
    return NextResponse.json({ 
        active: true, 
        type: activeCall.type, 
        roomUrl: activeCall.dailyRoomUrl,
        callId: activeCall._id
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
