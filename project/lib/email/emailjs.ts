/**
 * Transactional email via EmailJS's REST API, relayed through a connected
 * Gmail account rather than a verified sending domain.
 *
 * Setup: connect a Gmail service and create ONE generic pass-through
 * template in the EmailJS dashboard (Email Templates > Create New Template):
 *   - Subject: {{subject}}
 *   - To Email: {{email}}
 *   - Content (raw HTML mode): {{{html}}} — triple braces; EmailJS
 *     HTML-escapes double-brace variables, which renders tags as literal
 *     text instead of formatting.
 * Every email this app sends — regardless of its own HTML template — is
 * relayed through that single EmailJS template via its `html` variable.
 *
 * Then set EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY and
 * EMAILJS_PRIVATE_KEY as env vars. The private key (accessToken) is required
 * because EmailJS blocks server-to-server calls without it — enable
 * "Allow EmailJS API for non-browser applications" under
 * dashboard.emailjs.com/admin/account/security.
 */

const EMAILJS_ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";

export function isEmailJSConfigured(): boolean {
  return (
    !!process.env.EMAILJS_SERVICE_ID &&
    !!process.env.EMAILJS_TEMPLATE_ID &&
    !!process.env.EMAILJS_PUBLIC_KEY &&
    !!process.env.EMAILJS_PRIVATE_KEY
  );
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ error: string | null }> {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    return {
      error:
        "EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY and EMAILJS_PRIVATE_KEY are not configured. Set them from your EmailJS dashboard (dashboard.emailjs.com).",
    };
  }

  try {
    const res = await fetch(EMAILJS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        accessToken: privateKey,
        template_params: {
          email: params.to,
          subject: params.subject,
          html: params.html,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { error: text || `EmailJS send failed (${res.status})` };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err?.message || "Failed to send email" };
  }
}
