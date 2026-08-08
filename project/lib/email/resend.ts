import { Resend } from "resend";

let client: Resend | null = null;

export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

function getClient(): Resend {
  if (!client) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error(
        "RESEND_API_KEY is not configured. Add it to .env.local — get a free key at resend.com.",
      );
    }
    client = new Resend(key);
  }
  return client;
}

/** Verified sender. Resend's shared onboarding@resend.dev works with zero setup
 * for development; swap in a domain-verified address for production. */
const FROM_ADDRESS =
  process.env.RESEND_FROM_EMAIL || "24/7 DigiHealth <onboarding@resend.dev>";

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ error: string | null }> {
  try {
    const resend = getClient();
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (error) {
      return { error: error.message || "Failed to send email" };
    }
    return { error: null };
  } catch (err: any) {
    return { error: err?.message || "Failed to send email" };
  }
}
