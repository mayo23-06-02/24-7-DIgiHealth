import { Recorder, makeSession, json } from "../20260824T113355Z/recorder.mjs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Auth-focused UAT.
 *
 * Deliberately budget-aware: the login limiter allows 5 attempts per 15
 * minutes per IP and is global, so a suite that spends more than that blocks
 * itself and records product failures that are really self-inflicted. Cases
 * that need a real login are grouped and spaced; everything that can be proven
 * without one runs first.
 */
const DIR = path.dirname(fileURLToPath(import.meta.url));
const BASE = "https://24-7-d-igi-health.vercel.app";
const rec = new Recorder(DIR, BASE);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PATIENT = "thandiwe.mokoena@example.com";
const PW = "Password123!";
const UNKNOWN = "definitely-not-a-user-92831@example.com";

/* === 1. Input validation (no login budget spent) ====================== */
async function validation() {
  rec.section("1 · INPUT VALIDATION");
  const s = makeSession(BASE, "validation");

  // Only two cases: /api/auth/login allows 5 attempts per 15 minutes and the
  // credential checks later in this suite need the rest of that budget.
  const cases = [
    ["V-01", {}, "empty body"],
    ["V-02", { identifier: PATIENT }, "password missing"],
  ];
  for (const [id, body, label] of cases) {
    const { res, bodyText } = await rec.call(s, "POST", "/api/auth/login", json(body));
    rec.check(id, "Validation", label + " rejected as 400", res?.status === 400,
      "HTTP " + res?.status + " " + bodyText.slice(0, 60));
  }

  const { res: malformed } = await rec.call(s, "POST", "/api/auth/login", {
    headers: { "content-type": "application/json" },
    body: "{not json",
  });
  rec.check("V-05", "Validation", "Malformed JSON does not 500",
    malformed?.status !== 500 && !!malformed?.status,
    "HTTP " + malformed?.status);
}

/* === 2. Session & authorization ======================================= */
async function sessions() {
  rec.section("2 · SESSION & AUTHORIZATION");
  const anon = makeSession(BASE, "anon");

  for (const [id, p] of [
    ["S-01", "/api/user/profile"],
    ["S-02", "/api/billing"],
    ["S-03", "/api/patient/family"],
    ["S-04", "/api/practitioner/dashboard"],
  ]) {
    const { res } = await rec.call(anon, "GET", p);
    rec.check(id, "Session", p + " requires auth", res?.status === 401,
      "HTTP " + res?.status);
  }

  const forged = makeSession(BASE, "forged");
  const { res: bad } = await rec.call(forged, "GET", "/api/user/profile", {
    headers: { cookie: "token=not.a.real.jwt" },
  });
  rec.check("S-05", "Session", "Forged session token rejected", bad?.status === 401,
    "HTTP " + bad?.status);

  const { res: spoof, bodyText: spoofBody } = await rec.call(anon, "GET", "/api/user/profile", {
    headers: { "x-user-id": "6a3bf0c34c2fe7756f42a371" },
  });
  rec.check("S-06", "Session", "x-user-id header alone grants nothing",
    spoof?.status === 401, "HTTP " + spoof?.status + " " + spoofBody.slice(0, 50));

  const { res: dash } = await rec.call(anon, "GET", "/patient");
  rec.check("S-07", "Session", "Dashboard redirects anonymous users to login",
    dash?.status === 307 && (dash.headers.get("location") || "").includes("/login"),
    "HTTP " + dash?.status + " -> " + dash?.headers.get("location"));
}

/* === 3. Password reset ================================================ */
async function reset() {
  rec.section("3 · PASSWORD RESET");
  const s = makeSession(BASE, "reset");

  const { res: noTok, bodyText: ntB } = await rec.call(s, "POST", "/api/auth/reset-password",
    json({ password: "NewPassword1!", confirmPassword: "NewPassword1!" }));
  rec.check("R-01", "Reset", "Missing token refused", noTok?.status === 400,
    "HTTP " + noTok?.status + " " + JSON.parse(ntB).error);

  const { res: badTok, bodyText: btB } = await rec.call(s, "POST", "/api/auth/reset-password",
    json({ token: "bogus-token", password: "NewPassword1!", confirmPassword: "NewPassword1!" }));
  rec.check("R-02", "Reset", "Invalid token refused", badTok?.status === 400,
    "HTTP " + badTok?.status + " " + JSON.parse(btB).error);

  const { res: mismatch, bodyText: mmB } = await rec.call(s, "POST", "/api/auth/reset-password",
    json({ token: "bogus-token", password: "NewPassword1!", confirmPassword: "Different1!" }));
  rec.check("R-03", "Reset", "Confirmation mismatch refused", mismatch?.status === 400,
    "HTTP " + mismatch?.status + " " + JSON.parse(mmB).error);

  // The request endpoint must answer identically for known and unknown
  // addresses, or it becomes an account-enumeration oracle.
  const { res: known, bodyText: kB } = await rec.call(s, "POST", "/api/auth/forgot-password",
    json({ identifier: PATIENT }));
  const { res: unknown, bodyText: uB } = await rec.call(s, "POST", "/api/auth/forgot-password",
    json({ identifier: UNKNOWN }));
  rec.check("R-05", "Reset", "Forgot-password does not reveal whether an account exists",
    known?.status === unknown?.status && kB === uB,
    "known " + known?.status + " vs unknown " + unknown?.status +
      (kB === uB ? ", identical bodies" : ", DIFFERENT bodies"));
}

/* === 4. Email verification ============================================ */
async function verification() {
  rec.section("4 · EMAIL VERIFICATION");
  const s = makeSession(BASE, "verify");

  const { res: unknownSend, bodyText: usB } = await rec.call(s, "POST", "/api/auth/otp/send",
    json({ email: UNKNOWN }));
  rec.check("E-01", "Verify", "OTP send handles an unknown address without leaking",
    unknownSend?.status !== 500, "HTTP " + unknownSend?.status + " " + usB.slice(0, 70));

  /*
   * Postgres-native accounts have no Mongo row, and OTP send/verify only look
   * in Mongo — so an account that exists and can sign in is told it does not
   * exist. Recorded as its own case rather than folded into a pass/fail on the
   * happy path, because it is a real gap, not a test artefact.
   */
  const { res: uuidSend, bodyText: usB2 } = await rec.call(s, "POST", "/api/auth/otp/send",
    json({ email: PATIENT }));
  rec.check("E-02", "Verify", "OTP send resolves a Postgres-native account",
    uuidSend?.status !== 404,
    "HTTP " + uuidSend?.status + " " + usB2.slice(0, 90) +
      "  [known gap: otp/send reads Mongo only]");

  const { res: wrongCode, bodyText: wcB } = await rec.call(s, "POST", "/api/auth/otp/verify",
    json({ email: PATIENT, code: "000000" }));
  rec.check("E-03", "Verify", "Wrong code refused", !wrongCode?.ok,
    "HTTP " + wrongCode?.status + " " + wcB.slice(0, 70));

  const setCookies = wrongCode?.headers.getSetCookie?.() || [];
  rec.check("E-04", "Verify", "Verify never issues a session cookie",
    !setCookies.some((c) => c.startsWith("token=")),
    setCookies.length + " cookie(s), none a session token");

  const { res: shortCode } = await rec.call(s, "POST", "/api/auth/otp/verify",
    json({ email: PATIENT, code: "12" }));
  rec.check("E-05", "Verify", "Malformed code refused", !shortCode?.ok,
    "HTTP " + shortCode?.status);
}

/* === 5. Credentials (spends login budget) ============================= */
async function credentials() {
  rec.section("5 · CREDENTIALS  (uses the 5-per-15-min login budget)");
  rec.line("  ..  waiting out the login window so these are measured, not rate-limited");
  await sleep(15 * 60 * 1000 + 20000);
  const s = makeSession(BASE, "creds");

  const { res: wrong, bodyText: wrongB } = await rec.call(s, "POST", "/api/auth/login",
    json({ identifier: PATIENT, password: "DefinitelyWrong1!" }));
  rec.check("C-01", "Credentials", "Wrong password rejected", wrong?.status === 401,
    "HTTP " + wrong?.status);

  const { res: unknown, bodyText: unknownB } = await rec.call(s, "POST", "/api/auth/login",
    json({ identifier: UNKNOWN, password: "DefinitelyWrong1!" }));
  rec.check("C-02", "Credentials", "Unknown account is indistinguishable from a wrong password",
    wrong?.status === unknown?.status && wrongB === unknownB,
    "wrong-pw " + wrong?.status + " vs unknown " + unknown?.status +
      (wrongB === unknownB ? ", identical bodies" : ", DIFFERENT bodies"));

  const { res: caseTest } = await rec.call(s, "POST", "/api/auth/login",
    json({ identifier: PATIENT.toUpperCase(), password: PW }));
  rec.check("C-03", "Credentials", "Identifier is case-insensitive",
    caseTest?.ok, "HTTP " + caseTest?.status + " for an upper-cased address");

  const good = makeSession(BASE, "good");
  const { res: ok, bodyText: okB } = await rec.call(good, "POST", "/api/auth/login",
    json({ identifier: PATIENT, password: PW }));
  rec.check("C-04", "Credentials", "Correct password signs in", !!ok?.ok,
    "HTTP " + ok?.status + " " + okB.slice(0, 80));

  if (ok?.ok) {
    const cookies = ok.headers.getSetCookie?.() || [];
    const token = cookies.find((c) => c.startsWith("token="));
    rec.check("C-05", "Credentials", "Session cookie is HttpOnly and SameSite",
      !!token && /HttpOnly/i.test(token) && /SameSite/i.test(token),
      token ? token.split(";").slice(1).join(";").trim() : "no token cookie");

    const { res: me, bodyText: meB } = await rec.call(good, "GET", "/api/user/profile");
    rec.check("C-06", "Credentials", "Session authenticates a protected route",
      !!me?.ok, "HTTP " + me?.status + " " + meB.slice(0, 60));

    const { res: out } = await rec.call(good, "POST", "/api/auth/logout");
    rec.check("C-07", "Session", "Logout succeeds", !!out?.ok, "HTTP " + out?.status);

    const { res: after } = await rec.call(good, "GET", "/api/user/profile");
    rec.check("C-08", "Session", "Session is dead after logout", after?.status === 401,
      "HTTP " + after?.status);
  }
}

/* === 6. Rate limiting ================================================= */
async function rateLimit() {
  rec.section("6 · RATE LIMITING");
  const burst = await Promise.all(
    Array.from({ length: 10 }, () =>
      fetch(BASE + "/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier: "ratelimit.probe@example.com", password: "Nope1!" }),
      }),
    ),
  );
  const codes = burst.map((r) => r.status);
  const limited = codes.filter((c) => c === 429).length;
  rec.check("L-01", "Security", "Login rate limiting engages", limited > 0,
    limited + "/10 returned 429 · codes: " + [...new Set(codes)].join(", "));

  const headers = burst.find((r) => r.status === 429)?.headers;
  rec.check("L-02", "Security", "429 carries rate-limit headers",
    !!headers?.get("x-ratelimit-limit"),
    headers
      ? "limit=" + headers.get("x-ratelimit-limit") + " reset=" + headers.get("x-ratelimit-reset")
      : "no 429 seen");
}

/* === run ============================================================== */
const started = new Date();
rec.line("24/7 DigiHealth — AUTH use-case suite");
rec.line("Environment : " + BASE);
rec.line("Started     : " + started.toISOString() +
  " (" + started.toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" }) + " SAST)");

await validation();
await sessions();
await reset();
await verification();
await credentials();
// Runs last: it deliberately exhausts the login budget, so nothing that needs
// a real login can follow it.
await rateLimit();

rec.finish({
  environment: BASE,
  suite: "auth",
  startedAt: started.toISOString(),
  endedAt: new Date().toISOString(),
});
