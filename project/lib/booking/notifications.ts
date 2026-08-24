import mongoose from "mongoose";
import { Notification } from "@/lib/models/Communications";
import User from "@/lib/models/User";
import { PatientProfile } from "@/lib/models/RoleProfiles";
import FamilyLink from "@/lib/models/FamilyLink";
import { sendEmail, isPostmarkConfigured } from "@/lib/email/postmark";
import { resolveRecipientById } from "@/lib/email/recipients";
import { appointmentRequestEmailHtml } from "@/lib/email/templates/appointmentRequest";

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
).replace(/\/$/, "");

/**
 * Email the person a booking is waiting on.
 *
 * An in-app notification only reaches someone who is already in the app, which
 * is precisely the person who did not need telling. A request sits unanswered
 * until the recipient happens to log in — so the one event that requires a
 * human response is also the one that has to leave the platform to find them.
 *
 * Best-effort throughout: a booking must never fail because a mail relay was
 * down, so every failure here is logged and swallowed. The in-app notification
 * has already been written by the time this runs.
 */
async function emailActionRequired(input: {
  recipientUserId: string | mongoose.Types.ObjectId;
  recipientRole: "patient" | "practitioner";
  requesterName: string;
  scheduledStart: Date | string;
  consultationType: string;
  isReschedule?: boolean;
  reason?: string;
}): Promise<void> {
  try {
    if (!isPostmarkConfigured()) return;

    const recipient = await resolveRecipientById(input.recipientUserId);
    if (!recipient?.email) return;

    const start = new Date(input.scheduledStart);
    if (isNaN(start.getTime())) return;

    const html = appointmentRequestEmailHtml({
      recipientName: recipient.recipientName,
      onBehalfOf: recipient.onBehalfOf,
      requesterName: input.requesterName,
      scheduledStartTime: start,
      consultationType: input.consultationType,
      isReschedule: input.isReschedule,
      reason: input.reason,
      reviewUrl: `${APP_URL}/${input.recipientRole}/appointments`,
    });

    const subject = input.isReschedule
      ? `New time proposed by ${input.requesterName}`
      : `${input.requesterName} requested an appointment`;

    const { error } = await sendEmail({ to: recipient.email, subject, html });
    if (error) console.warn("[booking/notifications] email failed:", error);
  } catch (err) {
    console.warn("[booking/notifications] email threw:", err);
  }
}

export type BookingNotificationEvent =
  | "request_created"
  | "scheduled_created"
  | "accepted"
  | "declined"
  | "cancelled"
  | "rescheduled"
  | "reschedule_requested"
  | "reschedule_accepted"
  | "reschedule_declined"
  | "updated"
  | "expired";

export interface BookingNotifyContext {
  consultationId: string | mongoose.Types.ObjectId;
  patientId: string | mongoose.Types.ObjectId;
  practitionerId: string | mongoose.Types.ObjectId;
  scheduledStart: Date | string;
  reason?: string;
  /** Who made the change — the *other* party is notified */
  actorUserId?: string | mongoose.Types.ObjectId;
  type?: string;
  /** Optional extra detail for generic updates */
  changeSummary?: string;
  /** Only set for reschedule_requested — the proposed end time */
  proposedEnd?: Date | string;
}

function formatWhen(date: Date | string): string {
  try {
    return new Date(date).toLocaleString("en-ZA", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(date);
  }
}

function oid(id: string | mongoose.Types.ObjectId) {
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (typeof id === "string" && mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return id;
}

function sameId(
  a?: string | mongoose.Types.ObjectId | null,
  b?: string | mongoose.Types.ObjectId | null,
): boolean {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

async function createNotification(input: {
  userId: string | mongoose.Types.ObjectId;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** If true, will redirect notification to guardian if userId is a child */
  checkForChild?: boolean;
}) {
  try {
    let recipientId = oid(input.userId);

    // If checking for child and this is a patient ID, redirect to guardian if applicable
    if (input.checkForChild) {
      const guardianId = await getGuardianIdForChild(input.userId);
      if (guardianId) {
        recipientId = oid(guardianId);
      }
    }

    await Notification.create({
      userId: recipientId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data || {},
      isRead: false,
      deliveredVia: ["in_app"],
    });
  } catch (err) {
    console.error("[booking/notifications] Failed to create:", err);
  }
}

/**
 * Get the guardian user ID for a child patient.
 * Returns the guardian's user ID if the patient is a child with an active guardian link,
 * otherwise returns null.
 */
async function getGuardianIdForChild(patientId: string | mongoose.Types.ObjectId): Promise<string | null> {
  try {
    const familyLink = await FamilyLink.findOne({
      memberId: oid(patientId),
      status: "active",
      relationship: "child",
    }).lean();
    if (familyLink?.guardianId) {
      return String(familyLink.guardianId);
    }
    return null;
  } catch (err) {
    console.error("[booking/notifications] Failed to fetch guardian:", err);
    return null;
  }
}

/**
 * Resolve the *other* party relative to the actor.
 * Falls back to patient when actor is unknown (safer for practitioner actions).
 */
function otherPartyId(ctx: BookingNotifyContext): string {
  if (ctx.actorUserId && sameId(ctx.actorUserId, ctx.patientId)) {
    return String(ctx.practitionerId);
  }
  if (ctx.actorUserId && sameId(ctx.actorUserId, ctx.practitionerId)) {
    return String(ctx.patientId);
  }
  // Default: notify patient (common when practitioner acts without actor id)
  return String(ctx.patientId);
}

/**
 * Emit in-app notifications for booking lifecycle events.
 * Rule: when one user changes an appointment, the other user is notified.
 * Never throws to callers.
 */
export async function notifyBookingEvent(
  event: BookingNotificationEvent,
  ctx: BookingNotifyContext,
): Promise<void> {
  try {
    const [patient, practitioner, patientProfile] = await Promise.all([
      User.findById(ctx.patientId, "firstName lastName").lean() as Promise<any>,
      User.findById(
        ctx.practitionerId,
        "firstName lastName",
      ).lean() as Promise<any>,
      PatientProfile.findOne({ userId: ctx.patientId }).lean() as Promise<any>,
    ]);

    let patientName = patient
      ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim() ||
        "Patient"
      : "Patient";

    // Add guardian name for child accounts
    if (patientProfile?.ageRange || patientProfile?.dateOfBirth) {
      const dob = patientProfile.dateOfBirth ? new Date(patientProfile.dateOfBirth) : null;
      const age = dob ? new Date().getFullYear() - dob.getFullYear() : null;
      if (patientProfile.ageRange || (age && age < 18)) {
        if (patientProfile.emergencyContact?.name) {
          patientName = `${patientName} (Guardian: ${patientProfile.emergencyContact.name})`;
        }
      }
    }

    const doctorName = practitioner
      ? `Dr. ${practitioner.firstName || ""} ${practitioner.lastName || ""}`.trim()
      : "Your practitioner";

    const actorIsPatient = sameId(ctx.actorUserId, ctx.patientId);
    const actorIsPractitioner = sameId(ctx.actorUserId, ctx.practitionerId);
    const actorLabel = actorIsPatient
      ? patientName
      : actorIsPractitioner
        ? doctorName
        : "Someone";

    const when = formatWhen(ctx.scheduledStart);
    const reasonBit = ctx.reason ? ` Reason: ${ctx.reason}` : "";
    const data = {
      consultationId: String(ctx.consultationId),
      patientId: String(ctx.patientId),
      practitionerId: String(ctx.practitionerId),
      event,
      type: ctx.type || "video",
      ...(ctx.proposedEnd
        ? {
            proposedStart: ctx.scheduledStart,
            proposedEnd: ctx.proposedEnd,
          }
        : {}),
    };

    switch (event) {
      case "request_created": {
        if (actorIsPractitioner) {
          /*
           * A practitioner asking for a consultation is requesting one, not
           * proposing one.
           *
           * "Proposed" belongs to rescheduling, where there is an existing
           * agreed time and someone is putting a different one forward. Using
           * it here told a patient their appointment already existed and was
           * merely being moved — see the reschedule_requested case below, which
           * is the event that word is actually for.
           */
          await createNotification({
            userId: ctx.patientId,
            type: "appointment_request",
            title: "New appointment request",
            body: `${doctorName} requested a consultation with you for ${when}.${reasonBit}`,
            data,
            checkForChild: true,
          });
          await emailActionRequired({
            recipientUserId: ctx.patientId,
            recipientRole: "patient",
            requesterName: doctorName,
            scheduledStart: ctx.scheduledStart,
            consultationType: ctx.type || "video",
            reason: ctx.reason,
          });
          break;
        }
        // Patient requested → notify the practitioner
        await createNotification({
          userId: ctx.practitionerId,
          type: "appointment_request",
          title: "New appointment request",
          body: `${patientName} requested a consultation for ${when}.${reasonBit}`,
          data,
        });
        await emailActionRequired({
          recipientUserId: ctx.practitionerId,
          recipientRole: "practitioner",
          requesterName: patientName,
          scheduledStart: ctx.scheduledStart,
          consultationType: ctx.type || "video",
          reason: ctx.reason,
        });
        // Confirm to patient (or guardian if child)
        await createNotification({
          userId: ctx.patientId,
          type: "appointment_request_sent",
          title: "Appointment request sent",
          body: `Your request with ${doctorName} for ${when} was submitted. You'll be notified when they respond.`,
          data,
          checkForChild: true,
        });
        break;
      }

      case "scheduled_created": {
        // Practitioner/hospital booked for patient → notify patient (or guardian if child)
        await createNotification({
          userId: ctx.patientId,
          type: "appointment_scheduled",
          title: "Appointment scheduled",
          body: `${doctorName} scheduled a consultation for ${when}.${reasonBit}`,
          data,
          checkForChild: true,
        });
        break;
      }

      case "accepted": {
        // Practitioner accepted → notify patient (the other party, or guardian if child)
        await createNotification({
          userId: ctx.patientId,
          type: "appointment_approved",
          title: "Appointment accepted",
          body: `${doctorName} accepted your consultation for ${when}.`,
          data,
          checkForChild: true,
        });
        break;
      }

      case "declined": {
        await createNotification({
          userId: ctx.patientId,
          type: "appointment_declined",
          title: "Appointment declined",
          body: `${doctorName} declined the consultation request for ${when}.`,
          data,
          checkForChild: true,
        });
        break;
      }

      case "cancelled": {
        const recipient = otherPartyId(ctx);
        const isPatientRecipient = sameId(recipient, ctx.patientId);
        await createNotification({
          userId: recipient,
          type: "appointment_cancelled",
          title: "Appointment cancelled",
          body: `${actorLabel} cancelled the consultation for ${when}.`,
          data,
          checkForChild: isPatientRecipient,
        });
        break;
      }

      case "rescheduled": {
        const recipient = otherPartyId(ctx);
        const isPatientRecipient = sameId(recipient, ctx.patientId);
        await createNotification({
          userId: recipient,
          type: "appointment_rescheduled",
          title: "Appointment rescheduled",
          body: `${actorLabel} rescheduled the consultation to ${when}.`,
          data,
          checkForChild: isPatientRecipient,
        });
        break;
      }

      case "reschedule_requested": {
        const recipient = otherPartyId(ctx);
        const isPatientRecipient = sameId(recipient, ctx.patientId);
        await createNotification({
          userId: recipient,
          type: "appointment_reschedule_request",
          title: "Reschedule request",
          body: `${actorLabel} proposed moving your consultation to ${when}. Accept to confirm the new time.`,
          data,
          checkForChild: isPatientRecipient,
        });
        // The other event that stalls until a human answers it, so it gets the
        // same treatment as a new request.
        if (recipient) {
          await emailActionRequired({
            recipientUserId: recipient,
            recipientRole: isPatientRecipient ? "patient" : "practitioner",
            requesterName: actorLabel,
            scheduledStart: ctx.scheduledStart,
            consultationType: ctx.type || "video",
            isReschedule: true,
            reason: ctx.reason,
          });
        }
        break;
      }

      case "reschedule_accepted": {
        const recipient = otherPartyId(ctx);
        const isPatientRecipient = sameId(recipient, ctx.patientId);
        await createNotification({
          userId: recipient,
          type: "appointment_reschedule_accepted",
          title: "Reschedule accepted",
          body: `${actorLabel} accepted your reschedule to ${when}.`,
          data,
          checkForChild: isPatientRecipient,
        });
        break;
      }

      case "reschedule_declined": {
        const recipient = otherPartyId(ctx);
        const isPatientRecipient = sameId(recipient, ctx.patientId);
        await createNotification({
          userId: recipient,
          type: "appointment_reschedule_declined",
          title: "Reschedule declined",
          body: `${actorLabel} declined your reschedule request to ${when}. The appointment stays at its original time.`,
          data,
          checkForChild: isPatientRecipient,
        });
        break;
      }

      case "updated": {
        const recipient = otherPartyId(ctx);
        const isPatientRecipient = sameId(recipient, ctx.patientId);
        const detail =
          ctx.changeSummary ||
          `details were updated for the consultation on ${when}.`;
        await createNotification({
          userId: recipient,
          type: "appointment_updated",
          title: "Appointment updated",
          body: `${actorLabel} ${detail}`,
          data,
          checkForChild: isPatientRecipient,
        });
        break;
      }

      case "expired": {
        await createNotification({
          userId: ctx.patientId,
          type: "appointment_expired",
          title: "Request expired",
          body: `Your appointment request with ${doctorName} for ${when} was not accepted in time and has been cancelled.`,
          data,
          checkForChild: true,
        });
        await createNotification({
          userId: ctx.practitionerId,
          type: "appointment_expired",
          title: "Request expired",
          body: `The appointment request from ${patientName} for ${when} expired without acceptance and was cancelled.`,
          data,
        });
        break;
      }
    }
  } catch (err) {
    console.error("[booking/notifications] notifyBookingEvent error:", err);
  }
}

/**
 * Infer notification event(s) from before/after consultation state and notify the other party.
 */
export async function notifyAppointmentChange(opts: {
  before: {
    status: string;
    scheduledStart: Date | string;
    scheduledEnd?: Date | string;
    chiefComplaint?: string;
    type?: string;
  };
  after: {
    _id: string | mongoose.Types.ObjectId;
    patientId: string | mongoose.Types.ObjectId;
    practitionerId: string | mongoose.Types.ObjectId;
    status: string;
    scheduledStartTime: Date | string;
    scheduledEndTime?: Date | string;
    chiefComplaint?: string;
    type?: string;
  };
  actorUserId?: string;
}): Promise<void> {
  const { before, after, actorUserId } = opts;
  const ctx: BookingNotifyContext = {
    consultationId: after._id,
    patientId: after.patientId,
    practitionerId: after.practitionerId,
    scheduledStart: after.scheduledStartTime,
    reason: after.chiefComplaint,
    type: after.type,
    actorUserId,
  };

  const statusChanged = before.status !== after.status;
  const timeChanged =
    new Date(before.scheduledStart).getTime() !==
    new Date(after.scheduledStartTime).getTime();
  const reasonChanged =
    (before.chiefComplaint || "") !== (after.chiefComplaint || "");
  const typeChanged = (before.type || "") !== (after.type || "");

  if (
    statusChanged &&
    after.status === "scheduled" &&
    (before.status === "requested" || before.status === "pending")
  ) {
    await notifyBookingEvent("accepted", ctx);
    return;
  }

  if (
    statusChanged &&
    after.status === "cancelled" &&
    (before.status === "requested" || before.status === "pending")
  ) {
    // Practitioner declining a request vs either party cancelling a request
    if (sameId(actorUserId, after.practitionerId)) {
      await notifyBookingEvent("declined", ctx);
    } else {
      await notifyBookingEvent("cancelled", ctx);
    }
    return;
  }

  if (statusChanged && after.status === "cancelled") {
    await notifyBookingEvent("cancelled", ctx);
    return;
  }

  if (timeChanged) {
    await notifyBookingEvent("rescheduled", ctx);
    // Also note other field changes if any
    if (reasonChanged || typeChanged) {
      await notifyBookingEvent("updated", {
        ...ctx,
        changeSummary: `also updated the appointment details for ${formatWhen(after.scheduledStartTime)}.`,
      });
    }
    return;
  }

  if (reasonChanged || typeChanged || statusChanged) {
    const bits: string[] = [];
    if (typeChanged) bits.push("consultation type");
    if (reasonChanged) bits.push("reason");
    if (statusChanged) bits.push(`status to ${after.status}`);
    await notifyBookingEvent("updated", {
      ...ctx,
      changeSummary: `updated ${bits.join(" and ")} for the consultation on ${formatWhen(after.scheduledStartTime)}.`,
    });
  }
}
