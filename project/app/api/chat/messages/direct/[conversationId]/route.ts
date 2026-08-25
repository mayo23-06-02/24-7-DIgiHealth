import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Message from '@/lib/models/Message';
import { requireConversationParticipant } from '@/lib/auth/access';
import { apiError } from '@/lib/api/errors';

/**
 * Message history for a direct (non-appointment) thread.
 *
 * The participant check is not incidental to this route — it is the only thing
 * standing between a conversation id and somebody else's medical conversation.
 * Without it this returned every message in any thread to any signed-in
 * account, which is what the consultation-scoped sibling
 * (chat/messages/[consultationId]) has always guarded against and this one did
 * not.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;

    // Establishes the caller, the conversation, and that the two belong
    // together — or throws. It also connects to the database, so nothing below
    // needs to.
    await requireConversationParticipant(conversationId);

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
    return apiError(error, 'Messages could not be loaded. Please try again.');
  }
}
