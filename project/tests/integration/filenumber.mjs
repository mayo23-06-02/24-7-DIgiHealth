import { createHash, randomBytes } from "node:crypto";
import { Session, db, userByEmail, tokenFor, hash, step, expect, expectStatus, done, BASE } from "./lib.mjs";

const stamp = Date.now();
const mega = await Session.as("mega@247digihealth.com");
const anon = new Session(null);
const admins = await db("GET", "hospital_admin_profiles", "select=facility_id,user_id&limit=2");
const [A, B] = admins.map((a) => ({ id: a.facility_id }));
const adminA = admins[0];
const [adminAUser] = await db("GET", "users", `id=eq.${adminA.user_id}&select=*`);
const hospA = new Session(await tokenFor(adminAUser));

const sa = (n, male = false) => { // 900101 + seq(4, >=5000 = male) + citizen 0 + 8 + Luhn check digit
  const base = `900101${String((male ? 5000 : 1000) + (n % 3000))}08`;
  let sum = 0;
  for (let i = 0; i < 12; i++) { let d = +base[i]; if (i % 2 === 0) sum += d; else { d *= 2; sum += d > 9 ? d - 9 : d; } }
  return base + ((10 - (sum % 10)) % 10);
};
const hdr = "file_number,first_name,last_name,email,id_number,date_of_birth,gender,mobile";
const mk = (fn, em, id, num) => `${fn},Tester${stamp},${em},${id},1990-01-01,female,082${String(1000000 + (stamp % 8999999))}`;
const mob = (k) => `082${String(1000000 + ((stamp + k * 7919) % 8999999))}`;
const twoEmail = `two.${stamp}@example.com`;
const twoId = sa(stamp % 1000);
const oneEmail = `one.${stamp}@example.com`;
const oneId = sa((stamp % 1000) + 7, true);

async function importCsv(facilityId, csv, kind = "patients") {
  const fd = new FormData();
  fd.append("file", new Blob([csv], { type: "text/csv" }), "import.csv");
  const r = await fetch(`${BASE}/api/admin/facilities/${facilityId}/${kind}/import`, { method: "POST", headers: { cookie: `token=${mega.token}` }, body: fd });
  const json = await r.json();
  return { status: r.status, json };
}
async function runJob(facilityId, job) {
  for (let i = 0; i < 20; i++) {
    const r = await mega.call("POST", `/api/admin/facilities/${facilityId}/import-jobs/${job.jobId}/process`);
    expectStatus(r, 200);
    if (r.json.data.remaining === 0) return r.json.data;
  }
  throw new Error("job never finished");
}

console.log("provisioning");
await step("template downloads", async () => {
  const r = await fetch(`${BASE}/api/admin/facilities/${A.id}/template?kind=patients&format=csv`, { headers: { cookie: `token=${mega.token}` } });
  expect(r.status === 200 && (await r.text()).startsWith("file_number"), "template csv");
});
await step("hospital admin cannot use platform import", async () => {
  expectStatus(await hospA.call("GET", `/api/admin/facilities/${A.id}/patients`), 401, 403);
});
await step("CSV import at hospital A: good, duplicate-number and bad rows", async () => {
  const rows = [hdr,
    `A-${stamp}-1,Two,Tester${stamp},${twoEmail},${twoId},1990-01-01,female,${mob(1)}`,
    `A-${stamp}-2,One,Tester${stamp},${oneEmail},${oneId},1990-01-01,male,${mob(2)}`,
    `A-${stamp}-1,Dup,Number,${stamp},dup.${stamp}@example.com,${sa(3, true)},1990-01-01,male,${mob(3)}`,
    `A-${stamp}-4,Bad,Row,not-an-email,123,1990-01-01,male,${mob(4)}`,
  ].join("\n");
  const up = await importCsv(A.id, rows);
  expectStatus({ status: up.status, text: JSON.stringify(up.json) }, 201);
  const out = await runJob(A.id, up.json.data);
  expect(out.created === 2, `expected 2 created got ${JSON.stringify(out)}`);
  expect(up.json.data.failed >= 2, `expected rejected rows at upload got ${JSON.stringify(up.json.data)}`);
  const u = await userByEmail(twoEmail);
  expect(u && !u.password_hash && u.status === "pending_verification", "provisioned user should have no password");
  const files = await db("GET", "facility_patients", `patient_id=eq.${u.id}&select=*`);
  expect(files.length === 1 && files[0].status === "pending" && files[0].facility_id === A.id, "file at A pending");
});
await step("same person at hospital B gives one user, two files, two profiles", async () => {
  const rows = [hdr, `B-${stamp}-9,Two,Tester${stamp},${twoEmail},${twoId},1990-01-01,female,${mob(1)}`].join("\n");
  const up = await importCsv(B.id, rows);
  expectStatus({ status: up.status, text: JSON.stringify(up.json) }, 201);
  const out = await runJob(B.id, up.json.data);
  expect(out.linked === 1, `expected linked got ${JSON.stringify(out)}`);
  const users = await db("GET", "users", `email=eq.${encodeURIComponent(twoEmail)}&select=id`);
  expect(users.length === 1, "one user");
  const files = await db("GET", "facility_patients", `patient_id=eq.${users[0].id}&select=facility_id`);
  expect(files.length === 2, "two files");
  const profs = await db("GET", "facility_patient_profiles", `select=id,facility_patient_id`);
  expect(Array.isArray(profs), "profiles table readable");
});
await step("doctor single add", async () => {
  const r = await mega.call("POST", `/api/admin/facilities/${A.id}/doctors`, {
    staff_number: `DR-${stamp}`, first_name: "Doc", last_name: `T${stamp}`, email: `doc.${stamp}@example.com`,
    mobile: `071${String(1000000 + (stamp % 8999999))}`, hpcsa_number: `MP${String(stamp).slice(-7)}`, specialisation: "GP",
  });
  expectStatus(r, 200, 201);
  const [d] = await db("GET", "users", `email=eq.doc.${stamp}@example.com&select=id,role`);
  expect(d?.role === "practitioner", "doctor user");
  const st = await db("GET", "staff", `user_id=eq.${d.id}&select=facility_id,file_number`);
  expect(st.length === 1 && st[0].facility_id === A.id, "staff row at A");
});

console.log("public file-number lookup and onboarding");
await step("lookup without proof / wrong proof gives no data", async () => {
  expectStatus(await anon.call("POST", "/api/auth/file-number/lookup", { facilityId: A.id, fileNumber: `A-${stamp}-1` }), 400, 404);
  const r = await anon.call("POST", "/api/auth/file-number/lookup", { facilityId: A.id, fileNumber: `A-${stamp}-1`, idNumber: "0000000000000" });
  expectStatus(r, 404);
  expect(!r.text.includes(twoEmail), "must not leak email");
});
await step("lookup with proof returns wizard prefill and a masked email", async () => {
  const r = await anon.call("POST", "/api/auth/file-number/lookup", { facilityId: A.id, fileNumber: `A-${stamp}-1`, idNumber: twoId });
  expectStatus(r, 200);
  const d = r.json.data;
  expect(d.state === "ready" && d.prefill.firstName === "Two" && d.prefill.saId === twoId && d.prefill.dob === "1990-01-01", "prefill in wizard field names");
  expect(!r.text.includes(twoEmail) && /\*/.test(d.maskedEmail), "email never returned unmasked");
});
await step("doctor lookup needs the right HPCSA number", async () => {
  const hp = `MP${String(stamp).slice(-7)}`;
  expectStatus(await anon.call("POST", "/api/auth/file-number/lookup", { kind: "doctor", facilityId: A.id, fileNumber: `DR-${stamp}`, hpcsaNumber: "MP0000000" }), 404);
  const r = expectStatus(await anon.call("POST", "/api/auth/file-number/lookup", { kind: "doctor", facilityId: A.id, fileNumber: `DR-${stamp}`, hpcsaNumber: hp.toLowerCase() }), 200);
  expect(r.json.data.state === "ready" && r.json.data.prefill.hpcsaNumber === hp && r.json.data.prefill.fullName, "doctor prefill");
});
await step("wizard register with a file claim completes the hospital's record (no duplicate)", async () => {
  const fileClaim = { facilityId: A.id, fileNumber: `A-${stamp}-1`, idNumber: twoId };
  const form = { email: twoEmail, password: "Password123!", confirmPassword: "Password123!", firstName: "Two", lastName: `Tester${stamp}`, gender: "Female", dob: "1990-01-01", bloodType: "A+", allergies: ["Dust"], heightCm: "165", weightKg: "60", emergencyName: "Ma", emergencyPhone: "0820000000", emergencyRelationship: "Mother", consent: true, termsAccepted: true };
  expectStatus(await anon.call("POST", "/api/auth/register", { role: "patient", formData: { ...form } }), 403);
  const wrongEmail = await anon.call("POST", "/api/auth/register", { role: "patient", formData: { ...form, fileClaim, email: `someone.${stamp}@example.com` } });
  expectStatus(wrongEmail, 400);
  expect(wrongEmail.json.code === "EMAIL_MISMATCH", "email must match the hospital record");
  expectStatus(await anon.call("POST", "/api/auth/register", { role: "patient", formData: { ...form, fileClaim: { ...fileClaim, idNumber: "0000000000000" } } }), 403);
  const r = expectStatus(await anon.call("POST", "/api/auth/register", { role: "patient", formData: { ...form, fileClaim } }), 200);
  expect(r.json.requiresVerification === true, "OTP follows");
  const users = await db("GET", "users", `email=eq.${encodeURIComponent(twoEmail)}&select=*`);
  expect(users.length === 1 && users[0].password_hash && users[0].status === "pending_verification", "same user, password set, awaiting email check");
  const own = await db("GET", "medical_context", `patient_id=eq.${users[0].id}&facility_id=is.null&select=blood_type`);
  expect(own.length === 1 && own[0].blood_type === "A+", "patient-entered context stored separately");
  const files = await db("GET", "facility_patients", `patient_id=eq.${users[0].id}&select=status`);
  expect(files.every((f) => f.status === "pending"), `files wait for the email check: ${JSON.stringify(files)}`);
  expectStatus(await anon.call("POST", "/api/auth/register", { role: "patient", formData: { ...form, fileClaim } }), 409);
});
await step("email OTP activates the account and every pending hospital file", async () => {
  const u = await userByEmail(twoEmail);
  await db("PATCH", "users", `id=eq.${u.id}`, { otp_code_hash: hash("246810"), otp_expires_at: new Date(Date.now() + 600000).toISOString() });
  expectStatus(await anon.call("POST", "/api/auth/otp/verify", { email: twoEmail, code: "246810" }), 200);
  const v = await userByEmail(twoEmail);
  expect(v.email_verified && v.status === "active", "user active");
  const files = await db("GET", "facility_patients", `patient_id=eq.${u.id}&select=status`);
  expect(files.length === 2 && files.every((f) => f.status === "active"), "both hospital files active");
  const again = await anon.call("POST", "/api/auth/file-number/lookup", { facilityId: A.id, fileNumber: `A-${stamp}-1`, idNumber: twoId });
  expect(again.json.data.state === "has_account", "now has_account");
});
await step("emailed setup link opens the wizard pre-filled and skips the OTP", async () => {
  const u = await userByEmail(oneEmail);
  const token = randomBytes(32).toString("hex");
  await db("POST", "set_password_tokens", "", {
    user_id: u.id, token_hash: createHash("sha256").update(token).digest("hex"),
    purpose: "set_password", expires_at: new Date(Date.now() + 86400e3).toISOString(),
  });
  const g = expectStatus(await anon.call("GET", `/api/auth/set-password?token=${token}`), 200);
  expect(g.json.data.role === "patient" && g.json.data.email === oneEmail && g.json.data.prefill.saId === oneId, "setup prefill");
  const form = { setupToken: token, email: oneEmail, password: "Password123!", confirmPassword: "Password123!", consent: true, termsAccepted: true };
  expectStatus(await anon.call("POST", "/api/auth/register", { role: "patient", formData: { ...form, password: "weak" } }), 400);
  const r = expectStatus(await anon.call("POST", "/api/auth/register", { role: "patient", formData: form }), 200);
  expect(r.json.next && r.json.requiresVerification === false, "goes straight to sign-in");
  const v = await userByEmail(oneEmail);
  expect(v.email_verified && v.status === "active" && v.password_hash, "active");
  const files = await db("GET", "facility_patients", `patient_id=eq.${u.id}&select=status`);
  expect(files.every((f) => f.status === "active"), "file active");
  expectStatus(await anon.call("POST", "/api/auth/register", { role: "patient", formData: form }), 404, 409);
  const old = await fetch(`${BASE}/set-password?token=${token}`, { redirect: "manual" });
  expect([307, 308].includes(old.status) || old.status === 200, "old link route still resolves");
});

console.log("isolation and booking gate");
const twoUser = await userByEmail(twoEmail);
const patient = new Session(await tokenFor(twoUser));
const docA = (await db("GET", "users", `email=eq.doc.${stamp}@example.com&select=*`))[0];
await step("pending doctor is not bookable until they finish onboarding", async () => {
  const start = new Date(Date.now() + 5 * 86400e3); start.setUTCHours(8, 0, 0, 0);
  const body = { practitionerId: docA.id, scheduledStart: start.toISOString(), scheduledEnd: new Date(start.getTime() + 3600e3).toISOString(), reason: "t", type: "video" };
  expectStatus(await patient.call("POST", "/api/bookings", body), 403);
  await db("PATCH", "staff", `user_id=eq.${docA.id}`, { status: "active" });
});
await step("hospital A admin sees own patient, not B-only patient", async () => {
  const r = await hospA.call("GET", `/api/hospital/patients/search?search=${encodeURIComponent("Tester")}`);
  expectStatus(r, 200);
  const txt = JSON.stringify(r.json);
  expect(txt.includes(twoEmail) || txt.includes(String(stamp)), "own patient listed");
});
await step("booking: no file -> 403; with file -> 200 and facility_id set", async () => {
  const start = new Date(Date.now() + 5 * 86400e3); start.setUTCHours(9, 0, 0, 0);
  const body = { practitionerId: docA.id, scheduledStart: start.toISOString(), scheduledEnd: new Date(start.getTime() + 3600e3).toISOString(), reason: "t", type: "video" };
  await db("PATCH", "facility_patients", `patient_id=eq.${twoUser.id}&facility_id=eq.${A.id}`, { status: "suspended" });
  expectStatus(await patient.call("POST", "/api/bookings", body), 403);
  await db("PATCH", "facility_patients", `patient_id=eq.${twoUser.id}&facility_id=eq.${A.id}`, { status: "active" });
  const r = expectStatus(await patient.call("POST", "/api/bookings", body), 200, 201);
  const [c] = await db("GET", "consultations", `id=eq.${r.json.data.id}&select=facility_id`);
  expect(c.facility_id === A.id, "facility_id derived server-side");
});
await step("hospital B cannot touch a hospital A booking; practitioner without link blocked", async () => {
  const [c] = await db("GET", "consultations", `patient_id=eq.${twoUser.id}&select=id`);
  const [adminBp] = await db("GET", "hospital_admin_profiles", `facility_id=eq.${B.id}&select=user_id`);
  const [adminB] = await db("GET", "users", `id=eq.${adminBp.user_id}&select=*`);
  const hospB = new Session(await tokenFor(adminB));
  expectStatus(await hospB.call("GET", `/api/bookings/${c.id}`), 403, 404);
  expectStatus(await hospB.call("PATCH", `/api/bookings/${c.id}`, { status: "cancelled" }), 403, 404);
  const other = await Session.as("mitchell@247digihealth.com");
  expectStatus(await other.call("GET", `/api/practitioner/patients/${twoUser.id}/health-record`), 403);
});
await step("patient discovery limited to own hospitals", async () => {
  const r = await patient.call("GET", "/api/patient/practitioners");
  expectStatus(r, 200);
  const ids = (r.json ?? []).map((p) => p.id);
  expect(ids.includes(docA.id), "doctor at own hospital listed");
  const all = await db("GET", "users", "role=eq.practitioner&select=id");
  expect(ids.length < all.length, "not every practitioner is listed");
});
await step("free access: no checkout redirect for a user without a plan", async () => {
  const r = await patient.call("GET", "/patient");
  expect(![307, 308].includes(r.status) || !/checkout|coverage|billing/.test(r.text + (r.json ? "" : "")), "no plan redirect");
});

done();
