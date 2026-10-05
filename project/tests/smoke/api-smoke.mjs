// Calls every static GET route under a role's API prefix with a session for that role
// and reports non-2xx responses. Run against a dev server pointed at a SEEDED DEV database:
//   BASE=http://localhost:3100 SUPABASE_REST=http://localhost:3002 SUPABASE_SECRET_KEY=... JWT_SECRET=... node tests/smoke/api-smoke.mjs
import { SignJWT } from "jose";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3100";
const REST = process.env.SUPABASE_REST ?? "http://localhost:3002/rest/v1";
const KEY = process.env.SUPABASE_SECRET_KEY;
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
if (!KEY || !process.env.JWT_SECRET) throw new Error("SUPABASE_SECRET_KEY and JWT_SECRET required");

async function rest(table, query) {
  const r = await fetch(`${REST}/${table}?${query}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  return r.json();
}

async function tokenFor(email) {
  const [u] = await rest("users", `email=eq.${email}&select=id,role,email,first_name,last_name`);
  if (!u) throw new Error(`no user ${email}`);
  return new SignJWT({
    userId: u.id, role: u.role, email: u.email, firstName: u.first_name, lastName: u.last_name,
    hasPlan: true, coverage: "own",
  }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h").sign(SECRET);
}

function routesUnder(prefix) {
  const root = path.join(process.cwd(), "app/api", prefix);
  const out = [];
  (function walk(dir, url) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (e.name.startsWith("[")) continue; // dynamic segment
        walk(path.join(dir, e.name), `${url}/${e.name}`);
      } else if (e.name === "route.ts") {
        const src = fs.readFileSync(path.join(dir, e.name), "utf8");
        if (/export\s+(async\s+)?function\s+GET/.test(src)) out.push(url);
      }
    }
  })(root, `/api/${prefix}`);
  return out;
}

const personas = [
  { prefix: "patient", email: "john.dlamini@example.com" },
  { prefix: "practitioner", email: "mitchell@247digihealth.com" },
  { prefix: "hospital", email: "admin@milpark.netcare.co.za" },
  { prefix: "admin", email: "mega@247digihealth.com" },
  { prefix: "conversations", email: "john.dlamini@example.com" },
  { prefix: "chat", email: "john.dlamini@example.com" },
  { prefix: "billing", email: "john.dlamini@example.com" },
  { prefix: "user", email: "john.dlamini@example.com" },
  { prefix: "notifications", email: "john.dlamini@example.com" },
];

let bad = 0, total = 0;
for (const { prefix, email } of personas) {
  const token = await tokenFor(email);
  for (const url of routesUnder(prefix)) {
    total++;
    try {
      const r = await fetch(BASE + url, { headers: { cookie: `token=${token}`, "x-user-id": "" } , redirect: "manual" });
      const ok = r.status < 400;
      if (!ok) {
        bad++;
        const body = (await r.text()).slice(0, 200).replace(/\s+/g, " ");
        console.log(`${r.status} ${url} (${email}) ${body}`);
      }
    } catch (e) {
      bad++;
      console.log(`ERR ${url}: ${e.message}`);
    }
  }
}
console.log(`\n${total - bad}/${total} ok`);
process.exit(bad ? 1 : 0);
