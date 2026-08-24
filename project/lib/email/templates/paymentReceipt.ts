function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Branded HTML for the "your plan is active, here's your receipt" email.
 * Inline styles only — email clients strip <style> blocks.
 *
 * The button links to Billing rather than straight at the PDF: the receipt
 * endpoint requires a session, so a direct file link would either 401 for
 * anyone not already signed in, or have to be made public — and a payment
 * record reachable by URL alone is not something to put in an inbox.
 */
export function paymentReceiptEmailHtml(params: {
  recipientName?: string;
  planLabel: string;
  amount: number;
  reference: string;
  paidOn: Date;
  nextBillingDate?: Date | null;
  methodLabel: string;
  billingUrl: string;
}): string {
  const {
    recipientName,
    planLabel,
    amount,
    reference,
    paidOn,
    nextBillingDate,
    methodLabel,
    billingUrl,
  } = params;

  const greeting = recipientName
    ? `Hi ${escapeHtml(recipientName)},`
    : "Hi there,";
  const money = new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 0,
  }).format(amount || 0);
  const paidStr = paidOn.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const nextStr = nextBillingDate
    ? nextBillingDate.toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 0; color:#475569; font-size:14px;">${escapeHtml(label)}</td>
      <td style="padding:10px 0; color:#0a0a2e; font-size:14px; font-weight:600; text-align:right;">${escapeHtml(value)}</td>
    </tr>`;

  return `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#eef4f7; font-family:'Segoe UI', Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef4f7; padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(68,147,184,0.15);">

            <tr>
              <td style="background: linear-gradient(135deg, #4493b8 0%, #326e8a 100%); padding:36px 32px; text-align:center;">
                <div style="width:56px; height:56px; background-color:rgba(255,255,255,0.15); border-radius:14px; margin:0 auto 14px; font-size:28px; line-height:56px;">✓</div>
                <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:700;">Your cover is active</h1>
                <p style="margin:6px 0 0; color:rgba(255,255,255,0.85); font-size:14px;">${escapeHtml(planLabel)} plan</p>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 32px 8px;">
                <p style="margin:0 0 16px; color:#0a0a2e; font-size:15px; line-height:1.6;">${greeting}</p>
                <p style="margin:0 0 20px; color:#475569; font-size:15px; line-height:1.6;">
                  Thank you — your payment went through and your ${escapeHtml(planLabel)} plan is now active.
                  Here are the details for your records.
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0;">
                  ${row("Plan", planLabel)}
                  ${row("Amount paid", money)}
                  ${row("Paid on", paidStr)}
                  ${row("Payment method", methodLabel)}
                  ${row("Reference", reference)}
                  ${nextStr ? row("Next billing date", nextStr) : ""}
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 32px 32px; text-align:center;">
                <a href="${escapeHtml(billingUrl)}"
                   style="display:inline-block; background-color:#4493b8; color:#ffffff; text-decoration:none; font-size:15px; font-weight:600; padding:14px 28px; border-radius:999px;">
                  View or download your receipt
                </a>
                <p style="margin:16px 0 0; color:#94a3b8; font-size:13px; line-height:1.5;">
                  You'll need to be signed in. From Billing you can download this
                  receipt as a PDF — useful for a medical aid claim.
                </p>
              </td>
            </tr>

            <tr>
              <td style="background-color:#f8fafc; padding:20px 32px; text-align:center; border-top:1px solid #e2e8f0;">
                <p style="margin:0; color:#94a3b8; font-size:12px; line-height:1.5;">
                  24/7 DigiHealth · Cancel any time from Billing.<br />
                  This is an automated message — please don't reply to it.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
