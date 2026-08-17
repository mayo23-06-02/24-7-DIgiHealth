/**
 * Mailjet transactional email via their REST API (no SDK dependency —
 * a single authenticated fetch is all it needs).
 *
 * Setup: Get API Key and Secret Key from Mailjet dashboard
 * (Account Settings > Master API Keys), then set MAILJET_API_KEY and
 * MAILJET_SECRET_KEY as env vars.
 */

export function isMailjetConfigured(): boolean {
  return !!process.env.MAILJET_API_KEY && !!process.env.MAILJET_SECRET_KEY;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ error: string | null }> {
  const apiKey = process.env.MAILJET_API_KEY;
  const secretKey = process.env.MAILJET_SECRET_KEY;
  const from = process.env.MAILJET_FROM_EMAIL || "noreply@247digihealth.com";

  if (!apiKey || !secretKey) {
    return { error: "MAILJET_API_KEY and MAILJET_SECRET_KEY are not configured. Add them to .env.local — get API keys at mailjet.com." };
  }

  try {
    const auth = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");

    const res = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        Messages: [
          {
            From: {
              Email: from,
              Name: "24/7 DigiHealth",
            },
            To: [
              {
                Email: params.to,
              },
            ],
            Subject: params.subject,
            HTMLPart: params.html,
          },
        ],
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: data.ErrorMessage || `Mailjet send failed (${res.status})` };
    }

    // Check for Mailjet-specific errors
    if (data.Messages && data.Messages[0] && data.Messages[0].Status === "error") {
      return { error: data.Messages[0].Errors?.[0]?.ErrorMessage || "Mailjet send failed" };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err?.message || "Failed to send email" };
  }
}
