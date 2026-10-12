import { Session, db, userByEmail, step, expect, expectStatus, done, ensureShared, tokenFor } from "./lib.mjs";

const PATIENT = "john.dlamini@example.com";
const DOCTOR = "mitchell@247digihealth.com";
const F = await ensureShared(PATIENT, DOCTOR);
const pUser = await userByEmail(PATIENT);
const dUser = await userByEmail(DOCTOR);
const [adminF] = await db("GET", "hospital_admin_profiles", `facility_id=eq.${F}&select=user_id`);
const [adminUser] = await db("GET", "users", `id=eq.${adminF.user_id}&select=*`);
const admin = new Session(await tokenFor(adminUser));
const mega = await Session.as("mega@247digihealth.com");
const patient = await Session.as(PATIENT);
const doc = await Session.as(DOCTOR);
const flags = async () => (await db("GET", "facilities", `id=eq.${F}&select=in_person_enabled,medical_aid_billing_enabled`))[0];

function slot() {
  const start = new Date(Date.now() + (5 + Math.floor(Math.random() * 80)) * 86400e3);
  start.setUTCHours(6 + Math.floor(Math.random() * 10), Math.random() < 0.5 ? 0 : 30, 0, 0);
  return { scheduledStart: start.toISOString(), scheduledEnd: new Date(start.getTime() + 1800e3).toISOString() };
}
let visitId;

console.log("hospital settings");
await step("platform admin toggles both settings", async () => {
  expectStatus(await mega.call("PATCH", `/api/admin/facilities/${F}`, { inPersonEnabled: true, medicalAidBillingEnabled: true }), 200);
  const f = await flags();
  expect(f.in_person_enabled === true && f.medical_aid_billing_enabled === true, JSON.stringify(f));
});
await step("hospital admin toggles from facility settings", async () => {
  expectStatus(await admin.call("PUT", "/api/hospital/facility", { inPersonEnabled: false, medicalAidBillingEnabled: false }), 200);
  const f = await flags();
  expect(f.in_person_enabled === false && f.medical_aid_billing_enabled === false, JSON.stringify(f));
});
await step("admin facility list exposes the settings", async () => {
  const r = await mega.call("GET", "/api/admin/facilities");
  expectStatus(r, 200);
  const list = r.json.data ?? r.json.facilities ?? r.json;
  const row = (Array.isArray(list) ? list : []).find((x) => (x.id ?? x._id) === F);
  expect(row && row.inPersonEnabled === false && "medicalAidBillingEnabled" in row, "settings missing in list");
});

console.log("in-person booking");
await step("options: in person off", async () => {
  const r = await patient.call("GET", `/api/bookings/options?practitionerId=${dUser.id}`);
  expectStatus(r, 200);
  const f = r.json.data?.facilities ?? r.json.facilities;
  expect(f.some((x) => x.id === F && x.inPersonEnabled === false), JSON.stringify(f));
});
await step("in-person booking refused while off (400)", async () => {
  const r = await patient.call("POST", "/api/bookings", { practitionerId: dUser.id, ...slot(), reason: "visit", type: "in_person" });
  expectStatus(r, 400);
  expect(/in-person/i.test(r.json?.error ?? ""), r.text);
});
await step("unknown method refused (400)", async () => {
  expectStatus(await patient.call("POST", "/api/bookings", { practitionerId: dUser.id, ...slot(), type: "carrier_pigeon" }), 400);
});
await step("voice booking still works", async () => {
  expectStatus(await patient.call("POST", "/api/bookings", { practitionerId: dUser.id, ...slot(), reason: "voice", type: "voice" }), 200, 201);
});
await step("in-person booking accepted once on", async () => {
  await db("PATCH", "facilities", `id=eq.${F}`, { in_person_enabled: true });
  const o = await patient.call("GET", `/api/bookings/options?practitionerId=${dUser.id}`);
  expect((o.json.data?.facilities ?? o.json.facilities).some((x) => x.id === F && x.inPersonEnabled), "options not updated");
  const r = await patient.call("POST", "/api/bookings", { practitionerId: dUser.id, ...slot(), reason: "visit", type: "in_person", facilityId: F });
  expectStatus(r, 200, 201);
  visitId = r.json.data.id;
  const [c] = await db("GET", "consultations", `id=eq.${visitId}&select=type,facility_id`);
  expect(c.type === "in_person" && c.facility_id === F, JSON.stringify(c));
});
await step("booking list carries the hospital for the visit", async () => {
  const r = await patient.call("GET", "/api/bookings?tab=requests");
  const b = r.json.data.find((x) => x.id === visitId);
  expect(b && b.facilityName, "facilityName missing");
});
await step("doctor accepts; joining a call for the visit is refused (400)", async () => {
  expectStatus(await doc.call("PATCH", `/api/bookings/${visitId}`, { status: "scheduled" }), 200);
  const r = await patient.call("POST", `/api/consultations/${visitId}/session`, {});
  expectStatus(r, 400);
  expect(r.json?.code === "IN_PERSON", r.text);
});

done();
