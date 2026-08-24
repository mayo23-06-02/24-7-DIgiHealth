import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Conversation } from "@/lib/models/Conversation";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { apiLogger } from "@/lib/apiLogger";
import { createLiveKitParticipantToken } from "@/lib/livekit";
import { ensureActiveCall, hasUsableLiveKitState } from "@/lib/calls/activeCall";
import { publishCallSignalTo } from "@/lib/realtime/callSignals";
import { apiError } from "@/lib/api/errors";

function displayNameOf(u: {
  firstName?: string | null;
  lastName?: string | null;
  role: string;
}) {
  return (
    [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.role
  );
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
      currentUser.role !== "practitioner" &&
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

    const { call, created } = await ensureActiveCall({
      scope,
      conversationId: conversation._id,
      consultationId,
      initiatedBy: currentUser.userId,
      type,
    });

    // Ring the other party only when this request is the one that actually
    // created the call. A second caller joining an existing call must never
    // ring anyone — least of all the person already sitting in the room.
    if (created) {
      const calleeId = [
        String(conversation.patientId),
        String(conversation.practitionerId),
      ].find((id) => id !== String(currentUser.userId));

      // Awaited so the publish isn't cut short when the serverless invocation
      // ends, but it never throws — see publishCallSignal.
      await publishCallSignalTo([calleeId], {
        kind: "incoming",
        callId: call._id.toString(),
        conversationId: conversation._id.toString(),
        consultationId: consultationId || null,
        type,
        initiatedBy: currentUser.userId,
        roomName: call.livekitRoomName,
        roomUrl: call.livekitRoomUrl,
        participantName: displayNameOf(currentUser),
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
    const displayName = displayNameOf(currentUser);

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
    return apiError(error, "The call could not be started. Please try again.");
  }
}
