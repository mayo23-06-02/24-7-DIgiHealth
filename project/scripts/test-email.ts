/**
 * Test script to send a test email via Mailjet
 * Run with: npx tsx scripts/test-email.ts
 */

import { sendEmail } from '../lib/email/mailjet';

async function sendTestEmail() {
  console.log('Sending test email to mayo@razonetix.com...');

  const html = `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#eef4f7; font-family:'Segoe UI', Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef4f7; padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(68,147,184,0.15);">
            <tr>
              <td style="background: linear-gradient(135deg, #4493b8 0%, #326e8a 100%); padding:40px 32px; text-align:center;">
                <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:700; letter-spacing:-0.3px;">
                  24/7 DigiHealth
                </h1>
                <p style="margin:6px 0 0; color:rgba(255,255,255,0.85); font-size:13px; letter-spacing:0.5px; text-transform:uppercase;">
                  Test Email
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px 8px;">
                <h2 style="margin:0 0 12px; color:#0f172a; font-size:20px; font-weight:700;">
                  Mailjet Integration Test
                </h2>
                <p style="margin:0 0 20px; color:#475569; font-size:15px; line-height:1.6;">
                  This is a test email to verify that the Mailjet integration is working correctly.
                </p>
                <p style="margin:0 0 20px; color:#475569; font-size:15px; line-height:1.6;">
                  If you received this email, the Mailjet API is properly configured and sending emails successfully.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px; background-color:#f8fafc; border-top:1px solid #e2e8f0; text-align:center;">
                <p style="margin:0; color:#94a3b8; font-size:12px;">
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

  // Set sender email for this test
  process.env.MAILJET_FROM_EMAIL = 'makabmahlalela@gmail.com';

  const result = await sendEmail({
    to: 'mayo@razonetix.com',
    subject: 'Mailjet Integration Test - 24/7 DigiHealth',
    html,
  });

  if (result.error) {
    console.error('❌ Failed to send test email:', result.error);
    process.exit(1);
  } else {
    console.log('✅ Test email sent successfully to mayo@razonetix.com');
    process.exit(0);
  }
}

sendTestEmail().catch((error) => {
  console.error('Error sending test email:', error);
  process.exit(1);
});
