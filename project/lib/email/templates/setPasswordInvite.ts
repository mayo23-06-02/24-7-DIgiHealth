/**
 * "Your hospital registered you on 24/7 DigiHealth — complete your health profile" email.
 * Inline styles only — email clients strip <style> blocks.
 */
export function setPasswordInviteEmailHtml(params: {
  firstName: string;
  facilityName: string;
  kind: "patient" | "doctor";
  fileNumber: string;
  setPasswordUrl: string;
  expiresInDays: number;
}): string {
  const { firstName, facilityName, kind, fileNumber, setPasswordUrl, expiresInDays } = params;
  const who = kind === "doctor" ? "a doctor" : "a patient";
  return `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#eef4f7; font-family:'Segoe UI', Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef4f7; padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#ffffff; border-radius:16px; overflow:hidden;">
          <tr><td style="background:#4493b8; padding:32px; text-align:center;">
            <h1 style="margin:0; color:#ffffff; font-size:22px;">24/7 DigiHealth</h1>
            <p style="margin:6px 0 0; color:rgba(255,255,255,0.85); font-size:13px; text-transform:uppercase;">Complete your health profile</p>
          </td></tr>
          <tr><td style="padding:32px 32px 8px;">
            <h2 style="margin:0 0 12px; color:#0f172a; font-size:20px;">Hi ${escapeHtml(firstName)},</h2>
            <p style="margin:0 0 16px; color:#475569; font-size:15px; line-height:1.6;">
              <strong>${escapeHtml(facilityName)}</strong> has registered you on 24/7 DigiHealth as ${who}.
              Your file number there is <strong>${escapeHtml(fileNumber)}</strong>.
            </p>
            <p style="margin:0 0 20px; color:#475569; font-size:15px; line-height:1.6;">
              Complete your health profile: check your details, add anything that is missing and create your password to start using your account.
            </p>
          </td></tr>
          <tr><td style="padding:8px 32px 32px; text-align:center;">
            <a href="${setPasswordUrl}" style="display:inline-block; background-color:#4493b8; color:#ffffff; font-size:15px; font-weight:700; text-decoration:none; padding:14px 36px; border-radius:999px;">
              Complete your health profile
            </a>
          </td></tr>
          <tr><td style="padding:0 32px 32px;">
            <p style="margin:0; color:#94a3b8; font-size:12px; line-height:1.6;">
              Button not working? Paste this link into your browser:<br />
              <a href="${setPasswordUrl}" style="color:#4493b8; word-break:break-all;">${setPasswordUrl}</a>
            </p>
          </td></tr>
          <tr><td style="padding:24px 32px; background-color:#f8fafc; border-top:1px solid #e2e8f0; text-align:center;">
            <p style="margin:0; color:#94a3b8; font-size:12px;">
              This link expires in ${expiresInDays} days. If you weren't expecting this, you can ignore it.
            </p>
          </td></tr>
        </table>
      </td></tr>
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
