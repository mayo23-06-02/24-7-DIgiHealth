import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Message } from '@/lib/models/Message';
import { Conversation } from '@/lib/models/Conversation';

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { conversationId, senderId, receiverId, content, type, fileUrl, fileMime } = body;

    const message = await Message.create({
      conversationId,
      senderId,
      receiverId,
      content,
      type,
      fileUrl,
      fileMime,
      deliveredAt: new Date(),
    });

    // Update conversation lastActivityAt
    await Conversation.findByIdAndUpdate(conversationId, { lastActivityAt: new Date() });

    // Emit socket event if server is running
    if ((global as any).io) {
      (global as any).io.to(conversationId).emit('new:message', message);
    }

    return NextResponse.json(message);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
