import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Call } from "@/lib/models/Call";
import { Conversation } from "@/lib/models/Conversation";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { apiLogger } from "@/lib/apiLogger";
import { createLiveKitParticipantToken } from "@/lib/livekit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ callId: string }> },
) {
  const scope = "api/chat/call/join";
  try {
    const currentUser = await getRequestUser();
    if (!currentUser) {
      apiLogger.warn(scope, "unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { callId } = await params;
    apiLogger.info(scope, "request", { callId, userId: currentUser.userId });
    const call = await Call.findById(callId);

    if (!call || call.status !== "active" || !call.livekitRoomName) {
      apiLogger.warn(scope, "active_call_not_found", { callId });
      return NextResponse.json(
        { error: "Active call not found" },
        { status: 404 },
      );
    }

    const conversation = await Conversation.findById(call.conversationId);
    if (!conversation) {
      apiLogger.warn(scope, "conversation_not_found", {
        callId,
        conversationId: call.conversationId.toString(),
      });
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const isParticipant =
      conversation.patientId?.toString() === currentUser.userId ||
      conversation.practitionerId?.toString() === currentUser.userId;

    if (!isParticipant) {
      apiLogger.warn(scope, "forbidden", {
        callId,
        userId: currentUser.userId,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const identity = `${currentUser.role}:${currentUser.userId}`;
    const displayName = [currentUser.firstName, currentUser.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || currentUser.role;

    const token = await createLiveKitParticipantToken({
      identity,
      name: displayName,
      roomName: call.livekitRoomName,
      metadata: {
        userId: currentUser.userId,
        role: currentUser.role,
        callId: call._id.toString(),
        conversationId: call.conversationId.toString(),
      },
      canPublish: true,
    });

    apiLogger.info(scope, "token_issued", {
      callId: call._id.toString(),
      roomName: call.livekitRoomName,
      userId: currentUser.userId,
    });

    return NextResponse.json({
      roomUrl: call.livekitRoomUrl,
      roomName: call.livekitRoomName,
      token,
      callId: call._id,
      type: call.type,
      initiatedBy: call.initiatedBy,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to join call";
    apiLogger.error(scope, "failed", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
