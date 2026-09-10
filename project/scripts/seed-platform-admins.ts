/**
 * Bootstraps the two platform admin accounts (mega_admin, super_admin).
 *
 * There is no in-app way to create these roles — normal registration only
 * offers patient/practitioner/hospital, and the admin API only lists/suspends
 * existing users, by design (see lib/auth/adminRoles.ts: only an existing
 * mega_admin can assign super_admin/mega_admin, and there's no UI for it
 * yet). This script is the bootstrap path for the very first ones.
 *
 * Usage:
 *   node --env-file=.env.local node_modules/.bin/tsx scripts/seed-platform-admins.ts
 *   npm run seed:admins
 *
 * Passwords: pass MEGA_ADMIN_PASSWORD / SUPER_ADMIN_PASSWORD as env vars to
 * set them yourself; otherwise a strong random password is generated for
 * each and printed ONCE at the end. Nothing is written to disk or logged
 * anywhere else — copy them immediately, they cannot be recovered afterward
 * (only reset via a fresh password-reset flow).
 *
 * Safe to re-run: an email that already exists is reported and skipped
 * rather than duplicated or overwritten.
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

import User from "../lib/models/User";
import { syncUser } from "../lib/postgres/users";

function generatePassword(): string {
  // 16 chars, mixed alphanumeric + symbols, cryptographically random.
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
  const bytes = crypto.randomBytes(16);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

const ACCOUNTS = [
  {
    email: "mega@digi-health.co.za",
    role: "mega_admin" as const,
    firstName: "Mega",
    lastName: "Admin",
    passwordEnvVar: "MEGA_ADMIN_PASSWORD",
  },
  {
    email: "super@digi-health.co.za",
    role: "super_admin" as const,
    firstName: "Super",
    lastName: "Admin",
    passwordEnvVar: "SUPER_ADMIN_PASSWORD",
  },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error(
      "MONGODB_URI not found in environment. Check your .env.local file.",
    );
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri);

  const credentialsToShow: { email: string; role: string; password: string }[] =
    [];

  for (const account of ACCOUNTS) {
    const existing = await User.findOne({ email: account.email });
    if (existing) {
      console.log(
        `Skipped ${account.email} — a user with this email already exists (role: ${existing.role}).`,
      );
      continue;
    }

    const password =
      process.env[account.passwordEnvVar] || generatePassword();
    const passwordHash = await bcrypt.hash(password, await bcrypt.genSalt(10));

    const newUser = await User.create({
      email: account.email,
      passwordHash,
      role: account.role,
      firstName: account.firstName,
      lastName: account.lastName,
      status: "active",
      emailVerified: true,
      mfaEnabled: false,
    } as any);

    await syncUser(newUser as any);

    credentialsToShow.push({
      email: account.email,
      role: account.role,
      password,
    });
    console.log(`Created ${account.email} (${account.role}).`);
  }

  await mongoose.disconnect();

  if (credentialsToShow.length > 0) {
    console.log(
      "\n=== SAVE THESE NOW — shown only once, not stored anywhere ===",
    );
    for (const c of credentialsToShow) {
      console.log(`  ${c.role.padEnd(11)} ${c.email}  ${c.password}`);
    }
    console.log("===============================================\n");
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
