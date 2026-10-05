import { SignJWT } from "jose";
import bcrypt from "bcryptjs";

export const BASE = process.env.BASE ?? "http://localhost:3100";
export const REST = process.env.SUPABASE_REST ?? "http://localhost:3002/rest/v1";
export const KEY = process.env.SUPABASE_SECRET_KEY;
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
if (!KEY || !process.env.JWT_SECRET) throw new Error("SUPABASE_SECRET_KEY and JWT_SECRET required");

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "content-type": "application/json", Prefer: "return=representation" };

export async function db(method, table, query = "", body) {
  const r = await fetch(`${REST}/${table}${query ? "?" + query : ""}`, {
    method, headers: H, body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${method} ${table}?${query}: ${r.status} ${t}`);
  return t ? JSON.parse(t) : [];
}

export async function userByEmail(email) {
  const [u] = await db("GET", "users", `email=eq.${encodeURIComponent(email)}&select=*`);
  return u;
}

export async function tokenFor(userOrEmail) {
  const u = typeof userOrEmail === "string" ? await userByEmail(userOrEmail) : userOrEmail;
  if (!u) throw new Error(`no user ${userOrEmail}`);
  return new SignJWT({
    userId: u.id, role: u.role, email: u.email, firstName: u.first_name, lastName: u.last_name,
    hasPlan: true, coverage: "own",
  }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h").sign(SECRET);
}

export class Session {
  constructor(token) { this.token = token; }
  static async as(email) { return new Session(await tokenFor(email)); }
  async call(method, path, body, headers = {}) {
    const r = await fetch(BASE + path, {
      method,
      headers: { "content-type": "application/json", ...(this.token ? { cookie: `token=${this.token}` } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
    });
    const text = await r.text();
    let json; try { json = JSON.parse(text); } catch { json = undefined; }
    return { status: r.status, json, text };
  }
}

export const hash = (pw) => bcrypt.hashSync(pw, 10);

let passed = 0, failed = 0;
export async function step(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL ${name}\n       ${String(e.message).split("\n").join("\n       ").slice(0, 600)}`);
  }
}
export function expect(cond, msg) { if (!cond) throw new Error(msg); }
export function expectStatus(r, ...ok) {
  if (!ok.includes(r.status)) throw new Error(`expected ${ok.join("/")} got ${r.status}: ${r.text.slice(0, 300)}`);
  return r;
}
export function done() {
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

/** Make sure a patient holds an active hospital file where the doctor works (creates both rows if missing). */
export async function ensureShared(patientEmail, doctorEmail) {
  const p = await userByEmail(patientEmail);
  const d = await userByEmail(doctorEmail);
  let [s] = await db("GET", "staff", `user_id=eq.${d.id}&select=*`);
  if (!s) {
    const [f] = await db("GET", "facilities", "select=id&limit=1");
    [s] = await db("POST", "staff", "", { user_id: d.id, facility_id: f.id, role: "doctor", department: "General", hourly_rate: 100, file_number: `DR-T${Date.now() % 100000}`, status: "active" });
  }
  const [have] = await db("GET", "facility_patients", `facility_id=eq.${s.facility_id}&patient_id=eq.${p.id}&select=id`);
  if (have) await db("PATCH", "facility_patients", `id=eq.${have.id}`, { status: "active" });
  else await db("POST", "facility_patients", "", { facility_id: s.facility_id, patient_id: p.id, file_number: `PT-${Date.now()}`, status: "active" });
  return s.facility_id;
}
