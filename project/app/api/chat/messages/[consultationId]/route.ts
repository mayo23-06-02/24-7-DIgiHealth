import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { Message } from '@/lib/models/Message';
import { Conversation } from '@/lib/models/Conversation';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ consultationId: string }> }
) {
  try {
    const { consultationId } = await params;
    await connectToDatabase();

    if (!consultationId || !mongoose.Types.ObjectId.isValid(consultationId)) {
      return NextResponse.json({ error: 'Invalid consultation ID' }, { status: 400 });
    }

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 100);
    const before = url.searchParams.get('before');
    const after = url.searchParams.get('after');

    const conversation = await Conversation.findOne({
      consultationId: new mongoose.Types.ObjectId(consultationId),
    }).lean();

    if (!conversation) {
      return NextResponse.json([]);
    }

    const query: Record<string, unknown> = {
      conversationId: conversation._id,
    };

    if (before || after) {
      const createdAt: Record<string, Date> = {};
      if (before) {
        const d = new Date(before);
        if (!Number.isNaN(d.getTime())) createdAt.$lt = d;
      }
      if (after) {
        const d = new Date(after);
        if (!Number.isNaN(d.getTime())) createdAt.$gt = d;
      }
      if (Object.keys(createdAt).length > 0) {
        query.createdAt = createdAt;
      }
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const payload = messages.reverse().map((m) => ({
      ...m,
      _id: m._id?.toString(),
      conversationId: m.conversationId?.toString(),
      senderId: m.senderId?.toString(),
      receiverId: m.receiverId?.toString(),
      recordId: m.recordId?.toString(),
    }));

    return NextResponse.json(payload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch messages';
    console.error('[messages/consultation] GET error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
