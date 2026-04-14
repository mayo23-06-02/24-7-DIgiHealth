import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Conversation } from '@/lib/models/Conversation';
import { Call } from '@/lib/models/Call';

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const { consultationId, conversationId, type, userId } = await req.json();
    let conversation;

    if (consultationId) {
      conversation = await Conversation.findOne({ consultationId });
    } else if (conversationId) {
      conversation = await Conversation.findById(conversationId);
    }

    if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (conversation.minutesUsed >= conversation.minutesAllocated + conversation.minutesApproved) {
      return NextResponse.json({ error: 'No minutes left' }, { status: 400 });
    }

    // Check if there is already an active call
    const activeCall = await Call.findOne({ 
      $or: [{ consultationId }, { conversationId: conversation._id }], 
      status: 'active' 
    });
    if (activeCall) {
        // Return existing room info
        return NextResponse.json({ 
          roomUrl: activeCall.dailyRoomUrl, 
          token: activeCall.dailyToken, 
          callId: activeCall._id 
        });
    }

    const API_KEY = process.env.DAILY_API_KEY || 'cbe3c6f6fc1dd7ea34f6a594dbe496fde5f55d49a3bbb77154665ce5d3d3fadd';

    // Create Daily.co room
    const roomName = `call-${consultationId || conversation._id}-${Date.now()}`;
    const roomRes = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: { 
          'Authorization': `Bearer ${API_KEY}`, 
          'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
          name: roomName, 
          properties: { exp: Math.floor(Date.now() / 1000) + 3600 } 
      }),
    });
    
    if (!roomRes.ok) {
        const errorText = await roomRes.text();
        console.error("Daily.co Room Error:", errorText);
        return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
    }

    const roomData = await roomRes.json();

    // Token for initiator
    const tokenRes = await fetch('https://api.daily.co/v1/meeting-tokens', {
      method: 'POST',
      headers: { 
          'Authorization': `Bearer ${API_KEY}`, 
          'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
          properties: { 
              room_name: roomData.name, 
              user_name: userId, 
              is_owner: true, 
              start_video_off: type === 'voice' 
          } 
      }),
    });
    
    const tokenData = await tokenRes.ok ? await tokenRes.json() : { token: null };

    // Save call record
    const call = await Call.create({
      consultationId: consultationId || undefined,
      conversationId: conversation._id,
      initiatedBy: userId,
      type,
      status: 'active',
      dailyRoomUrl: roomData.url,
      dailyToken: tokenData.token,
    });

    return NextResponse.json({ roomUrl: roomData.url, token: tokenData.token, callId: call._id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
