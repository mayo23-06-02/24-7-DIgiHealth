import type { Types } from "mongoose";
import { Call } from "@/lib/models/Call";
import { apiLogger } from "@/lib/apiLogger";
import { ensureLiveKitRoom, getLiveKitServerUrl } from "@/lib/livekit";

/**
 * Room naming.
 *
 * A scheduled consultation gets a room derived from the consultation, not from
 * the conversation. Two appointments between the same two people are then two
 * distinct rooms with independent lifetimes — which is what makes it safe to
 * tear one down without touching the other. Ad-hoc calls, which have no
 * consultation, still key off the conversation.
 */
export function buildRoomName(
  conversationId: string,
  consultationId?: string | null,
) {
  return consultationId
    ? `consultation-${consultationId}`
    : `conversation-${conversationId}`;
}

export function hasUsableLiveKitState(call: {
  livekitRoomName?: string;
  livekitRoomUrl?: string;
}) {
  return Boolean(call.livekitRoomName && call.livekitRoomUrl);
}

/** The hydrated document type, taken from the model so it tracks the schema. */
type CallDoc = NonNullable<Awaited<ReturnType<typeof Call.findOne>>>;

/**
 * A row that says "active" but carries no room to join is unjoinable — retire
 * it so a fresh one can be created.
 *
 * Deliberately does NOT delete the LiveKit room. Room names are derived, so the
 * name on a broken row may well be the room a healthy call is using right now;
 * deleting it would disconnect people who have nothing to do with this row.
 * Rooms are reaped by LiveKit's own `emptyTimeout` once nobody is in them.
 */
async function retireBrokenActiveCall(scope: string, call: CallDoc) {
  apiLogger.warn(scope, "retiring_broken_active_call", {
    callId: call._id.toString(),
    roomName: call.livekitRoomName,
  });

  call.status = "ended";
  call.endedAt = new Date();
  call.durationSeconds = 0;
  await call.save();
}

export interface EnsureActiveCallResult {
  call: CallDoc;
  /** True only for the request that actually inserted the row. */
  created: boolean;
}

/**
 * Get-or-create the one live call for a conversation/consultation.
 *
 * Concurrency-safe by construction: the unique partial indexes on Call mean a
 * simultaneous second insert fails with E11000 rather than succeeding, and the
 * loser simply re-reads the winner's row. Both callers end up with the same
 * call, the same room, and exactly one of them holding `created: true` — which
 * is what decides whether anyone gets rung.
 */
export async function ensureActiveCall({
  scope,
  conversationId,
  consultationId,
  initiatedBy,
  type,
}: {
  scope: string;
  conversationId: Types.ObjectId | string;
  consultationId?: string | null;
  initiatedBy: string;
  type: "video" | "voice";
}): Promise<EnsureActiveCallResult> {
  const convIdStr = String(conversationId);
  const lookup = consultationId
    ? { consultationId, status: "active" as const }
    : { conversationId, status: "active" as const };

  let call = await Call.findOne(lookup).sort({ startedAt: -1 });

  if (call && !hasUsableLiveKitState(call)) {
    await retireBrokenActiveCall(scope, call);
    call = null;
  }

  if (call) return { call, created: false };

  const livekitRoomName = buildRoomName(convIdStr, consultationId);
  await ensureLiveKitRoom(livekitRoomName);
  apiLogger.info(scope, "room_ready", { roomName: livekitRoomName });

  try {
    const fresh = await Call.create({
      consultationId: consultationId || undefined,
      conversationId,
      initiatedBy,
      type,
      status: "active",
      livekitRoomName,
      livekitRoomUrl: getLiveKitServerUrl(),
    });
    apiLogger.info(scope, "call_created", {
      callId: fresh._id.toString(),
      conversationId: convIdStr,
      consultationId: consultationId || null,
      initiatedBy,
    });
    return { call: fresh, created: true };
  } catch (error: unknown) {
    const isDuplicate =
      typeof error === "object" &&
      error !== null &&
      (error as { code?: number }).code === 11000;
    if (!isDuplicate) throw error;

    // Lost the race — the other party created the call microseconds earlier.
    // That is the expected outcome when two appointment countdowns fire
    // together, not an error: re-read and join what they made.
    const existing = await Call.findOne(lookup).sort({ startedAt: -1 });
    if (!existing) {
      throw new Error("Active call vanished immediately after a duplicate-key conflict");
    }
    apiLogger.info(scope, "joined_concurrently_created_call", {
      callId: existing._id.toString(),
      conversationId: convIdStr,
      consultationId: consultationId || null,
    });
    return { call: existing, created: false };
  }
}
