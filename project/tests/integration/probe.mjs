// Calls the remaining routes with realistic ids and minimal bodies; any 5xx is a failure
// (4xx is expected for many of these with minimal input and is only printed for review).
import { Session, db, userByEmail, step, expect, done } from "./lib.mjs";

const patient = await Session.as("john.dlamini@example.com");
const doc = await Session.as("mitchell@247digihealth.com");
const hosp = await Session.as("admin@milpark.netcare.co.za");
const mega = await Session.as("mega@247digihealth.com");
const anon = new Session(null);
const pU = await userByEmail("john.dlamini@example.com");
const dU = await userByEmail("mitchell@247digihealth.com");
const [cons] = await db("GET", "consultations", `patient_id=eq.${pU.id}&practitioner_id=eq.${dU.id}&select=id,status&limit=1`);
const [conv] = await db("GET", "conversations", `patient_id=eq.${pU.id}&select=id,consultation_id&limit=1`);
const [fac] = await db("GET", "facilities", "select=id&limit=1");
const [staff] = await db("GET", "staff", `facility_id=eq.${fac.id}&role=eq.doctor&select=id,user_id&limit=1`);
const [rev] = await db("GET", "reviews", "select=id&limit=1");
const [call] = await db("GET", "calls", "select=id&limit=1").catch(() => [undefined]);
const [media] = await db("GET", "media_assets", "select=id&limit=1");
const [allergyDoc] = await db("GET", "medical_documents", "select=id&limit=1");

const probes = [
  [mega, "GET", `/api/admin/facilities/${fac.id}`], [mega, "PATCH", `/api/admin/facilities/${fac.id}`, { isOpen: true }],
  [mega, "GET", `/api/admin/users/${pU.id}`], [mega, "PATCH", `/api/admin/users/${pU.id}`, { firstName: "John" }],
  [mega, "PATCH", "/api/admin/finance", { action: "noop" }],
  [anon, "GET", "/api/articles"], [anon, "GET", "/api/health-tips"], [anon, "GET", "/api/time"],
  [patient, "GET", `/api/bookings/${cons?.id}`], [patient, "GET", `/api/bookings/slots?practitionerId=${dU.id}&date=${new Date(Date.now() + 86400e3).toISOString().slice(0, 10)}`],
  [anon, "GET", "/api/bookings/expire"],
  [patient, "GET", `/api/chat/call/status/${cons?.id}`], [patient, "GET", `/api/chat/call/status/direct/${conv?.id}`],
  [patient, "GET", `/api/chat/conversations/direct/${conv?.id}`], [patient, "GET", `/api/chat/messages/${cons?.id}`],
  [patient, "GET", `/api/chat/report/${conv?.id}`],
  [patient, "POST", "/api/conversations", { practitionerId: dU.id }],
  [patient, "GET", `/api/consultations/${cons?.id}/presence`], [patient, "PATCH", `/api/consultations/${cons?.id}`, { chiefComplaint: "updated" }],
  [doc, "POST", `/api/consultations/${cons?.id}/approve`, {}], [doc, "POST", `/api/consultations/${cons?.id}/decline`, {}],
  [anon, "GET", "/api/cron/reminders", undefined, { authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` }],
  [hosp, "GET", `/api/hospital/doctors/${staff?.id}/profile`], [hosp, "GET", `/api/hospital/reports/financial`],
  [hosp, "GET", "/api/hospital/reports/patients"], [hosp, "GET", "/api/hospital/reports/appointments"],
  [hosp, "PATCH", `/api/hospital/reviews/${rev?.id}`, { reply: "thanks" }],
  [hosp, "POST", "/api/hospital/staff/invite", { email: `invitee.${Date.now()}@example.com`, department: "ER", role: "doctor" }],
  [hosp, "DELETE", `/api/hospital/staff?id=${staff?.id}`],
  [patient, "GET", `/api/patient/family/${pU.id}/appointments`], [patient, "GET", `/api/patient/family/${pU.id}/health-record`],
  [patient, "POST", `/api/patient/family/${pU.id}/switch`, {}], [patient, "POST", "/api/patient/family/switch-back", {}],
  [patient, "POST", "/api/patient/family/accept", { token: "nope" }],
  [patient, "PATCH", `/api/patient/family/${pU.id}`, { isMinor: false }], [patient, "DELETE", `/api/patient/family/${pU.id}`],
  [patient, "POST", "/api/patient/health-record/allergies", { allergen: "Latex", severity: "mild", reaction: "rash" }],
  [patient, "DELETE", "/api/patient/health-record/allergies?allergen=Latex"],
  [patient, "POST", `/api/patient/my-doctors/${dU.id}`, {}], [patient, "DELETE", `/api/patient/my-doctors/${dU.id}`],
  [patient, "GET", `/api/patient/practitioners/${dU.id}`],
  [patient, "PUT", `/api/patient/appointments/${cons?.id}`, { reason: "r" }], [patient, "PATCH", `/api/patient/appointments/${cons?.id}`, { status: "cancelled" }],
  [patient, "POST", "/api/patient/prescriptions", { medicationName: "X" }],
  [doc, "POST", "/api/practitioner/appointments", { patientId: pU.id, scheduledStart: new Date(Date.now() + 6 * 86400e3).toISOString(), scheduledEnd: new Date(Date.now() + 6 * 86400e3 + 3600e3).toISOString() }],
  [doc, "PATCH", `/api/practitioner/appointments/${cons?.id}`, { status: "scheduled" }],
  [doc, "PATCH", `/api/practitioner/consultations/${cons?.id}`, { status: "scheduled" }],
  [doc, "GET", `/api/practitioner/consultations/${cons?.id}/soap`],
  [doc, "GET", `/api/practitioner/patients/${pU.id}/ai-diagnosis`], [doc, "GET", `/api/practitioner/patients/${pU.id}/health-record`],
  [doc, "GET", `/api/practitioner/patients/${pU.id}/report`], [doc, "PUT", `/api/practitioner/patients/${pU.id}/risk`, { score: 4, color: "orange" }],
  [doc, "POST", `/api/practitioner/patients/${pU.id}/documents`, { type: "note", url: "https://example.com/x.pdf", name: "x" }],
  [doc, "POST", "/api/practitioner/patients/export", {}],
  [doc, "DELETE", `/api/practitioner/patients/${pU.id}`],
  [anon, "GET", `/api/practitioners/${dU.id}`], [patient, "GET", `/api/practitioners/${dU.id}/reviews`], [anon, "GET", "/api/practitioners/available"],
  [patient, "POST", `/api/practitioners/${dU.id}/reviews`, { rating: 5, comment: "nice" }],
  [patient, "GET", "/api/media"], [patient, "GET", `/api/media/${media?.id}`], [patient, "GET", `/api/media/${media?.id}/url`],
  [patient, "POST", "/api/media/sign-upload", { fileName: "a.png", mimeType: "image/png", fileSize: 100 }],
  [patient, "POST", "/api/user/documents", { type: "id", fileUrl: "https://example.com/a.pdf", name: "a" }],
  [patient, "PATCH", "/api/notifications", {}], [patient, "PUT", "/api/user/password", { currentPassword: "Password123!", newPassword: "Password123!x" }],
  [patient, "POST", "/api/billing/export", {}], [patient, "PATCH", "/api/billing", { action: "noop" }],
  [anon, "POST", "/api/auth/otp/send", { email: "john.dlamini@example.com" }], [anon, "POST", "/api/auth/mfa/resend", { email: "john.dlamini@example.com" }],
  [patient, "POST", "/api/auth/refresh", {}], [anon, "POST", "/api/auth/logout", {}],
  [anon, "POST", "/api/invites/family/lookup", { token: "x" }], [anon, "GET", "/api/invites/abc"], [anon, "GET", "/api/invites/admin/abc"], [anon, "GET", "/api/invites/family/abc"],
  [patient, "GET", "/api/ably/auth"], [patient, "POST", "/api/ably/auth", {}],
  [anon, "POST", "/api/contact/practitioner-inquiry", { name: "n", email: "a@b.co", message: "m" }],
];

console.log("probing remaining routes (5xx = failure)");
const warnings = [];
for (const [sess, method, path, body, hdr] of probes) {
  await step(`${method} ${path.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, "<id>")}`, async () => {
    const r = await sess.call(method, path, body, hdr ?? {});
    if (r.status >= 500) throw new Error(`${r.status} ${r.text.slice(0, 260)}`);
    if (r.status >= 400) warnings.push(`${r.status} ${method} ${path.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, "<id>")} ${r.text.slice(0, 110).replace(/\s+/g, " ")}`);
  });
}
console.log("\n4xx responses (review):\n  " + warnings.join("\n  "));
done();
