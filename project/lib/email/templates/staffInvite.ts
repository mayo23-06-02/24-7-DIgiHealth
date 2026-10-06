import { escapeHtml, renderEmail } from "../layout";

/** Hospital administrator inviting a practitioner to join the facility. */
export function staffInviteEmailHtml(params: { facilityName: string; inviteUrl: string; adminName?: string }): string {
  const { facilityName, inviteUrl, adminName } = params;
  const f = escapeHtml(facilityName);
  const by = adminName ? ` (${escapeHtml(adminName)})` : "";
  return renderEmail({
    preheader: `${facilityName} has invited you to join its medical staff on 24/7 DigiHealth.`,
    eyebrow: "Practitioner invitation",
    title: `Join ${facilityName}`,
    icon: "&#129658;",
    greeting: "Dear Doctor,",
    paragraphs: [
      `A hospital administrator${by} has invited you to join the medical staff of <strong>${f}</strong> on 24/7 DigiHealth.`,
      "Please complete your practitioner registration. You will be added to the facility's roster automatically once you finish.",
    ],
    highlights: [
      { ok: true, text: "Your specialisation and HPCSA number" },
      { ok: true, text: "Your identity and contact details, and the payment settlement terms" },
      { ok: true, text: `Automatic addition to ${f}'s roster on completion` },
    ],
    cta: { label: "Complete your registration", url: inviteUrl },
    notes: ["This invitation expires in 15 minutes. If you were not expecting this email, you can safely ignore it."],
  });
}
