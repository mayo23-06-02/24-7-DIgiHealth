import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import Message from '@/lib/models/Message';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    await connectToDatabase();
    const { conversationId } = await params;

    if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const after = searchParams.get('after');
    const before = searchParams.get('before');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 100);

    // Always cast — raw string comparison against ObjectId fields returns 0 docs
    const query: Record<string, unknown> = {
      conversationId: new mongoose.Types.ObjectId(conversationId),
    };

    if (after || before) {
      const createdAt: Record<string, Date> = {};
      if (after) {
        const d = new Date(after);
        if (!Number.isNaN(d.getTime())) createdAt.$gt = d;
      }
      if (before) {
        const d = new Date(before);
        if (!Number.isNaN(d.getTime())) createdAt.$lt = d;
      }
      if (Object.keys(createdAt).length > 0) {
        query.createdAt = createdAt;
      }
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Serialize ObjectIds to strings for stable client comparisons
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
    console.error('[messages/direct] GET error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
