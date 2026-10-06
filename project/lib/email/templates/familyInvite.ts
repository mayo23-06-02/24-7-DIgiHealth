import { escapeHtml, renderEmail } from "../layout";

/** "You've been invited to a family account" — guardian linking a family member. */
export function familyInviteEmailHtml(params: {
  guardianName: string;
  relationship: string;
  inviteUrl: string;
  inviteeName?: string;
}): string {
  const { guardianName, relationship, inviteUrl, inviteeName } = params;
  const g = escapeHtml(guardianName);
  return renderEmail({
    preheader: `${guardianName} has invited you to join their family account on 24/7 DigiHealth.`,
    eyebrow: "Family account invitation",
    title: "You've been invited",
    icon: "&#128106;",
    greeting: inviteeName ? `Dear ${escapeHtml(inviteeName)},` : "Hello,",
    paragraphs: [
      `<strong>${g}</strong> would like to add you to their family account as their ${escapeHtml(relationship)}.`,
      `Accepting links your account so that ${g} can manage your appointments and billing. <strong>Your medical history remains private to you</strong>, and you can leave the family account at any time.`,
    ],
    highlights: [
      { ok: true, text: `${g} can book and manage your appointments and pay your subscription.` },
      { ok: false, text: "They cannot see your medical history, prescriptions or consultation notes." },
    ],
    cta: { label: "Review and accept", url: inviteUrl },
    notes: ["This invitation expires in 15 minutes. If you were not expecting this email, you can safely ignore it."],
  });
}
