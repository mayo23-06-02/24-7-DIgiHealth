import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { Message } from '@/lib/models/Message';
import { Conversation } from '@/lib/models/Conversation';
import Ably from 'ably';
import { getRequestUser } from '@/lib/auth/getRequestUser';

import { apiError } from "@/lib/api/errors";
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

    await connectToDatabase();
    const body = await req.json();
    const { conversationId, content, type, fileUrl, fileMime, clientId } = body;

    if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }

    const convObjectId = new mongoose.Types.ObjectId(conversationId);

    // Verify the user is a participant in this conversation
    const conversation = await Conversation.findById(convObjectId).lean();
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const userMongoId = new mongoose.Types.ObjectId(user.userId);
    const isParticipant =
      conversation.patientId?.toString() === userMongoId.toString() ||
      conversation.practitionerId?.toString() === userMongoId.toString();

    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use the authenticated user's ID as senderId (not client-supplied)
    const senderObjectId = userMongoId;
    const receiverObjectId =
      conversation.patientId?.toString() === userMongoId.toString()
        ? conversation.practitionerId
        : conversation.patientId;

    // Idempotent message creation using clientId when provided
    const filter = clientId
      ? { clientId, conversationId: convObjectId }
      : { _id: new mongoose.Types.ObjectId() };

    const message = await Message.findOneAndUpdate(
      filter,
      {
        conversationId: convObjectId,
        senderId: senderObjectId,
        receiverId: receiverObjectId,
        content,
        type: type || 'text',
        fileUrl,
        fileMime,
        clientId,
        deliveredAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Update conversation lastActivityAt and lastMessage
    await Conversation.findByIdAndUpdate(convObjectId, {
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
