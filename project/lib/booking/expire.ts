import { Consultation } from "@/lib/models/Consultation";
import { notifyBookingEvent } from "./notifications";

/** Avoid running a full expire scan on every single API request */
let lastExpireAt = 0;
const EXPIRE_COOLDOWN_MS = 60_000;

/**
 * Auto-cancel booking requests that were never accepted and whose start time
 * has already passed (status requested | pending).
 *
 * Safe to call frequently — throttled + idempotent.
 */
export async function expireStaleBookingRequests(options?: {
  limit?: number;
  notify?: boolean;
  /** Bypass throttle (cron / manual) */
  force?: boolean;
}): Promise<{ cancelled: number; ids: string[] }> {
  const nowMs = Date.now();
  if (!options?.force && nowMs - lastExpireAt < EXPIRE_COOLDOWN_MS) {
    return { cancelled: 0, ids: [] };
  }
  lastExpireAt = nowMs;

  const limit = options?.limit ?? 100;
  const notify = options?.notify !== false;
  const now = new Date(nowMs);

  try {
    const stale = await Consultation.find({
      status: { $in: ["requested", "pending"] },
      scheduledStartTime: { $lt: now },
    })
      .select("_id patientId practitionerId scheduledStartTime chiefComplaint type")
      .limit(limit)
      .lean();

    if (!stale.length) {
      return { cancelled: 0, ids: [] };
    }

    const ids = stale.map((c: any) => c._id);

    await Consultation.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          status: "cancelled",
          cancelReason: "expired_unaccepted",
          cancelledAt: now,
        },
      },
    );

    if (notify) {
      // Fire-and-forget notifications so list endpoints aren't blocked
      void Promise.all(
        stale.map((c: any) =>
          notifyBookingEvent("expired", {
            consultationId: c._id,
            patientId: c.patientId,
            practitionerId: c.practitionerId,
            scheduledStart: c.scheduledStartTime,
            reason: c.chiefComplaint,
            type: c.type,
          }),
        ),
      );
    }

    return {
      cancelled: ids.length,
      ids: ids.map((id: any) => id.toString()),
    };
  } catch (err) {
    console.error("[booking/expire] expireStaleBookingRequests error:", err);
    return { cancelled: 0, ids: [] };
  }
}
