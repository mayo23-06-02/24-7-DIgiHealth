import bcrypt from "bcryptjs";
import User from "@/lib/models/User";
import { sendEmail } from "@/lib/email/resend";
import { otpVerificationEmailHtml } from "@/lib/email/templates/otpVerification";
import { randomInt } from "node:crypto";

const OTP_TTL_MINUTES = 10;

function generateOtpCode(): string {
  return String(randomInt(100000, 1000000));
}

/** Generates, stores (hashed), and emails a fresh 6-digit verification code. */
export async function issueOtpCode(params: {
  userId: string;
  email: string;
  firstName?: string;
  /** Controls the email copy only — the storage/verification mechanics are identical. */
  purpose?: "verify_email" | "login_mfa";
}): Promise<{ error: string | null }> {
  const code = generateOtpCode();
  const otpCodeHash = await bcrypt.hash(code, 10);
  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await User.findByIdAndUpdate(params.userId, { otpCodeHash, otpExpiresAt });

  const purpose = params.purpose || "verify_email";
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
