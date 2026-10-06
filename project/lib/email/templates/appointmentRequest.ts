import { escapeHtml, renderEmail } from "../layout";

/** Someone is waiting for an answer about an appointment (new request or proposed new time). */
export function appointmentRequestEmailHtml(params: {
  recipientName?: string;
  /** Set when emailing a guardian about a minor dependent's appointment. */
  onBehalfOf?: string;
  /** Who is asking. */
  requesterName: string;
  scheduledStartTime: Date;
  consultationType: string;
  /** True for a proposed new time on an existing booking. */
  isReschedule?: boolean;
  reason?: string;
  reviewUrl: string;
}): string {
  const { recipientName, onBehalfOf, requesterName, scheduledStartTime, consultationType, isReschedule, reason, reviewUrl } = params;
  const who = `<strong>${escapeHtml(requesterName)}</strong>`;
  const type = escapeHtml(consultationType);
  const time = scheduledStartTime.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg" });
  const date = scheduledStartTime.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Johannesburg" });
  const lead = isReschedule
    ? `${who} has proposed a new time for ${onBehalfOf ? `${escapeHtml(onBehalfOf)}'s` : "your"} ${type} consultation.`
    : `${who} has requested a ${type} consultation${onBehalfOf ? ` with ${escapeHtml(onBehalfOf)}` : ""}.`;
  const details: [string, string][] = [
    ["Time", time],
    ["Date", date],
    ["Type", consultationType],
  ];
  if (reason) details.push(["Reason given", reason]);
  return renderEmail({
    preheader: isReschedule ? `${requesterName} proposed a new time: ${date}, ${time}.` : `${requesterName} requested a consultation on ${date}.`,
    eyebrow: isReschedule ? "Reschedule request" : "Appointment request",
    title: isReschedule ? "A new time has been proposed" : "New appointment request",
    icon: isReschedule ? "&#128467;&#65039;" : "&#128233;",
    greeting: recipientName ? `Dear ${escapeHtml(recipientName)},` : "Hello,",
    paragraphs: [lead, "Nothing is confirmed until you respond."],
    details,
    cta: { label: "Review request", url: reviewUrl },
    notes: ["You are receiving this email because an appointment was requested with you on 24/7 Digi-Health."],
  });
}
