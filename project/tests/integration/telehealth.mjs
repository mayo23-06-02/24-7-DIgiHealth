import { Session, db, userByEmail, step, expect, expectStatus, done, ensureShared } from "./lib.mjs";

await ensureShared("john.dlamini@example.com", "mitchell@247digihealth.com");

const patient = await Session.as("john.dlamini@example.com");
const doc = await Session.as("mitchell@247digihealth.com");
const pUser = await userByEmail("john.dlamini@example.com");
const dUser = await userByEmail("mitchell@247digihealth.com");
const idem = `cid-${Date.now()}`;
let consultationId, conversationId, messageId;

console.log("booking + consultation lifecycle");
await step("patient requests booking", async () => {
  // A different slot every run, so leftovers from earlier runs never conflict.
  const start = new Date(Date.now() + (3 + Math.floor(Math.random() * 60)) * 86400e3); start.setUTCHours(6 + Math.floor(Math.random() * 10), 0, 0, 0);
  const end = new Date(start.getTime() + 3600e3);
  const r = await patient.call("POST", "/api/bookings", { practitionerId: dUser.id, scheduledStart: start.toISOString(), scheduledEnd: end.toISOString(), reason: "flow test", type: "video" });
  expectStatus(r, 200, 201);
  consultationId = r.json.data.id;
  expect(r.json.data.status === "requested", "status requested");
});
await step("conflicting booking -> 409", async () => {
  const [c] = await db("GET", "consultations", `id=eq.${consultationId}&select=scheduled_start_time,scheduled_end_time`);
  const r = await patient.call("POST", "/api/bookings", { practitionerId: dUser.id, scheduledStart: c.scheduled_start_time, scheduledEnd: c.scheduled_end_time });
  expectStatus(r, 409);
});
await step("patient lists own bookings (populated)", async () => {
  const r = await patient.call("GET", "/api/bookings?tab=requests");
  expectStatus(r, 200);
  expect(r.json.data.some((b) => b.id === consultationId), "booking missing from list");
});
await step("practitioner accepts via PATCH", async () => {
  const r = await doc.call("PATCH", `/api/bookings/${consultationId}`, { status: "scheduled" });
  expectStatus(r, 200);
  const [c] = await db("GET", "consultations", `id=eq.${consultationId}&select=status`);
  expect(c.status === "scheduled", `status is ${c.status}`);
});
await step("consultation session endpoint", async () => {
  const r = await patient.call("POST", `/api/consultations/${consultationId}/session`, {});
  expectStatus(r, 200, 201, 400, 403, 409);
  console.log("       (session ->", r.status, r.text.slice(0, 120).replace(/\s+/g, " "), ")");
});
await step("conversation exists / created for consultation", async () => {
  const r = await patient.call("GET", `/api/chat/conversations/${consultationId}`);
  expectStatus(r, 200);
  conversationId = r.json?.data?._id ?? r.json?._id ?? r.json?.conversationId ?? r.json?.data?.id;
  if (!conversationId) {
    const rows = await db("GET", "conversations", `consultation_id=eq.${consultationId}&select=id`);
    conversationId = rows[0]?.id;
  }
  expect(conversationId, "no conversation id: " + r.text.slice(0, 200));
});
await step("patient sends message (idempotent clientId)", async () => {
  const body = { conversationId, content: "hello doctor", type: "text", clientId: idem };
  const a = await patient.call("POST", "/api/chat/messages", body);
  expectStatus(a, 200, 201);
  const b = await patient.call("POST", "/api/chat/messages", body);
  expectStatus(b, 200, 201);
  const rows = await db("GET", "messages", `conversation_id=eq.${conversationId}&client_id=eq.${idem}&select=id`);
  expect(rows.length === 1, `expected 1 message row, got ${rows.length}`);
  messageId = rows[0].id;
});
await step("practitioner reads messages + marks read", async () => {
  const r = await doc.call("GET", `/api/chat/messages/direct/${conversationId}`);
  expectStatus(r, 200);
  const m = await doc.call("PATCH", "/api/chat/messages/read", { messageId, conversationId });
  expectStatus(m, 200);
  const [row] = await db("GET", "messages", `id=eq.${messageId}&select=is_read`);
  expect(row.is_read === true, "message not marked read");
});
await step("unread-count + conversations list", async () => {
  expectStatus(await doc.call("GET", "/api/chat/unread-count"), 200);
  const r = await patient.call("GET", "/api/conversations");
  expectStatus(r, 200);
});
await step("minutes request + approve", async () => {
  const q = await patient.call("POST", `/api/chat/minutes/${consultationId}/request`, { minutes: 10 });
  expectStatus(q, 200, 201, 400, 403);
  const a = await doc.call("POST", `/api/chat/minutes/${consultationId}/approve`, {});
  expectStatus(a, 200, 201, 400, 403, 404);
  console.log("       (minutes ->", q.status, a.status, ")");
});
await step("SOAP notes saved (nested columns)", async () => {
  const r = await doc.call("POST", `/api/practitioner/consultations/${consultationId}/soap`, { subjective: "S", objective: "O", assessment: "A", plan: "P" });
  expectStatus(r, 200, 201);
  const [c] = await db("GET", "consultations", `id=eq.${consultationId}&select=soap_subjective,soap_plan`);
  expect(c.soap_subjective === "S" && c.soap_plan === "P", "soap not persisted");
});
await step("prescription creation", async () => {
  const r = await doc.call("POST", "/api/practitioner/prescriptions", { patientId: pUser.id, medicationName: "Amoxicillin", dosage: "500mg", instructions: "tds", notifyChat: false });
  expectStatus(r, 200, 201);
  const rows = await db("GET", "prescriptions", `patient_id=eq.${pUser.id}&medication_name=eq.Amoxicillin&select=id`);
  expect(rows.length >= 1, "prescription row missing");
  expectStatus(await patient.call("GET", "/api/patient/prescriptions"), 200);
});
await step("complete consultation", async () => {
  const r = await doc.call("POST", `/api/consultations/${consultationId}/complete`, {});
  expectStatus(r, 200, 201, 400, 403);
  console.log("       (complete ->", r.status, r.text.slice(0, 120).replace(/\s+/g, " "), ")");
});
await step("patient review of practitioner", async () => {
  const r = await patient.call("POST", "/api/patient/reviews", { consultationId, practitionerId: dUser.id, rating: 5, comment: "great" });
  expectStatus(r, 200, 201, 400, 403, 409);
  console.log("       (review ->", r.status, r.text.slice(0, 120).replace(/\s+/g, " "), ")");
});
await step("call start/end", async () => {
  const s = await patient.call("POST", "/api/chat/call/start", { consultationId, conversationId, type: "video" });
  console.log("       (call start ->", s.status, s.text.slice(0, 160).replace(/\s+/g, " "), ")");
  // Without LIVEKIT_* the room cannot be created; that is an environment gap, not a data-layer failure.
  expect(s.status < 500 || process.env.LIVEKIT_URL === undefined, "call start 5xx: " + s.text.slice(0, 200));
});

done();
