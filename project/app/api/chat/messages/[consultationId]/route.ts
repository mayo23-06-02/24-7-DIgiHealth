import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { Message } from '@/lib/models/Message';
import { Conversation } from '@/lib/models/Conversation';
import { getRequestUser } from '@/lib/auth/getRequestUser';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ consultationId: string }> }
) {
  try {
    // Verify the user is authenticated
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Verify the user is a participant in this conversation
    const userMongoId = new mongoose.Types.ObjectId(user.userId);
    const isParticipant =
      conversation.patientId?.toString() === userMongoId.toString() ||
      conversation.practitionerId?.toString() === userMongoId.toString();

    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
