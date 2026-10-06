import { escapeHtml, renderEmail } from "../layout";

/** Internal notification to the team when a new account is created. */
export function newSignupNotificationEmailHtml(params: { fullName: string; email: string; phone?: string; role: string }): string {
  const { fullName, email, phone, role } = params;
  const details: [string, string][] = [
    ["Name", fullName],
    ["Email", email],
    ["Role", role],
  ];
  if (phone) details.push(["Phone", phone]);
  return renderEmail({
    preheader: `New ${role} account: ${fullName}`,
    eyebrow: "Internal notification",
    title: "New sign-up",
    icon: "&#127881;",
    paragraphs: [`A new <strong>${escapeHtml(role)}</strong> account has just been created on 24/7 Digi-Health.`],
    details,
    signoff: false,
  });
}
