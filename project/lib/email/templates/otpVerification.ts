import { escapeHtml, renderEmail } from "../layout";

/** One-time code email: "verify your email" (registration) or "sign-in code" (login MFA). */
export function otpVerificationEmailHtml(params: {
  code: string;
  firstName?: string;
  purpose?: "verify_email" | "login_mfa";
}): string {
  const { code, firstName, purpose = "verify_email" } = params;
  const greeting = firstName ? `Dear ${escapeHtml(firstName)},` : "Hello,";
  const mfa = purpose === "login_mfa";
  return renderEmail({
    preheader: mfa ? `Your sign-in code is ${code}` : `Your verification code is ${code}`,
    eyebrow: mfa ? "Secure sign-in" : "Account verification",
    title: mfa ? "Your sign-in code" : "Verify your email",
    icon: "&#128274;",
    greeting,
    paragraphs: [
      mfa
        ? "Use the code below to finish signing in to your 24/7 Digi-Health account."
        : "Thank you for joining 24/7 Digi-Health. To confirm your email address and activate your account, enter the code below.",
    ],
    code,
    codeLabel: mfa ? "Your sign-in code" : "Your verification code",
    notes: [
      "This code expires in <strong>10 minutes</strong>. Never share it with anyone, including our team.",
      mfa
        ? "If you did not try to sign in, someone may know your password. Please change it as soon as possible."
        : "If you did not create a 24/7 Digi-Health account, you can safely ignore this email. No account will be activated without this code.",
    ],
  });
}
