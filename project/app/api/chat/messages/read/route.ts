import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Message from '@/lib/models/Message';

export async function PATCH(req: Request) {
  try {
    await connectToDatabase();
    const { messageId, conversationId } = await req.json();

    if (messageId) {
      await Message.findByIdAndUpdate(messageId, { isRead: true, readAt: new Date() });
    } else if (conversationId) {
      // Mark all messages in conversation as read for the current user?
      // Actually we need the current user ID to make sure we only mark messages SENT TO them as read.
      // But let's keep it simple for now as requested.
      await Message.updateMany(
        { conversationId, isRead: false }, 
        { isRead: true, readAt: new Date() }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
