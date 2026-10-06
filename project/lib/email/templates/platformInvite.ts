import { escapeHtml, renderEmail } from "../layout";

const ROLE_LABEL: Record<string, string> = {
  patient: "patient",
  practitioner: "practitioner",
  hospital_admin: "hospital administrator",
};

/** Invitation from a platform administrator to register as a given role. */
export function platformInviteEmailHtml(params: { role: string; inviteUrl: string; invitedByName?: string }): string {
  const { role, inviteUrl, invitedByName } = params;
  const roleLabel = ROLE_LABEL[role] || "user";
  const by = invitedByName ? ` by ${escapeHtml(invitedByName)}` : "";
  return renderEmail({
    preheader: `You have been invited to join 24/7 Digi-Health as a ${roleLabel}.`,
    eyebrow: "You're invited",
    title: "Join 24/7 Digi-Health",
    icon: "&#9993;&#65039;",
    greeting: "Hello,",
    paragraphs: [
      `A platform administrator${by} has invited you to create a <strong>${escapeHtml(roleLabel)}</strong> account on 24/7 Digi-Health.`,
      "Please use the button below to complete your registration.",
    ],
    cta: { label: "Complete your registration", url: inviteUrl },
    notes: ["This invitation expires in 7 days. If you were not expecting this email, you can safely ignore it."],
  });
}
