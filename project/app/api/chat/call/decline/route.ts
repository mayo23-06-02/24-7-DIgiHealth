import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Conversation } from "@/lib/models/Conversation";
import { Call } from "@/lib/models/Call";
import { Message } from "@/lib/models/Message";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { apiLogger } from "@/lib/apiLogger";

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

        await Message.create({
            conversationId: conversation._id,
            senderId: user.userId,
            receiverId: receiverId,
            type: "call_log",
            content: `${call.type === 'video' ? 'Video' : 'Voice'} call was declined`,
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to decline call" }, { status: 500 });
  }
}
