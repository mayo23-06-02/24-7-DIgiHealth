import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Conversation } from "@/lib/models/Conversation";
import { Call } from "@/lib/models/Call";
import Consultation from "@/lib/models/Consultation";
import { apiLogger } from "@/lib/apiLogger";
import { getLiveKitRoomService } from "@/lib/livekit";

export async function POST(req: Request) {
  const scope = "api/chat/call/end";
  try {
    await connectToDatabase();
    const { callId } = await req.json();
    apiLogger.info(scope, "request", { callId });

    const call = await Call.findById(callId);
    if (!call) {
      apiLogger.warn(scope, "call_not_found", { callId });
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }
    if (call.status === "ended") {
      apiLogger.info(scope, "already_ended", { callId });
      return NextResponse.json({ success: true, message: "Already ended" });
    }

    const endedAt = new Date();
    const durationSeconds = Math.floor(
      (endedAt.getTime() - call.startedAt.getTime()) / 1000,
    );

    call.endedAt = endedAt;
    call.durationSeconds = durationSeconds;
    call.status = "ended";
    await call.save();
    apiLogger.info(scope, "call_ended", {
      callId,
      durationSeconds,
    });

    const conversation = await Conversation.findById(call.conversationId);
    if (conversation) {
      const minutesToAdd = Math.ceil(durationSeconds / 60);
      conversation.minutesUsed += minutesToAdd;
      await conversation.save();
      apiLogger.info(scope, "conversation_minutes_updated", {
        callId,
        conversationId: conversation._id.toString(),
        minutesAdded: minutesToAdd,
      });
    }

    if (call.consultationId) {
      await Consultation.findByIdAndUpdate(call.consultationId, {
        $inc: { callMinutesUsed: Math.ceil(durationSeconds / 60) },
      });
      apiLogger.info(scope, "consultation_minutes_updated", {
        callId,
        consultationId: call.consultationId.toString(),
      });
    }

    if (call.livekitRoomName) {
      try {
        await getLiveKitRoomService().deleteRoom(call.livekitRoomName);
        apiLogger.info(scope, "room_deleted", {
          callId,
          roomName: call.livekitRoomName,
        });
      } catch (error) {
        apiLogger.warn(scope, "room_delete_failed", {
          callId,
          roomName: call.livekitRoomName,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to end call";
    apiLogger.error(scope, "failed", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
