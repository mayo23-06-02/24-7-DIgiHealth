import { escapeHtml, renderEmail } from "../layout";

/** "Your hospital registered you on 24/7 Digi-Health" invitation with the profile setup link. */
export function setPasswordInviteEmailHtml(params: {
  firstName: string;
  facilityName: string;
  kind: "patient" | "doctor";
  fileNumber: string;
  setPasswordUrl: string;
  expiresInDays: number;
}): string {
  const { firstName, facilityName, kind, fileNumber, setPasswordUrl, expiresInDays } = params;
  const isDoctor = kind === "doctor";
  const profile = isDoctor ? "professional profile" : "health profile";
  return renderEmail({
    preheader: `${facilityName} has registered you on 24/7 Digi-Health. Complete your ${profile} to get started.`,
    eyebrow: isDoctor ? "Practitioner invitation" : "Patient invitation",
    title: `Complete your ${profile}`,
    icon: isDoctor ? "&#129658;" : "&#10084;&#65039;",
    greeting: isDoctor ? `Dear Dr. ${escapeHtml(firstName)},` : `Dear ${escapeHtml(firstName)},`,
    paragraphs: [
      `<strong>${escapeHtml(facilityName)}</strong> has successfully registered you as ${isDoctor ? "a physician" : "a patient"} on the 24/7 Digi-Health platform.`,
      `To activate your account, please use the button below to complete your ${profile}. Kindly review your current information, update any missing details, and set up a secure password to begin using the platform.`,
    ],
    details: [
      ["Registered by", facilityName],
      ["Your file number", fileNumber],
    ],
    cta: { label: `Complete your ${profile}`, url: setPasswordUrl },
    notes: [`This link expires in ${expiresInDays} days. If you were not expecting this email, you can safely ignore it.`],
  });
}
