import bcrypt from "bcryptjs";
import User from "@/lib/models/User";
import { sendEmail } from "@/lib/email/resend";
import { otpVerificationEmailHtml } from "@/lib/email/templates/otpVerification";
import { updateUserByMongoId } from "@/lib/postgres/users";

const OTP_TTL_MINUTES = 10;

function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Generates, stores (hashed), and emails a fresh 6-digit verification code. */
export async function issueOtpCode(params: {
  userId: string;
  email: string;
  firstName?: string;
}): Promise<{ error: string | null }> {
  const code = generateOtpCode();
  const otpCodeHash = await bcrypt.hash(code, 10);
  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await User.findByIdAndUpdate(params.userId, { otpCodeHash, otpExpiresAt });
  await updateUserByMongoId(params.userId, {
    otp_code_hash: otpCodeHash,
    otp_expires_at: otpExpiresAt.toISOString(),
  });

  const { error } = await sendEmail({
    to: params.email,
    subject: "Your 24/7 DigiHealth verification code",
    html: otpVerificationEmailHtml({ code, firstName: params.firstName }),
  });

  return { error };
}

export const OTP_TTL_MINUTES_EXPORT = OTP_TTL_MINUTES;
