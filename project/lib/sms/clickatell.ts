/**
 * Clickatell SMS client — chosen over Twilio for OTP delivery specifically
 * because of direct South African network connections (Vodacom/MTN/Cell C/
 * Telkom) and materially lower per-message cost to SA numbers than routing
 * through a global provider. See docs.clickatell.com for the REST API.
 *
 * Requires CLICKATELL_API_KEY (a Bearer token, generated per-API-integration
 * in the Clickatell account centre — not the account password).
 */

const CLICKATELL_API_KEY = process.env.CLICKATELL_API_KEY;

export function isSmsConfigured(): boolean {
  return !!CLICKATELL_API_KEY;
}

/**
 * Sends a single SMS. `to` must be E.164 without the leading '+'
 * (e.g. "27821234567"), matching lib/phone/normalizePhone.ts's phoneE164
 * output with the '+' stripped.
 */
export async function sendSms(params: {
  to: string;
  message: string;
}): Promise<{ error: string | null }> {
  if (!CLICKATELL_API_KEY) {
    return { error: "SMS is not configured (CLICKATELL_API_KEY missing)" };
  }

  const to = params.to.replace(/^\+/, "").replace(/\D/g, "");
  if (!to) {
    return { error: "Invalid destination phone number" };
  }

  try {
    const res = await fetch("https://api.clickatell.com/rest/message", {
      method: "POST",
      headers: {
        "X-Version": "1",
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${CLICKATELL_API_KEY}`,
      },
      body: JSON.stringify({ text: params.message, to: [to] }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { error: `Clickatell error (${res.status}): ${body.slice(0, 200)}` };
    }

    const json = await res.json().catch(() => null);
    const entry = json?.data?.message?.[0];
    if (entry && entry.accepted === false) {
      return { error: entry.error || "Message not accepted by Clickatell" };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err?.message || "Network error sending SMS" };
  }
}
