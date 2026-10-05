import { Session, db, userByEmail, hash, step, expect, expectStatus, done, BASE } from "./lib.mjs";

const stamp = Date.now();
const email = `flow.patient.${stamp}@example.com`;
const anon = new Session(null);

console.log("auth flows");
await step("register patient", async () => {
  const r = await anon.call("POST", "/api/auth/register", { role: "patient", formData: {
    email, password: "Password123!", firstName: "Flow", lastName: "Patient", dob: "1990-05-05", gender: "female",
    emergencyName: "Ma", emergencyPhone: "0821234567", emergencyRelationship: "mother",
    heightCm: "170", weightKg: "65", bloodType: "O+", allergies: ["Penicillin"], chronicConditions: ["Asthma"],
  }});
  expectStatus(r, 200, 201);
  const u = await userByEmail(email);
  expect(u && u.status === "pending_verification" && u.email_verified === false, "user row not created as pending");
  const [prof] = await db("GET", "patient_profiles", `user_id=eq.${u.id}&select=*`);
  expect(prof && prof.gender === "female", "patient profile missing");
  const [mc] = await db("GET", "medical_context", `patient_id=eq.${u.id}&select=*`);
  expect(mc && mc.blood_type === "O+", "medical context missing");
  const allergies = await db("GET", "patient_allergies", `medical_context_id=eq.${mc.id}&select=*`);
  expect(allergies.length === 1 && allergies[0].allergen === "Penicillin", "allergy child row missing");
});

await step("duplicate register -> 409", async () => {
  const r = await anon.call("POST", "/api/auth/register", { role: "patient", formData: { email, password: "Password123!", firstName: "x", lastName: "y" } });
  expectStatus(r, 409);
});

await step("login before verify -> 403 requiresVerification", async () => {
  const r = await anon.call("POST", "/api/auth/login", { identifier: email, password: "Password123!" });
  expectStatus(r, 403);
  expect(r.json?.requiresVerification, "expected requiresVerification");
});

await step("wrong password -> 401", async () => {
  expectStatus(await anon.call("POST", "/api/auth/login", { identifier: email, password: "nope" }), 401);
});

await step("otp verify activates account", async () => {
  const u = await userByEmail(email);
  await db("PATCH", "users", `id=eq.${u.id}`, { otp_code_hash: hash("123456"), otp_expires_at: new Date(Date.now() + 600000).toISOString() });
  const r = await anon.call("POST", "/api/auth/otp/verify", { email, code: "123456" });
  expectStatus(r, 200);
  const v = await userByEmail(email);
  expect(v.email_verified === true && v.status === "active" && !v.otp_code_hash, "account not activated");
});

await step("login -> mfa required (code email may fail without provider)", async () => {
  const r = await anon.call("POST", "/api/auth/login", { identifier: email, password: "Password123!" });
  expectStatus(r, 200, 502);
});

await step("mfa verify issues session cookie", async () => {
  const u = await userByEmail(email);
  await db("PATCH", "users", `id=eq.${u.id}`, { otp_code_hash: hash("654321"), otp_expires_at: new Date(Date.now() + 600000).toISOString() });
  const r = await fetch(BASE + "/api/auth/mfa/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, code: "654321" }) });
  expect(r.status === 200, `mfa verify status ${r.status}: ${await r.text()}`);
  const cookie = r.headers.get("set-cookie") ?? "";
  expect(/token=/.test(cookie), "no session cookie");
  const token = cookie.match(/token=([^;]+)/)[1];
  const me = await new Session(token).call("GET", "/api/user/profile");
  expectStatus(me, 200);
});

await step("forgot + reset password", async () => {
  const f = await anon.call("POST", "/api/auth/forgot-password", { email });
  expectStatus(f, 200);
  const u = await userByEmail(email);
  // reset token flow stores a bcrypt hash of the token; install a known one
  const token = "tok-" + stamp;
  await db("PATCH", "users", `id=eq.${u.id}`, { reset_token_hash: hash(token), reset_token_expires_at: new Date(Date.now() + 600000).toISOString() });
  const r = await anon.call("POST", "/api/auth/reset-password", { token, password: "NewPassword456!", confirmPassword: "NewPassword456!" });
  expectStatus(r, 200);
  const l = await anon.call("POST", "/api/auth/login", { identifier: email, password: "NewPassword456!" });
  expectStatus(l, 200, 502);
});

await step("mega admin login (MFA exempt) sets session", async () => {
  const r = await anon.call("POST", "/api/auth/login", { identifier: "mega@247digihealth.com", password: "Password123!" });
  expectStatus(r, 200);
  expect(r.json?.mfaRequired === false, "expected direct session");
});

done();
