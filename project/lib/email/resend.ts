/**
 * Compatibility shim — the app switched its email provider to Postmark
 * (see lib/email/postmark.ts) because Resend's default onboarding@resend.dev
 * sender can only deliver to the Resend account's own address, which broke
 * sending to arbitrary real recipients. Existing imports of this module
 * keep working unchanged.
 */
export { sendEmail, isPostmarkConfigured as isResendConfigured } from "./postmark";
