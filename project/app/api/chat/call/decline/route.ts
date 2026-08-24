import { NextResponse } from "next/server";
import Ably from "ably";
import { connectToDatabase } from "@/lib/mongodb";
import { Conversation } from "@/lib/models/Conversation";
import { Call } from "@/lib/models/Call";
import { Message } from "@/lib/models/Message";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { apiLogger } from "@/lib/apiLogger";

import { publishCallSignalTo } from "@/lib/realtime/callSignals";
function serializeMessage(message: any) {
  const obj = typeof message.toObject === "function" ? message.toObject() : { ...message };
  return {
    ...obj,
    _id: obj._id?.toString?.() ?? obj._id,
    conversationId: obj.conversationId?.toString?.() ?? obj.conversationId,
    senderId: obj.senderId?.toString?.() ?? obj.senderId,
    receiverId: obj.receiverId?.toString?.() ?? obj.receiverId,
  };
}

export async function POST(req: Request) {
  const scope = "api/chat/call/decline";
  try {
    const user = await getRequestUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const { callId } = await req.json();

    const call = await Call.findById(callId);
    if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });

    if (call.status !== "active") {
        return NextResponse.json({ success: true, message: "Call already ended" });
    }

    call.status = "declined";
    call.endedAt = new Date();
    await call.save();

    const conversation = await Conversation.findById(call.conversationId);
    if (conversation) {
        // The receiver should be the person who initiated the call
        const receiverId = call.initiatedBy;

        const message = await Message.create({
            conversationId: conversation._id,
            senderId: user.userId,
            receiverId: receiverId,
            type: "call_log",
            content: `${call.type === 'video' ? 'Video' : 'Voice'} call was declined`,
        });

        await Conversation.findByIdAndUpdate(conversation._id, {
            lastActivityAt: new Date(),
            lastMessage: {
                content: message.content,
                type: message.type,
                createdAt: message.createdAt,
                senderId: message.senderId,
            },
            updatedAt: new Date(),
        });

        // Alert the other participant live, in their chat room, before tearing the call down.
        const payload = serializeMessage(message);
        try {
            if (process.env.ABLY_API_KEY) {
                const ably = new Ably.Rest(process.env.ABLY_API_KEY);
                const channel = ably.channels.get(`conversation:${conversation._id}`);
                await channel.publish("new:message", payload);
                await channel.publish("message:sent", payload);
            }
        } catch (ablyError) {
            apiLogger.warn(scope, "ably_publish_failed", {
                callId,
                error: ablyError instanceof Error ? ablyError.message : "Unknown error",
            });
        }
        if ((global as any).io) {
            (global as any).io.to(conversation._id.toString()).emit("new:message", payload);
        }
    }

    /*
     * The room is deliberately left alone.
     *
     * Deleting it here used to disconnect whoever was inside — and because room
     * names are derived rather than unique per call, "inside" could mean a
     * different, perfectly healthy call between the same two people. The
     * `declined` signal below is what closes the caller's panel; LiveKit reaps
     * the room itself via the `emptyTimeout` set in ensureLiveKitRoom once
     * nobody is left in it.
     */

    // Clear the ring on both sides immediately. Without this the callee's
    // device keeps ringing until its next poll for a call that is already over.
    await publishCallSignalTo(
      [
        conversation ? String(conversation.patientId) : null,
        conversation ? String(conversation.practitionerId) : null,
      ],
      { kind: "declined", callId: String(callId) },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to decline call" }, { status: 500 });
  }
}
