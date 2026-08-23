/**
 * Branded HTML for the "you've been invited to a family account" email.
 * Inline styles only — email clients strip <style> blocks and don't
 * support external CSS, so every rule lives on the element itself.
 */
export function familyInviteEmailHtml(params: {
  guardianName: string;
  relationship: string;
  inviteUrl: string;
  inviteeName?: string;
}): string {
  const { guardianName, relationship, inviteUrl, inviteeName } = params;
  const greeting = inviteeName ? `Hi ${escapeHtml(inviteeName)}, ` : '';

  return `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#eef4f7; font-family:'Segoe UI', Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef4f7; padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(68,147,184,0.15);">

            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, #4493b8 0%, #326e8a 100%); padding:40px 32px; text-align:center;">
                <div style="display:inline-flex; align-items:center; justify-content:center; width:56px; height:56px; background-color:rgba(255,255,255,0.15); border-radius:14px; margin-bottom:16px; font-size:28px; line-height:56px;">
                  👪
                </div>
                <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:700; letter-spacing:-0.3px;">
                  24/7 DigiHealth
                </h1>
                <p style="margin:6px 0 0; color:rgba(255,255,255,0.85); font-size:13px; letter-spacing:0.5px; text-transform:uppercase;">
                  Family Account Invitation
                </p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:36px 32px 8px;">
                <h2 style="margin:0 0 12px; color:#0f172a; font-size:20px; font-weight:700;">
                  ${greeting}${escapeHtml(guardianName)} wants to add you as their ${escapeHtml(relationship)}
                </h2>
                <p style="margin:0 0 20px; color:#475569; font-size:15px; line-height:1.6;">
                  Accepting links your account so ${escapeHtml(guardianName)} can manage your
                  appointments and billing on 24/7 DigiHealth. <strong>Your medical history stays
                  private to you</strong> — linking never gives them access to your clinical
                  records. You can leave this family account at any time.
                </p>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td style="padding:8px 32px 32px; text-align:center;">
                <a href="${inviteUrl}"
                   style="display:inline-block; background-color:#4493b8; color:#ffffff; font-size:15px; font-weight:700; text-decoration:none; padding:14px 36px; border-radius:999px; box-shadow:0 4px 14px rgba(68,147,184,0.35);">
                  Review &amp; Accept
                </a>
              </td>
            </tr>

            <!-- What this does / doesn't do -->
            <tr>
              <td style="padding:0 32px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; border-radius:12px; padding:20px;">
                  <tr>
                    <td style="padding:4px 4px; color:#334155; font-size:13px; font-weight:600;">
                      ✓&nbsp;&nbsp;${escapeHtml(guardianName)} can book/manage your appointments and pays your subscription
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 4px; color:#334155; font-size:13px; font-weight:600;">
                      ✗&nbsp;&nbsp;They cannot see your medical history, prescriptions, or consultation notes
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Fallback link -->
            <tr>
              <td style="padding:0 32px 32px;">
                <p style="margin:0; color:#94a3b8; font-size:12px; line-height:1.6;">
                  Button not working? Paste this link into your browser:<br />
                  <a href="${inviteUrl}" style="color:#4493b8; word-break:break-all;">${inviteUrl}</a>
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:24px 32px; background-color:#f8fafc; border-top:1px solid #e2e8f0; text-align:center;">
                <p style="margin:0; color:#94a3b8; font-size:12px;">
                  This invite expires in 15 minutes. If you weren't expecting this, you can safely ignore it.
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
