import { Session, db, step, expect, expectStatus, done } from "./lib.mjs";

const stamp = Date.now();
const mega = await Session.as("mega@247digihealth.com");
const sup = await Session.as("super@247digihealth.com");
const patient = await Session.as("john.dlamini@example.com");
let id;

console.log("facility CRUD");
await step("create validates input", async () => {
  expectStatus(await mega.call("POST", "/api/admin/facilities", { name: "x" }), 400);
  expectStatus(await mega.call("POST", "/api/admin/facilities", { name: `Test Clinic ${stamp}`, facilityType: "Nope", address: { city: "Pretoria" } }), 400);
});
await step("patient cannot create", async () => {
  expectStatus(await patient.call("POST", "/api/admin/facilities", { name: `Bad ${stamp}`, facilityType: "Private", address: { city: "X" } }), 401, 403);
});
await step("create facility", async () => {
  const r = expectStatus(await mega.call("POST", "/api/admin/facilities", {
    name: `Test Clinic ${stamp}`, facilityType: "Private", address: { city: "Pretoria", province: "Gauteng", street: "1 Main" },
    contactInfo: { email: "clinic@example.com", phone: "0123456789" }, bedCapacity: { total: 20, icuAvailable: 2 }, specialties: "Cardiology, GP", fileNumberPrefix: "tc",
  }), 201);
  id = r.json.data.id;
  const [row] = await db("GET", "facilities", `id=eq.${id}&select=*`);
  expect(row.address_city === "Pretoria" && row.bed_total === 20 && row.bed_general_available === 20 && row.file_number_prefix === "TC", "row saved");
  expect(row.specialties.length === 2, "specialties parsed");
});
await step("duplicate name -> 409", async () => {
  expectStatus(await mega.call("POST", "/api/admin/facilities", { name: `test clinic ${stamp}`, facilityType: "Private", address: { city: "Pretoria" } }), 409);
});
await step("appears in list", async () => {
  const r = expectStatus(await mega.call("GET", "/api/admin/facilities?search=Test%20Clinic%20" + stamp), 200);
  expect(r.json.data.some((f) => f.id === id), "listed");
});
await step("update fields", async () => {
  expectStatus(await mega.call("PATCH", `/api/admin/facilities/${id}`, { name: `Test Clinic ${stamp} B`, address: { city: "Johannesburg" }, isOpen: false, bedCapacity: { total: 30 } }), 200);
  const [row] = await db("GET", "facilities", `id=eq.${id}&select=*`);
  expect(row.name.endsWith(" B") && row.address_city === "Johannesburg" && row.address_province === "Gauteng" && row.is_open === false && row.bed_total === 30, "updated, untouched fields kept");
});
await step("super admin cannot rename or delete", async () => {
  expectStatus(await sup.call("PATCH", `/api/admin/facilities/${id}`, { name: "Renamed" }), 403);
  expectStatus(await sup.call("DELETE", `/api/admin/facilities/${id}`), 403);
  expectStatus(await sup.call("PATCH", `/api/admin/facilities/${id}`, { isOpen: true }), 200);
});
await step("delete blocked while in use, allowed when empty", async () => {
  const [p] = await db("GET", "users", "role=eq.patient&select=id&limit=1");
  const [fp] = await db("POST", "facility_patients", "", { facility_id: id, patient_id: p.id, file_number: `T-${stamp}`, status: "active" });
  const blocked = await mega.call("DELETE", `/api/admin/facilities/${id}`);
  expectStatus(blocked, 409);
  await db("DELETE", "facility_patients", `id=eq.${fp.id}`);
  expectStatus(await mega.call("DELETE", `/api/admin/facilities/${id}`), 200);
  expect((await db("GET", "facilities", `id=eq.${id}&select=id`)).length === 0, "gone");
  expectStatus(await mega.call("DELETE", `/api/admin/facilities/${id}`), 404);
});
done();
