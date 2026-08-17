/**
 * Compatibility shim — the app switched its email provider to Mailjet
 * (see lib/email/mailjet.ts). Existing imports of this module
 * keep working unchanged.
 */
export { sendEmail, isMailjetConfigured as isResendConfigured } from "./mailjet";
