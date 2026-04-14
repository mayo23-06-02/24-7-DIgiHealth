import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Message } from '@/lib/models/Message';
import { Conversation } from '@/lib/models/Conversation';

export async function GET(req: Request, { params }: { params: Promise<{ consultationId: string }> }) {
  try {
    const { consultationId } = await params;
    await connectToDatabase();
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const before = url.searchParams.get('before');
    const after = url.searchParams.get('after');

    const conversation = await Conversation.findOne({ consultationId });
    if (!conversation) return NextResponse.json([]);

    const query: any = { conversationId: conversation._id };
    if (before) query.createdAt = { $lt: new Date(before) };
    if (after) query.createdAt = { $gt: new Date(after) };

    const messages = await Message.find(query).sort({ createdAt: -1 }).limit(limit);
    return NextResponse.json(messages.reverse());
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
