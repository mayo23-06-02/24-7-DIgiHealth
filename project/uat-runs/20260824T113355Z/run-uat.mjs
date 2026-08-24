import { Recorder, makeSession, json } from "./recorder.mjs";
import path from "path";
import { fileURLToPath } from "url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const BASE = "https://24-7-d-igi-health.vercel.app";
const PW = "Password123!";

const ACCOUNTS = {
  patient: "thandiwe.mokoena@example.com",
  practitioner: "dr.nomvula.khumalo2@247digihealth.com",
  hospital_admin: "admin@milpark.netcare.co.za",
};

const rec = new Recorder(DIR, BASE);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Log in, respecting the shared login rate limit.
 *
 * The limiter is a control this suite also tests, and it is global now — so a
 * run that spends more than the allowance blocks itself and reports product
 * failures that are really self-inflicted. On a 429 this waits the window out
 * once rather than recording a false negative.
 */
const LOGIN_WINDOW_MS = 15 * 60 * 1000 + 20000;
async function login(session, email, password = PW, allowWait = true) {
  let { res, bodyText } = await rec.call(
    session, "POST", "/api/auth/login", json({ identifier: email, password }));
  if (res?.status === 429 && allowWait) {
    rec.line("  ..  login budget exhausted — waiting out the 15-minute window");
    await sleep(LOGIN_WINDOW_MS);
    ({ res, bodyText } = await rec.call(
      session, "POST", "/api/auth/login", json({ identifier: email, password })));
  }
  return { ok: !!res?.ok, status: res?.status, body: bodyText };
}

/* === A. Public marketing ============================================== */
async function marketing() {
  rec.section("A · PUBLIC MARKETING SITE");
  const anon = makeSession(BASE, "anon");
  const pages = [
    ["A-01", "/", "Landing"],
    ["A-02", "/about", "About"],
    ["A-03", "/patients", "For Patients"],
    ["A-04", "/doctors", "For Doctors"],
    ["A-05", "/pricing", "Pricing"],
    ["A-06", "/contact", "Contact"],
  ];
  for (const [id, p, name] of pages) {
    const { res, bodyText, record } = await rec.call(anon, "GET", p);
    const issues = [];
    if (/ink-700|ink-500|ink-800|accent-700/.test(bodyText)) issues.push("undefined colour token");
    if (/AI[- ]?triage/i.test(bodyText)) issues.push("AI-triage copy");
    rec.check(
      id,
      "Marketing",
      name + " renders clean",
      !!res?.ok && issues.length === 0,
      "HTTP " + res?.status + " " + record.ms + "ms" + (issues.length ? " · " + issues.join(", ") : ""),
    );
  }
  const { res: fav } = await rec.call(anon, "GET", "/icon.svg");
  rec.check("A-07", "Marketing", "Favicon served", !!fav?.ok, "HTTP " + fav?.status);
}

/* === B. Auth controls ================================================= */
async function auth() {
  rec.section("B · AUTHENTICATION");
  const s = makeSession(BASE, "auth-probe");

  const { res: bad, bodyText: badBody } = await rec.call(
    s, "POST", "/api/auth/login",
    json({ identifier: ACCOUNTS.patient, password: "WrongPassword!" }));
  const { res: unk, bodyText: unkBody } = await rec.call(
    s, "POST", "/api/auth/login",
    json({ identifier: "definitely-not-a-user@example.com", password: "WrongPassword!" }));

  rec.check("B-01", "Auth", "Wrong password rejected", bad?.status === 401, "HTTP " + bad?.status);
  rec.check("B-02", "Auth", "No account enumeration",
    bad?.status === unk?.status && badBody === unkBody,
    "wrong-pw " + bad?.status + " vs unknown " + unk?.status +
      (badBody === unkBody ? ", identical bodies" : ", DIFFERENT bodies"));

  const anon = makeSession(BASE, "anon-auth");
  const { res: prot } = await rec.call(anon, "GET", "/api/user/profile");
  rec.check("B-03", "Auth", "Unauthenticated API is 401", prot?.status === 401, "HTTP " + prot?.status);

  const { res: noTok, bodyText: ntBody } = await rec.call(
    anon, "POST", "/api/auth/reset-password",
    json({ token: "bogus", password: PW, confirmPassword: PW }));
  rec.check("B-04", "Auth", "Bogus reset token refused", noTok?.status === 400,
    "HTTP " + noTok?.status + " " + ntBody.slice(0, 60));
}

/* === C. Plan gate ===================================================== */
async function planGate() {
  rec.section("C · PLAN GATE");
  const s = makeSession(BASE, "patient");
  const l0 = await login(s, ACCOUNTS.patient);
  rec.check("C-01", "Gate", "Patient login", l0.ok, "HTTP " + l0.status);
  if (!l0.ok) return null;

  // Reset to an unpaid state so the gate is exercised for real. Reading
  // entitlement afterwards re-issues the session token with the corrected
  // hasPlan claim, which is what the gate reads — so no second login is
  // needed, and the run stays inside the login budget.
  await rec.call(s, "PATCH", "/api/billing", json({ action: "cancel_subscription" }));

  const { bodyText: entBody } = await rec.call(s, "GET", "/api/billing/entitlement");
  const ent = JSON.parse(entBody).data;
  rec.check("C-02", "Gate", "Starts with no active plan", ent.hasPlan === false,
    "hasPlan=" + ent.hasPlan + " status=" + ent.status);

  for (const [id, p] of [["C-03", "/patient"], ["C-04", "/patient/appointments"], ["C-05", "/patient/doctors"]]) {
    const { res } = await rec.call(s, "GET", p);
    const loc = res?.headers.get("location") || "";
    rec.check(id, "Gate", p + " redirects to checkout",
      res?.status === 307 && loc.includes("/patient/checkout"),
      "HTTP " + res?.status + " -> " + loc);
  }
  for (const [id, p] of [["C-06", "/patient/checkout"], ["C-07", "/patient/billing"]]) {
    const { res } = await rec.call(s, "GET", p);
    rec.check(id, "Gate", p + " reachable (exempt)", res?.status === 200, "HTTP " + res?.status);
  }

  const { res: byp, bodyText: bypBody } = await rec.call(s, "PATCH", "/api/billing",
    json({ action: "upgrade_subscription", tier: "family_plus" }));
  const { bodyText: afterBody } = await rec.call(s, "GET", "/api/billing/entitlement");
  rec.check("C-08", "Security", "Free-plan bypass stays closed",
    byp?.status === 400 && JSON.parse(afterBody).data.hasPlan === false,
    "HTTP " + byp?.status + " " + bypBody.slice(0, 60));

  return s;
}

/* === D. Checkout ====================================================== */
async function checkout(s) {
  rec.section("D · CHECKOUT (card, EFT, validation)");
  if (!s) return null;
  const addr = { addressLine: "12 Long Street", city: "Johannesburg", postalCode: "2000" };
  const card = { number: "4111111111111111", name: "T Mokoena", expiry: "12/29", cvv: "123" };

  const { bodyText: plansBody } = await rec.call(s, "GET", "/api/billing/checkout");
  const plans = JSON.parse(plansBody).data.plans;
  rec.check("D-01", "Checkout", "Plans load from tier config", plans.length === 3,
    plans.map((p) => p.label + " R" + p.price).join(", "));

  const { res: v1, bodyText: v1b } = await rec.call(s, "POST", "/api/billing/checkout",
    json({ tier: "family", method: "card", card, billing: {} }));
  rec.check("D-02", "Checkout", "Missing billing address rejected", v1?.status === 400,
    "HTTP " + v1?.status + " fields: " + Object.keys(JSON.parse(v1b).fieldErrors || {}).join(","));

  const { res: v2, bodyText: v2b } = await rec.call(s, "POST", "/api/billing/checkout",
    json({ tier: "family", method: "eft",
      card: { accountHolder: "T M", bankName: "Capitec", accountNumber: "1234567890", branchCode: "12" },
      billing: addr }));
  rec.check("D-03", "Checkout", "EFT branch code validated", v2?.status === 400,
    "HTTP " + v2?.status + " " + JSON.stringify(JSON.parse(v2b).fieldErrors));

  const { res: dec, bodyText: decb } = await rec.call(s, "POST", "/api/billing/checkout",
    json({ tier: "family", method: "card", card: { ...card, number: "4111111111110000" }, billing: addr }));
  rec.check("D-04", "Checkout", "Declined card returns 402", dec?.status === 402,
    "HTTP " + dec?.status + " " + JSON.parse(decb).error);

  const { res: ok, bodyText: okb } = await rec.call(s, "POST", "/api/billing/checkout",
    json({ tier: "family", method: "card", card, billing: addr }));
  const paid = ok?.ok ? JSON.parse(okb).data : null;
  rec.check("D-05", "Checkout", "Successful purchase", !!paid,
    paid ? paid.tier + " R" + paid.price + " ref " + paid.reference : "HTTP " + ok?.status);

  const { res: after } = await rec.call(s, "GET", "/patient");
  rec.check("D-06", "Gate", "Dashboard released after payment", after?.status === 200,
    "HTTP " + after?.status);
  return paid;
}

/* === E. Receipts ====================================================== */
async function receipts(s, paid) {
  rec.section("E · RECEIPTS & BILLING");
  if (!s || !paid) { rec.check("E-00", "Billing", "Receipt checks", null, "no purchase to verify"); return; }

  const { res: r, record: rr } = await rec.call(s, "POST", "/api/billing/export",
    json({ type: "receipt", transactionId: paid.transactionId }));
  rec.check("E-01", "Billing", "Receipt PDF downloads",
    !!r?.ok && !!rr.contentType?.includes("pdf"), "HTTP " + r?.status + " " + rr.body);

  const { res: st, record: sr } = await rec.call(s, "POST", "/api/billing/export",
    json({ type: "report", reportKind: "statement" }));
  rec.check("E-02", "Billing", "Statement PDF downloads",
    !!st?.ok && !!sr.contentType?.includes("pdf"), "HTTP " + st?.status + " " + sr.body);

  const { bodyText: bill } = await rec.call(s, "GET", "/api/billing");
  const b = JSON.parse(bill);
  rec.check("E-03", "Billing", "Subscription shown on billing page",
    b.subscription?.status === "active", b.subscription?.tier + " " + b.subscription?.status);
  rec.check("E-04", "Billing", "Purchase appears in payment history",
    (b.transactions || []).some((t) => t.category === "subscription"),
    (b.transactions?.length || 0) + " transaction(s)");
}

/* === F. Family invites ================================================ */
async function family(s) {
  rec.section("F · FAMILY INVITES");
  if (!s) return;
  const invitee = "uat.family.probe@example.com";

  const { res, bodyText } = await rec.call(s, "POST", "/api/patient/family/invite",
    json({ email: invitee, name: "UAT Probe", relationship: "spouse" }));
  const inv = res?.ok ? JSON.parse(bodyText).data : null;
  rec.check("F-01", "Family", "Guardian on a Family plan can invite", !!inv,
    inv ? "invite created" : "HTTP " + res?.status + " " + bodyText.slice(0, 90));

  if (inv?.inviteUrl) {
    rec.check("F-02", "Family", "Invite links to the registration wizard",
      inv.inviteUrl.includes("/register/patient?invite="),
      inv.inviteUrl.replace(/invite=.*/, "invite=<token>"));

    const token = inv.inviteUrl.split("invite=")[1];
    const anon = makeSession(BASE, "anon-invitee");
    const { res: lk, bodyText: lkb } = await rec.call(anon, "GET", "/api/invites/family/" + token);
    const d = lk?.ok ? JSON.parse(lkb).data : null;
    rec.check("F-03", "Family", "Invite lookup works without auth and returns the locked email",
      d?.inviteEmail === invitee,
      d ? "email=" + d.inviteEmail + " guardian=" + d.guardianName : "HTTP " + lk?.status);
  }

  const anon2 = makeSession(BASE, "anon-lookup");
  const { bodyText: byEmail } = await rec.call(anon2, "POST", "/api/invites/family/lookup",
    json({ email: invitee }));
  rec.check("F-04", "Family", "By-email lookup finds the pending invite",
    JSON.parse(byEmail).data?.pending === true, byEmail.slice(0, 120));
  rec.check("F-05", "Security", "Lookup never returns the invite token",
    !/token/i.test(byEmail), "no token field in response");
}

/* === G. Booking slots ================================================= */
async function booking() {
  rec.section("G · BOOKING SLOTS (timezone)");
  const anon = makeSession(BASE, "anon-booking");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
  const nowSast = new Date().toLocaleTimeString("en-GB", {
    timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit", hour12: false });

  const { bodyText: docsBody } = await rec.call(anon, "GET", "/api/hospital/doctors");
  const docs = JSON.parse(docsBody);
  const id = (docs.data || docs)[0]?.id;

  const { bodyText } = await rec.call(anon, "GET",
    "/api/bookings/slots?practitionerId=" + id + "&date=" + today);
  const slots = JSON.parse(bodyText).data?.slots || [];
  const past = slots.filter((x) => x.status === "past");

  const [h, m] = nowSast.split(":").map(Number);
  const nowMin = h * 60 + m;
  const elapsedButOpen = slots.filter((x) => {
    const [sh, sm] = x.time.split(":").map(Number);
    return sh * 60 + sm < nowMin && x.status !== "past";
  });

  rec.check("G-01", "Booking", "Slots returned for today", slots.length > 0,
    slots.length + " slots · SAST " + nowSast);
  rec.check("G-02", "Booking", "Elapsed slots marked past (SAST, not server UTC)",
    elapsedButOpen.length === 0,
    past.length + " past · " + elapsedButOpen.length + " elapsed-but-still-open");
}

/* === H. Authorization & error hygiene ================================= */
async function security(s) {
  rec.section("H · AUTHORIZATION & ERROR HYGIENE");
  const anon = makeSession(BASE, "anon-sec");
  const { res: ably } = await rec.call(anon, "GET", "/api/ably/auth?clientId=attacker");
  rec.check("H-01", "Security", "Ably token requires a session", ably?.status === 401,
    "HTTP " + ably?.status);

  if (!s) return;
  const { bodyText: tok } = await rec.call(s, "GET", "/api/ably/auth");
  let cap = {};
  try { cap = JSON.parse(JSON.parse(tok).capability); } catch { /* not a token */ }
  rec.check("H-02", "Security", "Authenticated token is scoped, no wildcard",
    !("conversation:*" in cap), "channels: " + Object.keys(cap).join(", "));

  const { res: q } = await rec.call(s, "GET", "/api/practitioner/queue");
  rec.check("H-03", "AuthZ", "Patient cannot read practitioner queue",
    [401, 403].includes(q?.status), "HTTP " + q?.status);

  const { res: adm } = await rec.call(s, "GET", "/api/admin/users");
  rec.check("H-04", "AuthZ", "Patient cannot read admin users",
    [401, 403, 404].includes(adm?.status), "HTTP " + adm?.status);

  const { bodyText: errBody } = await rec.call(s, "GET", "/api/media/file/not-a-real-id");
  rec.check("H-05", "Security", "Errors are generic and carry a reference",
    !/Mongoose|ObjectId|Cast to|schema/i.test(errBody) && /"ref"/.test(errBody),
    errBody.slice(0, 90));
}

/* === I. Other roles =================================================== */
async function otherRoles() {
  rec.section("I · OTHER ROLES (must not be plan-gated)");
  const roles = [
    ["practitioner", ACCOUNTS.practitioner],
    ["hospital_admin", ACCOUNTS.hospital_admin],
  ];
  for (const [role, email] of roles) {
    // Spaced: the shared login limiter is a control under test elsewhere, and
    // tripping it here would report a product failure that isn't one.
    await sleep(45000);
    const s = makeSession(BASE, role);
    const l = await login(s, email);
    rec.check("I-" + role + "-login", "Roles", role + " login", l.ok, "HTTP " + l.status);
    if (!l.ok) continue;

    const { res } = await rec.call(s, "GET", "/" + role);
    rec.check("I-" + role + "-gate", "Roles", role + " reaches dashboard (not gated)",
      res?.status === 200,
      "HTTP " + res?.status + " " + (res?.headers.get("location") || "(rendered)"));

    if (role === "practitioner") {
      const { res: d, record } = await rec.call(s, "GET", "/api/practitioner/dashboard");
      rec.check("I-perf", "Performance", "Practitioner dashboard responds",
        !!d?.ok, "HTTP " + d?.status + " " + record.ms + "ms");
    }
  }
}

/* === run ============================================================== */
const startedAt = new Date();
rec.line("24/7 DigiHealth — UAT session record");
rec.line("Environment : " + BASE);
rec.line("Started     : " + startedAt.toISOString() +
  " (" + startedAt.toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" }) + " SAST)");

await marketing();
await auth();
const s = await planGate();
const paid = await checkout(s);
await receipts(s, paid);
await family(s);
await booking();
await security(s);
await otherRoles();

rec.finish({
  environment: BASE,
  startedAt: startedAt.toISOString(),
  endedAt: new Date().toISOString(),
});
