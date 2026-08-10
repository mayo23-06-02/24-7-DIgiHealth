/**
 * Branded HTML for the "you have an unread message" nudge, sent when a
 * message has sat unread for 5+ hours. Inline styles only — email clients
 * strip <style> blocks.
 */
export function newMessageReminderEmailHtml(params: {
  recipientName?: string;
  unreadCount: number;
  appUrl: string;
}): string {
  const { recipientName, unreadCount, appUrl } = params;
  const greeting = recipientName ? `Hi ${escapeHtml(recipientName)},` : "Hi there,";
  const plural = unreadCount === 1 ? "message" : "messages";

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
                  💬
                </div>
                <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:700; letter-spacing:-0.3px;">
                  You have a new message
                </h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:36px 32px 8px; text-align:center;">
                <p style="margin:0 0 24px; color:#475569; font-size:15px; line-height:1.6;">
                  ${greeting} you have ${unreadCount} unread ${plural} waiting on
                  24/7 DigiHealth that you haven't seen yet.
                </p>

                <a href="${appUrl}/messages" style="display:inline-block; padding:12px 28px; background-color:#4493b8; color:#ffffff; text-decoration:none; font-weight:700; font-size:14px; border-radius:999px; margin-bottom:8px;">
                  Open messages
                </a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:24px 32px; background-color:#f8fafc; border-top:1px solid #e2e8f0; text-align:center;">
                <p style="margin:0; color:#94a3b8; font-size:12px;">
                  You'll get one reminder per unread message — no repeat nudges.
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
