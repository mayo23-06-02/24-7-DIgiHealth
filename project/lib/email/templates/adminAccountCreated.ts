import { escapeHtml, renderEmail } from "../layout";

const ROLE_LABEL: Record<string, string> = { super_admin: "Super Admin", mega_admin: "Mega Admin" };

/** "Your admin account has been created" with temporary sign-in details. */
export function adminAccountCreatedEmailHtml(params: {
  role: string;
  email: string;
  password: string;
  loginUrl: string;
  invitedByName?: string;
}): string {
  const { role, email, password, loginUrl, invitedByName } = params;
  const roleLabel = ROLE_LABEL[role] || "Admin";
  const by = invitedByName ? ` by ${escapeHtml(invitedByName)}` : "";
  return renderEmail({
    preheader: `Your 24/7 DigiHealth ${roleLabel} account is ready.`,
    eyebrow: "Administrator access",
    title: `Your ${roleLabel} account is ready`,
    icon: "&#128737;&#65039;",
    greeting: "Hello,",
    paragraphs: [
      `A platform administrator${by} has created a <strong>${escapeHtml(roleLabel)}</strong> account for you on 24/7 DigiHealth. Your account is already active, and you can sign in with the details below.`,
    ],
    details: [
      ["Email", email],
      ["Temporary password", password],
    ],
    cta: { label: "Sign in", url: loginUrl },
    notes: [
      "For your security, please change this password after you sign in.",
      "If you were not expecting this account, please contact support immediately.",
    ],
  });
}
