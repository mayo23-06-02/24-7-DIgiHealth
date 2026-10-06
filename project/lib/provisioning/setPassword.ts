import { createHash, randomBytes } from "node:crypto";
import { SetPasswordToken } from "@/lib/models/ProvisioningTokens";
import { sendEmail } from "@/lib/email/resend";
import { setPasswordInviteEmailHtml } from "@/lib/email/templates/setPasswordInvite";

export const SET_PASSWORD_TTL_DAYS = 7;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Create a single-use token for the user. Only its SHA-256 hash is stored. */
export async function issueSetPasswordToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await SetPasswordToken.create({
    userId,
    tokenHash: hashToken(token),
    purpose: "set_password",
    expiresAt: new Date(Date.now() + SET_PASSWORD_TTL_DAYS * 86400_000),
  });
  return token;
}

/** Look up a live (unused, unexpired) token. Returns the row or null. */
export async function findLiveToken(token: string) {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const row = await SetPasswordToken.findOne({
    tokenHash: hashToken(token),
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });
  return row;
}

/** Email the onboarding link. Returns an error string, or null on success. */
export async function sendOnboardingEmail(params: {
  to: string;
  firstName: string;
  facilityName: string;
  kind: "patient" | "doctor";
  fileNumber: string;
  token: string;
  origin: string;
}): Promise<string | null> {
  const role = params.kind === "doctor" ? "practitioner" : "patient";
  const url = `${params.origin}/register/${role}?setup=${params.token}`;
  const { error } = await sendEmail({
    to: params.to,
    subject: `Complete your ${params.kind === "doctor" ? "professional" : "health"} profile: ${params.facilityName} has registered you on 24/7 Digi-Health`,
    html: setPasswordInviteEmailHtml({
      firstName: params.firstName,
      facilityName: params.facilityName,
      kind: params.kind,
      fileNumber: params.fileNumber,
      setPasswordUrl: url,
      expiresInDays: SET_PASSWORD_TTL_DAYS,
    }),
  });
  return error ? String(error) : null;
}

/** Retire any unused tokens for the user and email a fresh link. Returns an error string or null. */
export async function resendOnboarding(params: {
  user: { id: string; email: string; firstName: string };
  facilityName: string;
  kind: "patient" | "doctor";
  fileNumber: string;
  origin: string;
}): Promise<string | null> {
  await SetPasswordToken.updateMany(
    { userId: params.user.id, usedAt: { $exists: false } },
    { $set: { usedAt: new Date() } },
  );
  const token = await issueSetPasswordToken(params.user.id);
  return sendOnboardingEmail({
    to: params.user.email,
    firstName: params.user.firstName,
    facilityName: params.facilityName,
    kind: params.kind,
    fileNumber: params.fileNumber,
    token,
    origin: params.origin,
  });
}
