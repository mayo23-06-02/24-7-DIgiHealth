/**
 * Branded HTML for "someone is waiting on your answer about an appointment".
 * Inline styles only — email clients strip <style> blocks.
 */
export function appointmentRequestEmailHtml(params: {
  recipientName?: string;
  /** Set when emailing a guardian about a minor dependent's appointment. */
  onBehalfOf?: string;
  /** Who is asking. */
  requesterName: string;
  scheduledStartTime: Date;
  consultationType: string;
  /** True for a proposed new time on an existing booking. */
  isReschedule?: boolean;
  reason?: string;
  reviewUrl: string;
}): string {
  const {
    recipientName,
    onBehalfOf,
    requesterName,
    scheduledStartTime,
    consultationType,
    isReschedule,
    reason,
    reviewUrl,
  } = params;

  const greeting = recipientName ? `Hi ${escapeHtml(recipientName)},` : "Hi there,";
  const timeStr = scheduledStartTime.toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = scheduledStartTime.toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const heading = isReschedule ? "A new time has been proposed" : "New appointment request";
  const lead = isReschedule
    ? `<strong>${escapeHtml(requesterName)}</strong> has proposed a new time for ${
        onBehalfOf ? `${escapeHtml(onBehalfOf)}'s` : "your"
      } ${escapeHtml(consultationType)} consultation.`
    : `<strong>${escapeHtml(requesterName)}</strong> has requested ${
        onBehalfOf ? `a ${escapeHtml(consultationType)} consultation with ${escapeHtml(onBehalfOf)}` : `a ${escapeHtml(consultationType)} consultation`
      }.`;

  return `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#eef4f7; font-family:'Segoe UI', Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef4f7; padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(68,147,184,0.15);">

            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, #4493b8 0%, #326e8a 100%); padding:36px 32px; text-align:center;">
                <div style="display:inline-flex; align-items:center; justify-content:center; width:56px; height:56px; background-color:rgba(255,255,255,0.15); border-radius:14px; margin-bottom:14px; font-size:28px; line-height:56px;">
                  ${isReschedule ? "🗓️" : "📩"}
                </div>
                <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:700; letter-spacing:-0.3px;">
                  ${heading}
                </h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:36px 32px 8px; text-align:center;">
                <p style="margin:0 0 20px; color:#475569; font-size:15px; line-height:1.6;">
                  ${greeting} ${lead}
                </p>

                <div style="margin:0 0 20px; padding:18px 20px; background-color:#f8fafc; border:2px solid #e2e8f0; border-radius:12px;">
                  <p style="margin:0; color:#0f172a; font-size:18px; font-weight:700;">${timeStr}</p>
                  <p style="margin:4px 0 0; color:#64748b; font-size:13px;">${dateStr}</p>
                </div>

                ${
                  reason
                    ? `<p style="margin:0 0 20px; padding:14px 18px; background-color:#fffbeb; border:1px solid #fde68a; border-radius:10px; color:#78350f; font-size:13px; line-height:1.5; text-align:left;">
                        <strong style="display:block; margin-bottom:4px;">Reason given</strong>
                        ${escapeHtml(reason)}
                      </p>`
                    : ""
                }

                <a href="${reviewUrl}" style="display:inline-block; padding:12px 28px; background-color:#4493b8; color:#ffffff; text-decoration:none; font-weight:700; font-size:14px; border-radius:999px; margin-bottom:8px;">
                  Review request
                </a>

                <p style="margin:12px 0 0; color:#94a3b8; font-size:12px; line-height:1.5;">
                  Nothing is confirmed until you respond.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:24px 32px; background-color:#f8fafc; border-top:1px solid #e2e8f0; text-align:center;">
                <p style="margin:0; color:#94a3b8; font-size:12px;">
                  You're receiving this because someone requested an appointment with you on 24/7 DigiHealth.
                </p>
                <p style="margin:8px 0 0; color:#cbd5e1; font-size:11px;">
                  24/7 DigiHealth · Connect for Care
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim();
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
