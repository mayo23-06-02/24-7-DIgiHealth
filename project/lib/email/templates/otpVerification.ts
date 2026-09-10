/**
 * Branded HTML for OTP code emails — used both for "verify your email"
 * (registration) and "sign-in code" (login MFA). Inline styles only —
 * email clients strip <style> blocks.
 */
export function otpVerificationEmailHtml(params: {
  code: string;
  firstName?: string;
  purpose?: "verify_email" | "login_mfa";
}): string {
  const { code, firstName, purpose = "verify_email" } = params;
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Hi there,";
  const digits = code.split("");

  const copy =
    purpose === "login_mfa"
      ? {
          headerTitle: "Your sign-in code",
          bodyText: `${greeting} enter this code to finish signing in to your 24/7 DigiHealth account.`,
          footerNote:
            "If you didn't just try to sign in, someone may have your password — consider changing it.",
        }
      : {
          headerTitle: "Verify your account",
          bodyText: `${greeting} enter this code to confirm your email address and activate your 24/7 DigiHealth account.`,
          footerNote: "If you didn't request this, you can safely ignore this email.",
        };

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
                  🔐
                </div>
                <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:700; letter-spacing:-0.3px;">
                  ${copy.headerTitle}
                </h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:36px 32px 8px; text-align:center;">
                <p style="margin:0 0 24px; color:#475569; font-size:15px; line-height:1.6;">
                  ${copy.bodyText}
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                  <tr>
                    ${digits
                      .map(
                        (d) => `
                    <td style="width:44px; height:56px; text-align:center; vertical-align:middle; background-color:#f8fafc; border:2px solid #e2e8f0; border-radius:10px; font-size:26px; font-weight:700; color:#0f172a; padding:0 4px;">
                      ${d}
                    </td>
                    <td style="width:8px;"></td>
                    `,
                      )
                      .join("")}
                  </tr>
                </table>

                <p style="margin:0; color:#94a3b8; font-size:13px;">
                  This code expires in 10 minutes.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:24px 32px; background-color:#f8fafc; border-top:1px solid #e2e8f0; text-align:center;">
                <p style="margin:0; color:#94a3b8; font-size:12px;">
                  ${copy.footerNote}
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
