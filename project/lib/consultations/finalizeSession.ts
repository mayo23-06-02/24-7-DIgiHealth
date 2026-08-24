import { Call } from "@/lib/models/Call";
import { Conversation } from "@/lib/models/Conversation";
import { Message } from "@/lib/models/Message";
import Consultation from "@/lib/models/Consultation";
import { apiLogger } from "@/lib/apiLogger";
import { publishCallSignalTo } from "@/lib/realtime/callSignals";

type CallDoc = NonNullable<Awaited<ReturnType<typeof Call.findOne>>>;

/**
 * Close out a call and bill it — exactly once, no matter how many times this is
 * called or from where.
 *
 * Both participants hanging up, the window expiring, and a later page load all
 * race to be the one that finalises a session. Rather than trying to make one
 * of them authoritative, the write itself is made conditional: the status
 * transition out of "active" is what claims the right to bill, and whoever
 * loses that transition returns without touching the ledger. Double-billing a
 * consultation is a much worse outcome than not being sure who closed it.
 */
export async function finalizeCall(
  scope: string,
  call: CallDoc,
  reason: "hangup" | "window_closed" | "declined",
): Promise<{ finalized: boolean; durationSeconds: number }> {
  const endedAt = new Date();
  const durationSeconds = Math.max(
    0,
    Math.floor((endedAt.getTime() - call.startedAt.getTime()) / 1000),
  );

  // Claim the finalisation atomically. Only the request that actually flips the
  // row out of "active" goes on to bill.
  const claimed = await Call.findOneAndUpdate(
    { _id: call._id, status: "active" },
    {
      $set: {
        status: reason === "declined" ? "declined" : "ended",
        endedAt,
        durationSeconds,
      },
    },
    { new: true },
  );

  if (!claimed) {
    apiLogger.info(scope, "finalize_already_claimed", {
      callId: String(call._id),
    });
    return { finalized: false, durationSeconds: 0 };
  }

  const minutes = Math.ceil(durationSeconds / 60);
  const conversation = await Conversation.findById(call.conversationId);

  if (conversation && minutes > 0) {
    conversation.minutesUsed += minutes;
    await conversation.save();
  }

  if (call.consultationId) {
    await Consultation.findByIdAndUpdate(call.consultationId, {
      $inc: { callMinutesUsed: minutes },
      // A consultation whose session is over is completed. Driven by the
      // session's own lifecycle rather than by a button someone has to
      // remember to press — which is why appointments used to sit at
      // "scheduled" forever.
      ...(reason === "window_closed" || reason === "hangup"
        ? { $set: { status: "completed" } }
        : {}),
    });
  }

  if (conversation) {
    const receiverId =
      String(conversation.patientId) === String(call.initiatedBy)
        ? conversation.practitionerId
        : conversation.patientId;

    const label = call.type === "video" ? "Video" : "Voice";
    const m = Math.floor(durationSeconds / 60);
    const s = durationSeconds % 60;
    const content =
      durationSeconds < 2
        ? "Call missed"
        : `${label} call ended • ${m > 0 ? `${m}m ${s}s` : `${s}s`}`;

    await Message.create({
      conversationId: conversation._id,
      senderId: call.initiatedBy,
      receiverId,
      type: "call_log",
      content,
    });
  }

  await publishCallSignalTo(
    [
      conversation ? String(conversation.patientId) : null,
      conversation ? String(conversation.practitionerId) : null,
    ],
    { kind: "ended", callId: String(call._id) },
  );

  apiLogger.info(scope, "finalized", {
    callId: String(call._id),
    consultationId: call.consultationId ? String(call.consultationId) : null,
    durationSeconds,
    minutes,
    reason,
  });

  return { finalized: true, durationSeconds };
}
