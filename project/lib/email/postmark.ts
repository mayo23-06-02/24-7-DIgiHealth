/**
 * Postmark transactional email via their REST API (no SDK dependency —
 * a single authenticated fetch is all it needs).
 *
 * Setup: verify a single "Sender Signature" address in the Postmark
 * dashboard (Sender Signatures → Add), no domain/DNS required, then set
 * POSTMARK_SERVER_TOKEN (Server API Token) and POSTMARK_FROM_EMAIL (the
 * verified address) as env vars.
 */

export function isPostmarkConfigured(): boolean {
  return !!process.env.POSTMARK_SERVER_TOKEN;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ error: string | null }> {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!token) {
    return { error: "POSTMARK_SERVER_TOKEN is not configured. Add it to .env.local — get a Server API Token at postmarkapp.com." };
  }
  const from = process.env.POSTMARK_FROM_EMAIL;
  if (!from) {
    return { error: "POSTMARK_FROM_EMAIL is not configured. Set it to your verified Sender Signature address." };
  }

  try {
    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": token,
      },
      body: JSON.stringify({
        From: from,
        To: params.to,
        Subject: params.subject,
        HtmlBody: params.html,
        MessageStream: "outbound",
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ErrorCode) {
      return { error: data.Message || `Postmark send failed (${res.status})` };
    }
    return { error: null };
  } catch (err: any) {
    return { error: err?.message || "Failed to send email" };
  }
}
