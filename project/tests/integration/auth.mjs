import { Session, db, userByEmail, hash, step, expect, expectStatus, done, BASE } from "./lib.mjs";

const stamp = Date.now();
const email = `flow.patient.${stamp}@example.com`;
const anon = new Session(null);

console.log("auth flows");
await step("public patient register is closed (file number required)", async () => {
  const r = await anon.call("POST", "/api/auth/register", { role: "patient", formData: { email, password: "Password123!", firstName: "Flow", lastName: "Patient" } });
  expectStatus(r, 403);
  expect(r.json?.code === "FILE_NUMBER_REQUIRED" || /file number/i.test(r.text), "expected FILE_NUMBER_REQUIRED");
  const rp = await anon.call("POST", "/api/auth/register", { role: "practitioner", formData: { email, password: "Password123!", firstName: "Flow", lastName: "Doc" } });
  expectStatus(rp, 403);
});

await step("hospital-provisioned patient row (pending verification)", async () => {
  const [u] = await db("POST", "users", "", { email, password_hash: hash("Password123!"), role: "patient", first_name: "Flow", last_name: "Patient", status: "pending_verification", email_verified: false });
  await db("POST", "patient_profiles", "", { user_id: u.id, gender: "female", date_of_birth: "1990-05-05" });
  expect((await userByEmail(email)).status === "pending_verification", "user row not pending");
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
