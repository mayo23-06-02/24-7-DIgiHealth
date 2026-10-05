import { NextResponse } from 'next/server';
import { Message } from '@/lib/models/Message';
import { Conversation } from '@/lib/models/Conversation';
import Ably from 'ably';
import { getRequestUser } from '@/lib/auth/getRequestUser';

import { apiError } from "@/lib/api/errors";
import { isValidId, toId, newId } from '@/lib/db';
function serializeMessage(message: any, clientId?: string) {
  const obj = typeof message.toObject === 'function' ? message.toObject() : { ...message };
  return {
    ...obj,
    _id: obj._id?.toString?.() ?? obj._id,
    conversationId: obj.conversationId?.toString?.() ?? obj.conversationId,
    senderId: obj.senderId?.toString?.() ?? obj.senderId,
    receiverId: obj.receiverId?.toString?.() ?? obj.receiverId,
    recordId: obj.recordId?.toString?.() ?? obj.recordId,
    ...(clientId ? { clientId } : {}),
  };
}

export async function POST(req: Request) {
  try {
    // Verify the user is authenticated
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { conversationId, content, type, fileUrl, fileMime, clientId } = body;

    if (!conversationId || !isValidId(conversationId)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }

    const conversationKey = (toId(conversationId) as string);

    // Verify the user is a participant in this conversation
    const conversation = await Conversation.findById(conversationKey).lean();
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const currentUserId = (toId(user.userId) as string);
    const isParticipant =
      conversation.patientId?.toString() === currentUserId.toString() ||
      conversation.practitionerId?.toString() === currentUserId.toString();

    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use the authenticated user's ID as senderId (not client-supplied)
    const senderId = currentUserId;
    const receiverId =
      conversation.patientId?.toString() === currentUserId.toString()
        ? conversation.practitionerId
        : conversation.patientId;

    // Idempotent message creation using clientId when provided
    const filter = clientId
      ? { clientId, conversationId: conversationKey }
      : { _id: newId() };

    const message = await Message.findOneAndUpdate(
      filter,
      {
        conversationId: conversationKey,
        senderId: senderId,
        receiverId: receiverId,
        content,
        type: type || 'text',
        fileUrl,
        fileMime,
        clientId,
        deliveredAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (!message) {
      return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
    }

    // Update conversation lastActivityAt and lastMessage
    await Conversation.findByIdAndUpdate(conversationKey, {
      lastActivityAt: new Date(),
      lastMessage: {
        content: message.content,
        type: message.type,
        createdAt: message.createdAt,
        senderId: message.senderId,
      },
      updatedAt: new Date(),
    });

    const payload = serializeMessage(message, clientId);

    // Publish to Ably channel
    try {
      if (process.env.ABLY_API_KEY) {
        const ably = new Ably.Rest(process.env.ABLY_API_KEY);
        const channel = ably.channels.get(`conversation:${conversationId}`);
        await channel.publish('new:message', payload);
        await channel.publish('message:sent', payload);
      }
    } catch (ablyError) {
      console.error('Ably publish error:', ablyError);
      // Continue even if Ably fails - message is persisted
    }

    // Emit socket event if server is running (for backward compatibility)
    if ((global as any).io) {
      (global as any).io.to(conversationId).emit('new:message', payload);
    }

    return NextResponse.json(payload);
  } catch (error: any) {
    console.error('Message send error:', error);
    return apiError(error);
  }
}
