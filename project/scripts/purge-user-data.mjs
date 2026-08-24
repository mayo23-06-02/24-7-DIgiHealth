#!/usr/bin/env node
/**
 * Purge every trace of one account, so the same address can be reused for
 * repeated end-to-end testing.
 *
 *   node scripts/purge-user-data.mjs someone@example.com            # dry run
 *   node scripts/purge-user-data.mjs someone@example.com --confirm  # delete
 *
 * This is irreversible and there is no undo, so it refuses to delete anything
 * until --confirm is passed. A dry run prints exactly what would go.
 *
 * The account may exist twice over: a Postgres uuid in Supabase, and a Mongo
 * ObjectId from before the migration. Rows in other tables may be keyed on
 * either, so both ids are resolved first and everything is matched against
 * both.
 *
 * Requires SUPABASE_URL + SUPABASE_SECRET_KEY and MONGODB_URI in the
 * environment (or a .env.local holding real values -- a scrubbed file with
 * placeholder values will not work).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/* ---------------------------------------------------------------- env --- */

function loadEnv() {
  const file = path.join(ROOT, ".env.local");
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const i = line.indexOf("=");
      const key = line.slice(0, i).trim();
      const val = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  }
}
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const MONGODB_URI = process.env.MONGODB_URI;
const MEDIA_BUCKET = process.env.MEDIA_BUCKET || "media";

/* --------------------------------------------------------------- args --- */

const args = process.argv.slice(2);
const email = args.find((a) => !a.startsWith("--"));
const CONFIRM = args.includes("--confirm");

if (!email || !email.includes("@")) {
  console.error("Usage: node scripts/purge-user-data.mjs <email> [--confirm]");
  process.exit(1);
}

/**
 * Deleting every account on the platform because of a stray argument is the
 * one mistake this script must make impossible.
 */
if (email === "*" || email.startsWith("%")) {
  console.error("Refusing a wildcard. Pass one exact address.");
  process.exit(1);
}

const totals = { supabase: 0, mongo: 0, storage: 0 };
const plan = [];

function note(scope, detail, count) {
  if (count > 0) {
    plan.push(`  ${scope.padEnd(10)} ${String(count).padStart(5)}  ${detail}`);
    totals[scope] += count;
  }
}

/* ----------------------------------------------------------- supabase --- */

const sb = (p, init = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${p}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${SUPABASE_KEY}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });

/**
 * Tables are probed rather than assumed. A table or column that does not exist
 * yet simply returns an error, which is skipped -- so this keeps working as
 * the schema moves rather than needing to be kept in lockstep with it.
 */
const USER_COLUMNS = [
  "user_id", "patient_id", "practitioner_id", "guardian_id", "member_id",
  "uploaded_by", "created_by", "sender_id", "recipient_id", "initiated_by",
  "requested_by", "reviewed_by", "owner_id", "staff_user_id",
];

const SUPABASE_TABLES = [
  "media_assets", "notifications", "messages", "conversations", "calls",
  "consultations", "prescriptions", "reviews", "risk_scores", "patient_events",
  "patient_allergies", "patient_practitioner_links", "patient_profiles",
  "practitioner_profiles", "practitioner_facilities", "practitioner_schedules",
  "practitioner_schedule_slots", "hospital_admin_profiles",
  "hospital_appointments", "staff", "staff_invites", "subscriptions",
  "payment_methods", "payment_transactions", "payout_requests",
  "medical_context", "immunizations", "anthropometrics", "lab_results",
  "lab_result_parameters", "body_annotations", "attached_records",
  "clinical_decision_support", "ai_triage_sessions", "audit_logs",
  "offline_action_queue",
];

async function countRows(table, column, value) {
  const res = await sb(`${table}?${column}=eq.${encodeURIComponent(value)}&select=*`, {
    headers: { Prefer: "count=exact", Range: "0-0" },
  });
  if (!res.ok) return null; // table or column absent — nothing to do
  const range = res.headers.get("content-range"); // e.g. "0-0/12"
  const total = range?.split("/")?.[1];
  return total && total !== "*" ? Number(total) : 0;
}

async function deleteRows(table, column, value) {
  const res = await sb(`${table}?${column}=eq.${encodeURIComponent(value)}`, {
    method: "DELETE",
  });
  return res.ok;
}

/* -------------------------------------------------------------- main --- */

async function main() {
  console.log(`\nPurging: ${email}`);
  console.log(CONFIRM ? "Mode:    DELETE (irreversible)" : "Mode:    dry run — nothing will be deleted");
  console.log("─".repeat(66));

  if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL.length < 12) {
    console.error(
      "\nSupabase credentials missing or placeholder.\n" +
        "Pull real values first:  vercel env pull .env.local",
    );
    process.exit(1);
  }

  /* ---- resolve identities ---- */
  const uRes = await sb(`users?email=eq.${encodeURIComponent(email)}&select=id,mongo_id,email,role`);
  if (!uRes.ok) {
    console.error("Could not read users table:", uRes.status, await uRes.text());
    process.exit(1);
  }
  const users = await uRes.json();

  const ids = new Set();
  for (const u of users) {
    if (u.id) ids.add(u.id);
    if (u.mongo_id) ids.add(u.mongo_id);
  }

  // The Mongo user may exist without a Supabase row at all.
  let mongo = null;
  if (MONGODB_URI) {
    const { MongoClient } = await import("mongodb");
    mongo = new MongoClient(MONGODB_URI);
    await mongo.connect();
    const db = mongo.db();
    const doc = await db.collection("users").findOne({ email });
    if (doc?._id) ids.add(doc._id.toString());
  }

  if (ids.size === 0) {
    console.log("\nNo account found for that address — nothing to purge.");
    await mongo?.close();
    return;
  }

  console.log(`\nIdentities resolved: ${[...ids].join(", ")}\n`);

  /* ---- storage objects first: once media_assets rows go, the paths that
         point at the stored files are gone with them ---- */
  const filePaths = [];
  for (const id of ids) {
    const res = await sb(`media_assets?user_id=eq.${id}&select=file_path`);
    if (res.ok) for (const r of await res.json()) if (r.file_path) filePaths.push(r.file_path);
  }
  note("storage", `objects in ${MEDIA_BUCKET}/`, filePaths.length);

  /* ---- count everything ---- */
  const supabaseHits = [];
  for (const table of SUPABASE_TABLES) {
    for (const column of USER_COLUMNS) {
      for (const id of ids) {
        const n = await countRows(table, column, id);
        if (n) {
          supabaseHits.push({ table, column, id, n });
          note("supabase", `${table}.${column}`, n);
        }
      }
    }
  }

  const mongoHits = [];
  if (mongo) {
    const db = mongo.db();
    const collections = await db.listCollections().toArray();
    const MONGO_FIELDS = [
      "userId", "patientId", "practitionerId", "guardianId", "memberId",
      "uploadedBy", "createdBy", "senderId", "recipientId", "initiatedBy",
      "requestedBy", "requestedTo", "reviewedBy",
    ];
    const { ObjectId } = await import("mongodb");
    const candidates = [...ids].flatMap((id) =>
      ObjectId.isValid(id) ? [id, new ObjectId(id)] : [id],
    );

    for (const { name } of collections) {
      if (name === "users") continue; // handled last, on purpose
      for (const field of MONGO_FIELDS) {
        const n = await db.collection(name).countDocuments({ [field]: { $in: candidates } });
        if (n) {
          mongoHits.push({ name, field, n });
          note("mongo", `${name}.${field}`, n);
        }
      }
    }
    const userDocs = await db.collection("users").countDocuments({ email });
    if (userDocs) note("mongo", "users (the account itself)", userDocs);
  }

  const supaUsers = users.length;
  if (supaUsers) note("supabase", "users (the account itself)", supaUsers);

  /* ---- report ---- */
  if (plan.length === 0) {
    console.log("Nothing to delete — the account has no associated data.");
    await mongo?.close();
    return;
  }
  console.log("Would delete:" + (CONFIRM ? " (proceeding)" : ""));
  console.log(plan.join("\n"));
  console.log("─".repeat(66));
  console.log(
    `  totals: supabase ${totals.supabase}, mongo ${totals.mongo}, storage ${totals.storage}\n`,
  );

  if (!CONFIRM) {
    console.log("Dry run only. Re-run with --confirm to delete.\n");
    await mongo?.close();
    return;
  }

  /* ---- delete ---- */
  if (filePaths.length) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${MEDIA_BUCKET}`, {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_KEY,
        authorization: `Bearer ${SUPABASE_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ prefixes: filePaths }),
    });
    console.log(res.ok ? `✓ storage: ${filePaths.length} objects` : `✗ storage: ${await res.text()}`);
  }

  for (const { table, column, id, n } of supabaseHits) {
    const ok = await deleteRows(table, column, id);
    console.log(ok ? `✓ ${table}.${column} (${n})` : `✗ ${table}.${column}`);
  }

  if (mongo) {
    const db = mongo.db();
    const { ObjectId } = await import("mongodb");
    const candidates = [...ids].flatMap((id) =>
      ObjectId.isValid(id) ? [id, new ObjectId(id)] : [id],
    );
    for (const { name, field } of mongoHits) {
      const r = await db.collection(name).deleteMany({ [field]: { $in: candidates } });
      console.log(`✓ mongo ${name}.${field} (${r.deletedCount})`);
    }
    const r = await db.collection("users").deleteMany({ email });
    console.log(`✓ mongo users (${r.deletedCount})`);
  }

  // The account row goes last, so a failure part-way through still leaves the
  // identity resolvable for a re-run rather than orphaning everything else.
  for (const u of users) {
    const ok = await deleteRows("users", "id", u.id);
    console.log(ok ? `✓ supabase users (${u.id})` : `✗ supabase users (${u.id})`);
  }

  console.log(`\nDone. ${email} can be registered again from scratch.\n`);
  await mongo?.close();
}

main().catch((err) => {
  console.error("\nPurge failed:", err);
  process.exit(1);
});
