import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Consultation from "@/lib/models/Consultation";
import { Conversation } from "@/lib/models/Conversation";
import User from "@/lib/models/User";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { apiLogger } from "@/lib/apiLogger";
import { isMongoObjectId } from "@/lib/utils/mongoId";
import { createLiveKitParticipantToken } from "@/lib/livekit";
import { Call } from "@/lib/models/Call";
import { ensureActiveCall, hasUsableLiveKitState } from "@/lib/calls/activeCall";
import { finalizeCall } from "@/lib/consultations/finalizeSession";
import { isJoinable, sessionStateAt, sessionWindow } from "@/lib/consultations/window";

/**
 * The one authority on a scheduled consultation's live session.
 *
 * Deliberately idempotent: call it as many times as you like, from either
 * party, in any order, and you get the same room back with a token minted for
 * whoever asked. There is no caller and no callee, so nothing rings, nothing is
 * accepted and nothing is declined — the two failure modes that broke the old
 * flow (a simultaneous double-dial, and one party's hang-up evicting the other)
 * have no equivalent here because the room's identity and lifetime come from
 * the appointment, not from a call attempt.
 *
 * Reconnecting after a refresh or a dropped network is therefore free: it is
 * the same request as joining in the first place.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const scope = "api/consultations/session";
  try {
    const currentUser = await getRequestUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!isMongoObjectId(id)) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
    }

    await connectToDatabase();
    const consultation = await Consultation.findById(id);
    if (!consultation) {
      apiLogger.warn(scope, "consultation_not_found", { consultationId: id });
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
    }

    const patientId = String(consultation.patientId);
    const practitionerId = String(consultation.practitionerId);
    const isParticipant =
      patientId === currentUser.userId || practitionerId === currentUser.userId;

    if (!isParticipant) {
      apiLogger.warn(scope, "forbidden", {
        consultationId: id,
        userId: currentUser.userId,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const win = sessionWindow(
      new Date(consultation.scheduledStartTime),
      new Date(consultation.scheduledEndTime),
    );

    // A cancelled or completed appointment has no live session no matter what
    // the clock says.
    const terminal = ["cancelled", "completed", "missed"].includes(
      consultation.status,
    );
    const state = terminal ? "closed" : sessionStateAt(now, win);

    const contactId =
      patientId === currentUser.userId ? practitionerId : patientId;
    const contact = await User.findById(contactId)
      .select("firstName lastName role")
      .lean<{ firstName?: string; lastName?: string; role?: string } | null>();
    const contactName =
      [contact?.firstName, contact?.lastName].filter(Boolean).join(" ").trim() ||
      (contact?.role === "practitioner" ? "Your practitioner" : "Your patient");

    const base = {
      state,
      serverNow: now.toISOString(),
      opensAt: win.opensAt.toISOString(),
      startsAt: win.startsAt.toISOString(),
      endsAt: win.endsAt.toISOString(),
      closesAt: win.closesAt.toISOString(),
      consultationStatus: consultation.status,
      contact: { id: contactId, name: contactName },
      type: consultation.type === "chat" ? ("voice" as const) : ("video" as const),
    };

    // Outside the window there is nothing to hand out. Returning 200 with the
    // state (rather than an error) is what lets the client render an accurate
    // "opens in 4:12" or "this session has ended" instead of a failure.
    if (!isJoinable(state)) {
      /*
       * Close out a session whose window has passed.
       *
       * Someone who shuts the tab never sends a hang-up, so without this a
       * finished consultation would keep an active call row for ever — unbilled,
       * and still counting as "in progress". Doing it lazily here means the next
       * person to look at the appointment settles it; `finalizeCall` is
       * idempotent, so it does not matter who that is or how often they look.
       */
      if (state === "closed") {
        const lingering = await Call.findOne({ consultationId: id, status: "active" });
        if (lingering) await finalizeCall(scope, lingering, "window_closed");
      }
      apiLogger.info(scope, "not_joinable", { consultationId: id, state });
      return NextResponse.json(base);
    }

    // The 1:1 thread, not a consultation-scoped one: chat history for these two
    // people belongs in a single conversation regardless of how many
    // appointments they have had, and that is the thread the messages list shows.
    let conversation = await Conversation.findOne({
      patientId,
      practitionerId,
      $or: [{ consultationId: { $exists: false } }, { consultationId: null }],
    });
    if (!conversation) {
      conversation = await Conversation.create({
        patientId,
        practitionerId,
        status: "active",
        minutesAllocated: 600,
      });
    }

    const { call } = await ensureActiveCall({
      scope,
      conversationId: conversation._id,
      consultationId: id,
      initiatedBy: currentUser.userId,
      type: base.type,
    });

    if (!hasUsableLiveKitState(call)) {
      apiLogger.error(scope, "call_missing_livekit_state", {
        callId: call._id.toString(),
        consultationId: id,
      });
      return NextResponse.json(
        { error: "Session could not be initialized" },
        { status: 500 },
      );
    }

    // Mark the appointment as under way the first time someone joins at or
    // after the start. Driven by the session lifecycle rather than by a button
    // someone has to remember to press.
    if (state === "live" && consultation.status === "scheduled") {
      consultation.status = "in_progress";
      await consultation.save();
      apiLogger.info(scope, "consultation_in_progress", { consultationId: id });
    }

    // Record attendance. A token issued while the session is live is someone
    // walking into the room, and it is the only evidence we keep of who
    // actually turned up — which is what decides, later, whether this was a
    // consultation that happened or one that was missed.
    if (state === "live") {
      await Call.updateOne(
        { _id: call._id },
        { $addToSet: { participantUserIds: currentUser.userId } },
      );
    }

    const token = await createLiveKitParticipantToken({
      identity: `${currentUser.role}:${currentUser.userId}`,
      name:
        [currentUser.firstName, currentUser.lastName]
          .filter(Boolean)
          .join(" ")
          .trim() || currentUser.role,
      roomName: call.livekitRoomName!,
      metadata: {
        userId: currentUser.userId,
        role: currentUser.role,
        callId: call._id.toString(),
        conversationId: conversation._id.toString(),
        consultationId: id,
      },
      canPublish: true,
    });

    apiLogger.info(scope, "token_issued", {
      consultationId: id,
      callId: call._id.toString(),
      roomName: call.livekitRoomName,
      userId: currentUser.userId,
      state,
    });

    return NextResponse.json({
      ...base,
      roomUrl: call.livekitRoomUrl,
      roomName: call.livekitRoomName,
      token,
      callId: call._id.toString(),
      conversationId: conversation._id.toString(),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to open session";
    apiLogger.error(scope, "failed", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
