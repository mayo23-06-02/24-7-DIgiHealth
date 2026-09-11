/**
 * Branded HTML for "your admin account has been created" — used for
 * super_admin/mega_admin accounts, which are created in full immediately
 * (no registration wizard to complete) and just need to log in.
 * Inline styles only — email clients strip <style> blocks.
 */
const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  mega_admin: "Mega Admin",
};

export function adminAccountCreatedEmailHtml(params: {
  role: string;
  email: string;
  password: string;
  loginUrl: string;
  invitedByName?: string;
}): string {
  const { role, email, password, loginUrl, invitedByName } = params;
  const roleLabel = ROLE_LABEL[role] || "Admin";
  const invitedBy = invitedByName ? ` by ${escapeHtml(invitedByName)}` : "";

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
                  🔐
                </div>
                <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:700; letter-spacing:-0.3px;">
                  24/7 DigiHealth
                </h1>
                <p style="margin:6px 0 0; color:rgba(255,255,255,0.85); font-size:13px; letter-spacing:0.5px; text-transform:uppercase;">
                  ${escapeHtml(roleLabel)} Account Created
                </p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:36px 32px 8px;">
                <h2 style="margin:0 0 12px; color:#0f172a; font-size:20px; font-weight:700;">
                  Your ${escapeHtml(roleLabel)} account is ready
                </h2>
                <p style="margin:0 0 20px; color:#475569; font-size:15px; line-height:1.6;">
                  A platform administrator${invitedBy} has created a
                  ${escapeHtml(roleLabel)} account for you on 24/7 DigiHealth.
                  Your account is already active — log in with the credentials
                  below.
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; border-radius:12px;">
                  <tr>
                    <td style="padding:16px 20px; color:#334155; font-size:14px; font-weight:600; border-bottom:1px solid #e2e8f0;">
                      Email<br />
                      <span style="color:#0f172a; font-weight:700;">${escapeHtml(email)}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 20px; color:#334155; font-size:14px; font-weight:600;">
                      Temporary password<br />
                      <span style="color:#0f172a; font-weight:700; font-family:monospace; font-size:16px;">${escapeHtml(password)}</span>
                    </td>
                  </tr>
                </table>

                <p style="margin:20px 0 0; color:#94a3b8; font-size:12px; line-height:1.6;">
                  For your security, please change this password after logging in.
                </p>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td style="padding:8px 32px 32px; text-align:center;">
                <a href="${loginUrl}"
                   style="display:inline-block; background-color:#4493b8; color:#ffffff; font-size:15px; font-weight:700; text-decoration:none; padding:14px 36px; border-radius:999px; box-shadow:0 4px 14px rgba(68,147,184,0.35);">
                  Log In
                </a>
              </td>
            </tr>

            <!-- Fallback link -->
            <tr>
              <td style="padding:0 32px 32px;">
                <p style="margin:0; color:#94a3b8; font-size:12px; line-height:1.6;">
                  Button not working? Paste this link into your browser:<br />
                  <a href="${loginUrl}" style="color:#4493b8; word-break:break-all;">${loginUrl}</a>
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:24px 32px; background-color:#f8fafc; border-top:1px solid #e2e8f0; text-align:center;">
                <p style="margin:0; color:#94a3b8; font-size:12px;">
                  If you weren't expecting this account, contact support immediately.
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
