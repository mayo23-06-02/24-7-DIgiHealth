/**
 * Seeds two PLATFORM (mega_admin) accounts. Additive and re-runnable: it creates
 * the accounts if missing, or resets their role, status and password if they
 * already exist. It never wipes or touches any other data.
 *
 * The password is read from an environment variable so it is not stored in the
 * repo (set it in the same shell session you run the script from).
 *
 * Run (dev databases only):
 *   PowerShell:  $env:ALLOW_SEED="true"; $env:PLATFORM_ADMIN_PASSWORD='D*g*Health@2026'; npx tsx scripts/seed-platform-admins.ts
 *   bash:        ALLOW_SEED=true PLATFORM_ADMIN_PASSWORD='D*g*Health@2026' npx tsx scripts/seed-platform-admins.ts
 */
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Dev-only credentials first (dotenv never overrides values already set).
dotenv.config({ path: path.join(__dirname, "../.env.seed.local") });
dotenv.config({ path: path.join(__dirname, "../.env.local") });

// ---- PRODUCTION GUARD ----
const PROTECTED_PROJECT_REFS = [
  "cagmxeebwtjrbaemwdwj", // production
  ...(process.env.PROTECTED_SUPABASE_REFS ?? "").split(",").map((r) => r.trim()).filter(Boolean),
];
function assertSafeToSeed() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (process.env.ALLOW_SEED !== "true") {
    throw new Error("Refusing to seed: set ALLOW_SEED=true to confirm this is a dev database.");
  }
  if (process.env.APP_ENV === "production" || process.env.VERCEL_ENV === "production") {
    throw new Error("Refusing to seed: APP_ENV/VERCEL_ENV is production.");
  }
  const hit = PROTECTED_PROJECT_REFS.find((ref) => url.includes(ref));
  if (hit) throw new Error(`Refusing to seed: ${url} is a protected (production) Supabase project.`);
}
assertSafeToSeed();

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SECRET_KEY");
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const password = process.env.PLATFORM_ADMIN_PASSWORD;
if (!password || password.length < 8) {
  throw new Error("Set PLATFORM_ADMIN_PASSWORD (at least 8 characters) in the shell before running.");
}

const ADMINS = [
  { email: "admin@digi-health.co.za", first_name: "Amanda", last_name: "Mazwi" },
  { email: "mayo@razonetix.com", first_name: "Mayibongwe", last_name: "Mahlalela" },
];

async function main() {
  const password_hash = bcrypt.hashSync(password as string, 10);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("users")
    .upsert(
      ADMINS.map((a) => ({
        email: a.email.toLowerCase(),
        password_hash,
        role: "mega_admin",
        first_name: a.first_name,
        last_name: a.last_name,
        status: "active",
        email_verified: true,
        email_verified_at: now,
      })),
      { onConflict: "email" },
    )
    .select("id, email, role, status");

  if (error) throw new Error(`users upsert failed: ${error.message}`);

  console.log("\n====== PLATFORM ADMINS READY ======");
  for (const u of data ?? []) console.log(`  ${u.email}  [${u.role}, ${u.status}]`);
  console.log("Password: the value of PLATFORM_ADMIN_PASSWORD you set for this run.");
  console.log("===================================\n");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});