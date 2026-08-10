import { Consultation } from "@/lib/models/Consultation";
import { Message } from "@/lib/models/Message";
import User from "@/lib/models/User";
import { sendEmail, isPostmarkConfigured } from "@/lib/email/postmark";
import { appointmentReminderEmailHtml } from "@/lib/email/templates/appointmentReminder";
import { newMessageReminderEmailHtml } from "@/lib/email/templates/newMessageReminder";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

const APPOINTMENT_REMINDER_WINDOW_MS = 10 * 60 * 1000; // 10 minutes before start
const MESSAGE_REMINDER_DELAY_MS = 5 * 60 * 60 * 1000; // 5 hours unread

/** Avoid scanning on every single request */
let lastAppointmentCheckAt = 0;
let lastMessageCheckAt = 0;
const CHECK_COOLDOWN_MS = 60_000;

/**
 * Emails both parties once, ~10 minutes before a confirmed consultation
 * starts. Safe to call frequently — throttled + idempotent via
 * `reminderEmailSentAt`, so a booking is never emailed twice.
 */
export async function sendDueAppointmentReminders(options?: {
  limit?: number;
  force?: boolean;
}): Promise<{ sent: number }> {
  const nowMs = Date.now();
  if (!options?.force && nowMs - lastAppointmentCheckAt < CHECK_COOLDOWN_MS) {
    return { sent: 0 };
  }
  lastAppointmentCheckAt = nowMs;

  if (!isPostmarkConfigured()) return { sent: 0 };

  const now = new Date(nowMs);
  const windowEnd = new Date(nowMs + APPOINTMENT_REMINDER_WINDOW_MS);
  const limit = options?.limit ?? 100;

  try {
    const due = await Consultation.find({
      status: "scheduled",
      scheduledStartTime: { $gte: now, $lte: windowEnd },
      reminderEmailSentAt: { $exists: false },
    })
      .populate("patientId", "firstName lastName email")
      .populate("practitionerId", "firstName lastName email")
      .limit(limit)
      .lean();

    if (!due.length) return { sent: 0 };

    const ids = due.map((c: any) => c._id);
    // Mark sent up front so a slow/failed send can't cause a duplicate on the next poll.
    await Consultation.updateMany(
      { _id: { $in: ids } },
      { $set: { reminderEmailSentAt: now } },
    );

    let sent = 0;
    await Promise.allSettled(
      due.map(async (c: any) => {
        const patient = c.patientId;
        const practitioner = c.practitionerId;
        if (!patient?.email || !practitioner?.email) return;

        const start = new Date(c.scheduledStartTime);
        const patientEmail = sendEmail({
          to: patient.email,
          subject: "Your consultation starts in 10 minutes",
          html: appointmentReminderEmailHtml({
            recipientName: patient.firstName,
            otherPartyName: `Dr. ${practitioner.firstName} ${practitioner.lastName}`,
            scheduledStartTime: start,
            consultationType: c.type,
            joinUrl: `${APP_URL}/patient/lobby/${c._id}`,
          }),
        });
        const practitionerEmail = sendEmail({
          to: practitioner.email,
          subject: "Your consultation starts in 10 minutes",
          html: appointmentReminderEmailHtml({
            recipientName: practitioner.firstName,
            otherPartyName: `${patient.firstName} ${patient.lastName}`,
            scheduledStartTime: start,
            consultationType: c.type,
            joinUrl: `${APP_URL}/practitioner/lobby/${c._id}`,
          }),
        });
        await Promise.all([patientEmail, practitionerEmail]);
        sent += 1;
      }),
    );

    return { sent };
  } catch (err) {
    console.error("[email/reminders] sendDueAppointmentReminders error:", err);
    return { sent: 0 };
  }
}

/**
 * Nudges a user by email when a message has sat unread for 5+ hours.
 * Batches all of a recipient's overdue-unread messages into a single email
 * (not one per message), and only ever emails about a given message once.
 */
export async function sendDueMessageReminders(options?: {
  limit?: number;
  force?: boolean;
}): Promise<{ sent: number }> {
  const nowMs = Date.now();
  if (!options?.force && nowMs - lastMessageCheckAt < CHECK_COOLDOWN_MS) {
    return { sent: 0 };
  }
  lastMessageCheckAt = nowMs;

  if (!isPostmarkConfigured()) return { sent: 0 };

  const cutoff = new Date(nowMs - MESSAGE_REMINDER_DELAY_MS);
  const limit = options?.limit ?? 200;

  try {
    const overdue = await Message.find({
      isRead: false,
      createdAt: { $lte: cutoff },
      reminderEmailSentAt: { $exists: false },
    })
      .select("_id receiverId createdAt")
      .limit(limit)
      .lean();

    if (!overdue.length) return { sent: 0 };

    const byRecipient = new Map<string, any[]>();
    for (const m of overdue) {
      const key = String(m.receiverId);
      if (!byRecipient.has(key)) byRecipient.set(key, []);
      byRecipient.get(key)!.push(m);
    }

    let sent = 0;
    await Promise.allSettled(
      [...byRecipient.entries()].map(async ([recipientId, messages]) => {
        const user = await User.findById(recipientId).select("firstName email").lean();
        if (!user || !(user as any).email) return;

        const ids = messages.map((m) => m._id);
        const now = new Date();
        // Mark sent up front so a slow/failed send can't cause a duplicate.
        await Message.updateMany(
          { _id: { $in: ids } },
          { $set: { reminderEmailSentAt: now } },
        );

        const { error } = await sendEmail({
          to: (user as any).email,
          subject:
            messages.length === 1
              ? "You have a new message"
              : `You have ${messages.length} new messages`,
          html: newMessageReminderEmailHtml({
            recipientName: (user as any).firstName,
            unreadCount: messages.length,
            appUrl: APP_URL,
          }),
        });
        if (!error) sent += 1;
      }),
    );

    return { sent };
  } catch (err) {
    console.error("[email/reminders] sendDueMessageReminders error:", err);
    return { sent: 0 };
  }
}
