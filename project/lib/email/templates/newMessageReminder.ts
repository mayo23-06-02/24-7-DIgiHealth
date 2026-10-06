import { escapeHtml, renderEmail } from "../layout";

/** Nudge sent when a message has been unread for several hours. */
export function newMessageReminderEmailHtml(params: { recipientName?: string; unreadCount: number; appUrl: string }): string {
  const { recipientName, unreadCount, appUrl } = params;
  const plural = unreadCount === 1 ? "message" : "messages";
  return renderEmail({
    preheader: `You have ${unreadCount} unread ${plural} on 24/7 Digi-Health.`,
    eyebrow: "Messages",
    title: unreadCount === 1 ? "You have a new message" : "You have new messages",
    icon: "&#128172;",
    greeting: recipientName ? `Dear ${escapeHtml(recipientName)},` : "Hello,",
    paragraphs: [`You have <strong>${unreadCount} unread ${plural}</strong> waiting for you on 24/7 Digi-Health.`],
    cta: { label: "Open messages", url: appUrl },
    notes: ["You will receive only one reminder per unread message."],
  });
}
