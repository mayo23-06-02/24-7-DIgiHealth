import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Conversation } from "@/lib/models/Conversation";
import { Call } from "@/lib/models/Call";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { apiLogger } from "@/lib/apiLogger";
import {
  createLiveKitParticipantToken,
  ensureLiveKitRoom,
  getLiveKitServerUrl,
  getLiveKitRoomService,
} from "@/lib/livekit";

function buildRoomName(conversationId: string, consultationId?: string) {
  return consultationId
    ? `consultation-${consultationId}`
    : `conversation-${conversationId}`;
}

function hasUsableLiveKitState(call: {
  livekitRoomName?: string;
  livekitRoomUrl?: string;
}) {
  return Boolean(call.livekitRoomName && call.livekitRoomUrl);
}

async function retireBrokenActiveCall(
  scope: string,
  call: {
    _id: { toString(): string };
    livekitRoomName?: string;
    save: () => Promise<unknown>;
    status: string;
    endedAt?: Date;
    durationSeconds: number;
  },
) {
  apiLogger.warn(scope, "retiring_broken_active_call", {
    callId: call._id.toString(),
    roomName: call.livekitRoomName,
  });

  if (call.livekitRoomName) {
    try {
      await getLiveKitRoomService().deleteRoom(call.livekitRoomName);
      apiLogger.info(scope, "broken_call_room_deleted", {
        callId: call._id.toString(),
        roomName: call.livekitRoomName,
      });
    } catch (error) {
      apiLogger.warn(scope, "broken_call_room_delete_failed", {
        callId: call._id.toString(),
        roomName: call.livekitRoomName,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  call.status = "ended";
  call.endedAt = new Date();
  call.durationSeconds = 0;
  await call.save();
}

export async function POST(req: Request) {
  const scope = "api/chat/call/start";
  try {
    const currentUser = await getRequestUser();
    if (!currentUser) {
      apiLogger.warn(scope, "unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { consultationId, conversationId, type } = await req.json();
    apiLogger.info(scope, "request", {
      consultationId,
      conversationId,
      type,
      userId: currentUser.userId,
    });

    let conversation = null;
    if (consultationId) {
      conversation = await Conversation.findOne({ consultationId });
    } else if (conversationId) {
      conversation = await Conversation.findById(conversationId);
    }

    if (!conversation) {
      apiLogger.warn(scope, "conversation_not_found", {
        consultationId,
        conversationId,
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
        conversationId: conversation._id.toString(),
        userId: currentUser.userId,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (
      conversation.minutesUsed >=
      conversation.minutesAllocated + conversation.minutesApproved
    ) {
      apiLogger.warn(scope, "minutes_exhausted", {
        conversationId: conversation._id.toString(),
        minutesUsed: conversation.minutesUsed,
        minutesAllocated: conversation.minutesAllocated,
        minutesApproved: conversation.minutesApproved,
      });
      return NextResponse.json({ error: "No minutes left" }, { status: 400 });
    }

    let call = await Call.findOne({
      $or: [{ consultationId }, { conversationId: conversation._id }],
      status: "active",
    }).sort({ startedAt: -1 });

    if (call && !hasUsableLiveKitState(call)) {
      await retireBrokenActiveCall(scope, call);
      call = null;
    }

    if (!call) {
      const livekitRoomName = buildRoomName(
        conversation._id.toString(),
        consultationId,
      );

      await ensureLiveKitRoom(livekitRoomName);
      apiLogger.info(scope, "room_ready", {
        roomName: livekitRoomName,
      });

      call = await Call.create({
        consultationId: consultationId || undefined,
        conversationId: conversation._id,
        initiatedBy: currentUser.userId,
        type,
        status: "active",
        livekitRoomName,
        livekitRoomUrl: getLiveKitServerUrl(),
      });
      apiLogger.info(scope, "call_created", {
        callId: call._id.toString(),
        conversationId: conversation._id.toString(),
        initiatedBy: currentUser.userId,
      });
    }

    if (!hasUsableLiveKitState(call)) {
      apiLogger.error(scope, "call_missing_livekit_state", {
        callId: call._id.toString(),
        roomName: call.livekitRoomName,
        roomUrl: call.livekitRoomUrl,
      });
      return NextResponse.json(
        { error: "Call could not be initialized fully" },
        { status: 500 },
      );
    }

    const identity = `${currentUser.role}:${currentUser.userId}`;
    const displayName =
      [currentUser.firstName, currentUser.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || currentUser.role;

    const token = await createLiveKitParticipantToken({
      identity,
      name: displayName,
      roomName: call.livekitRoomName!,
      metadata: {
        userId: currentUser.userId,
        role: currentUser.role,
        callId: call._id.toString(),
        conversationId: conversation._id.toString(),
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
      error instanceof Error ? error.message : "Failed to start call";
    apiLogger.error(scope, "failed", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
