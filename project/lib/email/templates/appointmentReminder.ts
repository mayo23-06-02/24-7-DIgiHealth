import { escapeHtml, renderEmail } from "../layout";

/** "Your consultation starts in 10 minutes" reminder. */
export function appointmentReminderEmailHtml(params: {
  recipientName?: string;
  /** Set when emailing a guardian about a minor dependent's appointment. */
  onBehalfOf?: string;
  otherPartyName: string;
  scheduledStartTime: Date;
  consultationType: string;
  joinUrl?: string;
}): string {
  const { recipientName, onBehalfOf, otherPartyName, scheduledStartTime, consultationType, joinUrl } = params;
  const whose = onBehalfOf ? `${escapeHtml(onBehalfOf)}'s` : "your";
  const time = scheduledStartTime.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg" });
  const date = scheduledStartTime.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Johannesburg" });
  return renderEmail({
    preheader: `Your consultation with ${otherPartyName} starts at ${time}.`,
    eyebrow: "Appointment reminder",
    title: "Your consultation starts soon",
    icon: "&#9200;",
    greeting: recipientName ? `Dear ${escapeHtml(recipientName)},` : "Hello,",
    paragraphs: [
      `This is a reminder that ${whose} ${escapeHtml(consultationType)} consultation with <strong>${escapeHtml(otherPartyName)}</strong> starts in about 10 minutes.`,
    ],
    details: [
      ["Time", time],
      ["Date", date],
      ["Type", consultationType],
    ],
    cta: joinUrl ? { label: "Join consultation", url: joinUrl } : undefined,
    notes: ["This is a one-time reminder. You will not receive another reminder for this booking."],
  });
}
