import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Message } from '@/lib/models/Message';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const unreadCount = await Message.countDocuments({
      receiverId: userId,
      isRead: false
    });

    return NextResponse.json({ unreadCount });
  } catch (error: any) {
    console.error('Unread Count API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
