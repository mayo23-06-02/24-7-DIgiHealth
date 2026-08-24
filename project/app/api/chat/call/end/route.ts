import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Call } from "@/lib/models/Call";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { apiLogger } from "@/lib/apiLogger";
import { listLiveKitParticipants } from "@/lib/livekit";
import { finalizeCall } from "@/lib/consultations/finalizeSession";

/**
 * One participant is leaving.
 *
 * The old behaviour was to end the call and delete the room the moment anybody
 * hung up, which is why one person leaving dropped everyone. Leaving is now
 * just leaving: the session is only closed out once the room is actually empty.
 * That is what makes a mid-call reconnect possible — the other party's dropped
 * connection no longer takes the consultation down with it.
 */
export async function POST(req: Request) {
  const scope = "api/chat/call/end";
  try {
    const currentUser = await getRequestUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { callId } = await req.json();
    apiLogger.info(scope, "request", { callId, userId: currentUser.userId });

    const call = await Call.findById(callId);
    if (!call) {
      apiLogger.warn(scope, "call_not_found", { callId });
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }
    if (call.status !== "active") {
      apiLogger.info(scope, "already_inactive", { callId, status: call.status });
      return NextResponse.json({ success: true, message: `Already ${call.status}` });
    }

    /*
     * Is anyone left?
     *
     * The caller disconnects only after this request resolves, so they are
     * still listed — discount their own identity. A null answer means LiveKit
     * didn't respond, and an unknown room is not an empty one: err towards
     * leaving the session open, since a wrongly-closed consultation is worse
     * than one that lingers until its window expires.
     */
    const myIdentity = `${currentUser.role}:${currentUser.userId}`;
    const identities = call.livekitRoomName
      ? await listLiveKitParticipants(call.livekitRoomName)
      : [];
    const othersRemain =
      identities === null
        ? true
        : identities.some((id) => id !== myIdentity);

    if (othersRemain) {
      apiLogger.info(scope, "participant_left_session_continues", {
        callId,
        userId: currentUser.userId,
      });
      return NextResponse.json({ success: true, left: true, ended: false });
    }

    const { finalized, durationSeconds } = await finalizeCall(scope, call, "hangup");
    return NextResponse.json({ success: true, ended: finalized, durationSeconds });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to end call";
    apiLogger.error(scope, "failed", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
