/**
 * Branded HTML for the internal "new user signed up" admin notification.
 * Inline styles only — email clients strip <style> blocks.
 */
export function newSignupNotificationEmailHtml(params: {
  fullName: string;
  email: string;
  phone?: string;
  role: string;
}): string {
  const { fullName, email, phone, role } = params;

  return `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#eef4f7; font-family:'Segoe UI', Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef4f7; padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(68,147,184,0.15);">

            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, #4493b8 0%, #326e8a 100%); padding:36px 32px; text-align:center;">
                <div style="display:inline-flex; align-items:center; justify-content:center; width:56px; height:56px; background-color:rgba(255,255,255,0.15); border-radius:14px; margin-bottom:14px; font-size:28px; line-height:56px;">
                  🆕
                </div>
                <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:700; letter-spacing:-0.3px;">
                  New sign-up
                </h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:32px 32px 8px;">
                <p style="margin:0 0 20px; color:#475569; font-size:15px; line-height:1.6;">
                  A new ${escapeHtml(role)} account was just created on 24/7 DigiHealth.
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; border-radius:12px;">
                  <tr>
                    <td style="padding:16px 20px; color:#334155; font-size:14px; font-weight:600; border-bottom:1px solid #e2e8f0;">
                      Name<br />
                      <span style="color:#0f172a; font-weight:700;">${escapeHtml(fullName)}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 20px; color:#334155; font-size:14px; font-weight:600; border-bottom:1px solid #e2e8f0;">
                      Email<br />
                      <span style="color:#0f172a; font-weight:700;">${escapeHtml(email)}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 20px; color:#334155; font-size:14px; font-weight:600;">
                      Phone<br />
                      <span style="color:#0f172a; font-weight:700;">${escapeHtml(phone || "Not provided")}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:24px 32px; background-color:#f8fafc; border-top:1px solid #e2e8f0; text-align:center; margin-top:16px;">
                <p style="margin:0; color:#cbd5e1; font-size:11px;">
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
