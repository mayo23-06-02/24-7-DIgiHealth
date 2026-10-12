import { Session, db, userByEmail, step, expect, expectStatus, done, ensureShared, BASE, tokenFor } from "./lib.mjs";

const PATIENT = "john.dlamini@example.com";
const DOCTOR = "mitchell@247digihealth.com";
const F = await ensureShared(PATIENT, DOCTOR);
const pUser = await userByEmail(PATIENT);
const dUser = await userByEmail(DOCTOR);

// Doctor must be linked to the patient (consultation), as the access rule requires.
const linked = await db("GET", "consultations", `patient_id=eq.${pUser.id}&practitioner_id=eq.${dUser.id}&select=id&limit=1`);
let consultationId = linked[0]?.id;
if (!consultationId) {
  const start = new Date(Date.now() - 86400e3);
  [{ id: consultationId }] = await db("POST", "consultations", "", {
    patient_id: pUser.id, practitioner_id: dUser.id, facility_id: F, status: "completed", type: "in_person",
    scheduled_start_time: start.toISOString(), scheduled_end_time: new Date(start.getTime() + 1800e3).toISOString(),
  });
}

const [adminF] = await db("GET", "hospital_admin_profiles", `facility_id=eq.${F}&select=user_id`);
const [adminOther] = await db("GET", "hospital_admin_profiles", `facility_id=neq.${F}&select=user_id&limit=1`);
const [otherPatient] = await db("GET", "users", `role=eq.patient&id=neq.${pUser.id}&email=like.*example.com&select=*&limit=1`);
const [otherDoctor] = await db("GET", "users", `role=eq.practitioner&id=neq.${dUser.id}&select=*&limit=1`);
const asUser = async (id) => new Session(await tokenFor((await db("GET", "users", `id=eq.${id}&select=*`))[0]));

const patient = await Session.as(PATIENT);
const doc = await Session.as(DOCTOR);
const body = {
  patientId: pUser.id, facilityId: F, consultationId, serviceDate: new Date().toISOString().slice(0, 10),
  dependantCode: "00", notes: "Follow-up in two weeks",
  items: [
    { tariffCode: "0190", icd10Code: "J06.9", description: "Consultation", quantity: 1, unitPrice: 520.5 },
    { tariffCode: "0308", icd10Code: "j06.9, R50.9", description: "Rapid strep test", quantity: 2, unitPrice: 99.995 },
  ],
};
let invoiceId;

console.log("medical-aid invoices");
await step("billing off at hospital -> 403 and no options", async () => {
  await db("PATCH", "facilities", `id=eq.${F}`, { medical_aid_billing_enabled: false });
  const o = await doc.call("GET", `/api/practitioner/invoices/options?patientId=${pUser.id}`);
  expectStatus(o, 200);
  expect(o.json.data.facilities.length === 0, "options should be empty");
  expectStatus(await doc.call("POST", "/api/practitioner/invoices", body), 403);
});
await step("billing on -> options list the hospital", async () => {
  await db("PATCH", "facilities", `id=eq.${F}`, { medical_aid_billing_enabled: true });
  const o = await doc.call("GET", `/api/practitioner/invoices/options?patientId=${pUser.id}`);
  expectStatus(o, 200);
  expect(o.json.data.facilities.some((f) => f.id === F), "hospital missing from options");
});
await step("invalid ICD-10 -> 400", async () => {
  const r = await doc.call("POST", "/api/practitioner/invoices", { ...body, items: [{ ...body.items[0], icd10Code: "XYZ" }] });
  expectStatus(r, 400);
});
await step("future service date -> 400", async () => {
  const r = await doc.call("POST", "/api/practitioner/invoices", { ...body, serviceDate: "2099-01-01" });
  expectStatus(r, 400);
});
await step("doctor not linked to patient -> 403", async () => {
  const other = new Session(await tokenFor(otherDoctor));
  expectStatus(await other.call("POST", "/api/practitioner/invoices", body), 403);
});
await step("patient cannot issue -> 403", async () => {
  expectStatus(await patient.call("POST", "/api/practitioner/invoices", body), 403);
});
await step("doctor issues invoice; server computes totals", async () => {
  const r = await doc.call("POST", "/api/practitioner/invoices", { ...body, total: 1 });
  expectStatus(r, 201);
  invoiceId = r.json.data.id;
  expect(/^INV-\d{4}-\d{6}$/.test(r.json.data.invoiceNumber), `bad number ${r.json.data.invoiceNumber}`);
  expect(r.json.data.total === 720.5 && r.json.data.items[1].unitPrice === 100, `total ${r.json.data.total}`);
  expect(r.json.data.items.length === 2 && r.json.data.items[1].icd10Code === "J06.9,R50.9", "items not normalised");
  expect(r.json.data.status === "issued", "status");
  const [row] = await db("GET", "medical_invoices", `id=eq.${invoiceId}&select=*`);
  expect(row.practitioner_name.startsWith("Dr "), "doctor snapshot");
  expect(row.facility_name, "facility snapshot");
});
await step("patient notified with download link", async () => {
  const rows = await db("GET", "notifications", `user_id=eq.${pUser.id}&type=eq.medical_invoice&select=data&order=created_at.desc&limit=5`);
  expect(rows.some((n) => n.data?.invoiceId === invoiceId && n.data?.pdfUrl === `/api/invoices/${invoiceId}/pdf`), "notification missing");
});
await step("patient sees invoice on billing list", async () => {
  const r = await patient.call("GET", "/api/patient/invoices");
  expectStatus(r, 200);
  expect(r.json.data.some((i) => i.id === invoiceId), "not listed for patient");
});
await step("doctor and hospital admin lists", async () => {
  const d = await doc.call("GET", "/api/practitioner/invoices");
  expect(d.json.data.some((i) => i.id === invoiceId), "not in doctor list");
  const h = await (await asUser(adminF.user_id)).call("GET", "/api/hospital/invoices");
  expectStatus(h, 200);
  expect(h.json.data.some((i) => i.id === invoiceId), "not in hospital list");
  const o = await (await asUser(adminOther.user_id)).call("GET", "/api/hospital/invoices");
  expect(!o.json.data.some((i) => i.id === invoiceId), "leaked to other hospital");
});
await step("PDF downloads for patient, doctor, own hospital admin", async () => {
  for (const s of [patient, doc, await asUser(adminF.user_id)]) {
    const r = await fetch(`${BASE}/api/invoices/${invoiceId}/pdf`, { headers: { cookie: `token=${s.token}` } });
    expect(r.status === 200, `status ${r.status}`);
    expect(r.headers.get("content-type") === "application/pdf", "content type");
    const buf = Buffer.from(await r.arrayBuffer());
    expect(buf.subarray(0, 4).toString() === "%PDF", "not a PDF");
  }
});
await step("PDF hidden from another patient and another hospital (404)", async () => {
  for (const s of [new Session(await tokenFor(otherPatient)), await asUser(adminOther.user_id)]) {
    const r = await fetch(`${BASE}/api/invoices/${invoiceId}/pdf`, { headers: { cookie: `token=${s.token}` } });
    expect(r.status === 404, `status ${r.status}`);
  }
  const anon = await fetch(`${BASE}/api/invoices/${invoiceId}/pdf`, { redirect: "manual" });
  expect(anon.status === 401 || anon.status === 307, `anon ${anon.status}`);
});
await step("status: submitted, then cancel refused, then paid", async () => {
  expectStatus(await doc.call("PATCH", `/api/practitioner/invoices/${invoiceId}`, { status: "submitted" }), 200);
  expectStatus(await doc.call("PATCH", `/api/practitioner/invoices/${invoiceId}`, { status: "cancelled" }), 409);
  expectStatus(await doc.call("PATCH", `/api/practitioner/invoices/${invoiceId}`, { status: "bogus" }), 400);
  const r = await doc.call("PATCH", `/api/practitioner/invoices/${invoiceId}`, { status: "paid" });
  expectStatus(r, 200);
  expect(r.json.data.status === "paid", "not paid");
});
await step("other doctor cannot change status (404)", async () => {
  const other = new Session(await tokenFor(otherDoctor));
  expectStatus(await other.call("PATCH", `/api/practitioner/invoices/${invoiceId}`, { status: "rejected" }), 404);
});
await step("cancel allowed from issued", async () => {
  const r = await doc.call("POST", "/api/practitioner/invoices", { ...body, consultationId: undefined });
  expectStatus(r, 201);
  expectStatus(await doc.call("PATCH", `/api/practitioner/invoices/${r.json.data.id}`, { status: "cancelled" }), 200);
});

done();
