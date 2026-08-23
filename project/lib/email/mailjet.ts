/**
 * Compatibility shim — the app switched its email provider to EmailJS
 * (see lib/email/emailjs.ts). Existing imports of this module keep
 * working unchanged.
 */
export { sendEmail, isEmailJSConfigured as isMailjetConfigured } from "./emailjs";
