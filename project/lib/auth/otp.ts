import bcrypt from "bcryptjs";
import User from "@/lib/models/User";
import { sendEmail } from "@/lib/email/resend";
import { otpVerificationEmailHtml } from "@/lib/email/templates/otpVerification";
import { updateUserByMongoId } from "@/lib/postgres/users";
import { sendSms, isSmsConfigured } from "@/lib/sms/clickatell";

const OTP_TTL_MINUTES = 10;

function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function otpSmsText(code: string, purpose: "verify_email" | "login_mfa"): string {
  return purpose === "login_mfa"
    ? `24/7 DigiHealth: your sign-in code is ${code}. Expires in ${OTP_TTL_MINUTES} minutes. Didn't request this? Ignore this message.`
    : `24/7 DigiHealth: your verification code is ${code}. Expires in ${OTP_TTL_MINUTES} minutes.`;
}

/**
 * Generates, stores (hashed), and delivers a fresh 6-digit verification
 * code. Sent by SMS when the account has a phone number and SMS is
 * configured — falling back to email (or running alongside it, if both are
 * available) so a Clickatell outage or a missing number never locks
 * someone out of a code entirely.
 */
export async function issueOtpCode(params: {
  userId: string;
  email: string;
  firstName?: string;
  phoneE164?: string;
  /** Controls the message copy only — the storage/verification mechanics are identical. */
  purpose?: "verify_email" | "login_mfa";
}): Promise<{ error: string | null }> {
  const code = generateOtpCode();
  const otpCodeHash = await bcrypt.hash(code, 10);
  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await User.findByIdAndUpdate(params.userId, { otpCodeHash, otpExpiresAt });
  await updateUserByMongoId(
    params.userId,
    { otp_code_hash: otpCodeHash, otp_expires_at: otpExpiresAt.toISOString() },
    params.email,
  );

  const purpose = params.purpose || "verify_email";

  // SMS first when we can — falls through to email if there's no number on
  // file, SMS isn't configured yet, or the send itself fails, so a
  // Clickatell hiccup never leaves someone with no way to get a code.
  if (params.phoneE164 && isSmsConfigured()) {
    const { error: smsError } = await sendSms({
      to: params.phoneE164,
      message: otpSmsText(code, purpose),
    });
    if (!smsError) return { error: null };
    console.warn("[issueOtpCode] SMS send failed, falling back to email:", smsError);
  }

  const { error } = await sendEmail({
    to: params.email,
    subject:
      purpose === "login_mfa"
        ? "Your 24/7 DigiHealth sign-in code"
        : "Your 24/7 DigiHealth verification code",
    html: otpVerificationEmailHtml({ code, firstName: params.firstName, purpose }),
  });

  return { error };
}

export const OTP_TTL_MINUTES_EXPORT = OTP_TTL_MINUTES;
