/**
 * One-time (re-runnable) backfill: Mongo User + PatientProfile/PractitionerProfile/
 * HospitalAdminProfile -> Postgres users/patient_profiles/practitioner_profiles/
 * hospital_admin_profiles/patient_practitioner_links.
 *
 * Idempotent: every insert is an upsert keyed on mongo_id, safe to re-run.
 * Does NOT touch or delete anything in MongoDB.
 *
 * Run: node --env-file=.env.local node_modules/.bin/tsx scripts/migrate-users.ts
 */
import mongoose from "mongoose";
import * as dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

import User from "../lib/models/User";
import {
  PatientProfile,
  PractitionerProfile,
  HospitalAdminProfile,
} from "../lib/models/RoleProfiles";

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_SECRET_KEY in .env.local");
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not found in .env.local");
  await mongoose.connect(uri);
  const supabase = getSupabase();

  console.log("Connected to Mongo + Supabase. Starting backfill...\n");

  // ── 1. users ─────────────────────────────────────────────────────────────
  const mongoUsers = await User.find().lean();
  console.log(`Mongo users: ${mongoUsers.length}`);

  const userRows = mongoUsers.map((u: any) => ({
    mongo_id: u._id.toString(),
    email: u.email,
    password_hash: u.passwordHash || null,
    role: u.role,
    status: u.status || "active",
    first_name: u.firstName,
    last_name: u.lastName,
    sa_id: u.saId || null,
    mobile: u.mobile || null,
    phone_e164: u.phoneE164 || null,
    mfa_enabled: !!u.mfaEnabled,
    supabase_uid: u.supabaseUid || null,
    email_verified: u.emailVerified !== false,
    email_verified_at: u.emailVerifiedAt || null,
    otp_code_hash: u.otpCodeHash || null,
    otp_expires_at: u.otpExpiresAt || null,
    created_at: u.createdAt || new Date().toISOString(),
    updated_at: u.updatedAt || new Date().toISOString(),
  }));

  let userIdByMongoId = new Map<string, string>();
  for (const batch of chunk(userRows, 500)) {
    const { data, error } = await supabase
      .from("users")
      .upsert(batch, { onConflict: "mongo_id" })
      .select("id, mongo_id");
    if (error) throw new Error(`users upsert failed: ${error.message}`);
    for (const row of data || []) userIdByMongoId.set(row.mongo_id, row.id);
  }
  console.log(`Postgres users upserted: ${userIdByMongoId.size}\n`);

  // ── 2. patient_profiles + relationship links ────────────────────────────
  const patientProfiles = await PatientProfile.find().lean();
  console.log(`Mongo patient profiles: ${patientProfiles.length}`);

  const patientRows: any[] = [];
  const links: { patient_id: string; practitioner_id: string; link_type: string }[] = [];
  for (const p of patientProfiles as any[]) {
    const userId = userIdByMongoId.get(p.userId?.toString());
    if (!userId) {
      console.warn(`  skip patient profile ${p._id}: no matching user`);
      continue;
    }
    patientRows.push({
      mongo_id: p._id.toString(),
      user_id: userId,
      date_of_birth: p.dateOfBirth || null,
      gender: p.gender || null,
      emergency_contact_name: p.emergencyContact?.name || null,
      emergency_contact_phone: p.emergencyContact?.phone || null,
      emergency_contact_relationship: p.emergencyContact?.relationship || null,
      medical_aid_provider: p.medicalAid?.provider || null,
      medical_aid_plan_name: p.medicalAid?.planName || null,
      medical_aid_member_number: p.medicalAid?.memberNumber || null,
      subscription_tier: p.subscriptionTier || "free",
      popia_consent_date: p.popiaConsentDate || null,
      profile_photo: p.profilePhoto || null,
      medical_documents: p.medicalDocuments || [],
    });
    for (const fid of p.favoritePractitionerIds || []) {
      const practId = userIdByMongoId.get(fid.toString());
      if (practId) links.push({ patient_id: userId, practitioner_id: practId, link_type: "favorite" });
    }
    for (const mid of p.myDoctorIds || []) {
      const practId = userIdByMongoId.get(mid.toString());
      if (practId) links.push({ patient_id: userId, practitioner_id: practId, link_type: "my_doctor" });
    }
  }
  for (const batch of chunk(patientRows, 500)) {
    const { error } = await supabase.from("patient_profiles").upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`patient_profiles upsert failed: ${error.message}`);
  }
  console.log(`Postgres patient_profiles upserted: ${patientRows.length}`);

  // ── 3. practitioner_profiles + assignedPatientIds links ─────────────────
  const practitionerProfiles = await PractitionerProfile.find().lean();
  console.log(`\nMongo practitioner profiles: ${practitionerProfiles.length}`);

  const practitionerRows: any[] = [];
  for (const p of practitionerProfiles as any[]) {
    const userId = userIdByMongoId.get(p.userId?.toString());
    if (!userId) {
      console.warn(`  skip practitioner profile ${p._id}: no matching user`);
      continue;
    }
    practitionerRows.push({
      mongo_id: p._id.toString(),
      user_id: userId,
      specialisation: p.specialisation || null,
      bio: p.bio || null,
      hpcsa_number: p.hpcsaNumber,
      experience_years: p.experienceYears ?? null,
      languages: p.languages || [],
      accepted_medical_aids: p.acceptedMedicalAids || [],
      achievements: p.achievements || [],
      rating: p.rating || 0,
      review_count: p.reviewCount || 0,
      is_online: !!p.isOnline,
      profile_photo: p.profilePhoto || null,
      hpcsa_certificate: p.hpcsaCertificate || null,
      bank_account_holder: p.bankAccount?.accountHolder || null,
      bank_name: p.bankAccount?.bankName || null,
      bank_account_number: p.bankAccount?.accountNumber || null,
      bank_branch_code: p.bankAccount?.branchCode || null,
      tax_number: p.bankAccount?.taxNumber || null,
      address_street: p.address?.street || null,
      address_city: p.address?.city || null,
      address_province: p.address?.province || null,
    });
    for (const aid of p.assignedPatientIds || []) {
      const patId = userIdByMongoId.get(aid.toString());
      if (patId) links.push({ patient_id: patId, practitioner_id: userId, link_type: "assigned" });
    }
  }
  for (const batch of chunk(practitionerRows, 500)) {
    const { error } = await supabase
      .from("practitioner_profiles")
      .upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`practitioner_profiles upsert failed: ${error.message}`);
  }
  console.log(`Postgres practitioner_profiles upserted: ${practitionerRows.length}`);

  // ── 4. relationship links (dedupe, then upsert) ──────────────────────────
  const dedupedLinks = Array.from(
    new Map(links.map((l) => [`${l.patient_id}:${l.practitioner_id}:${l.link_type}`, l])).values(),
  );
  for (const batch of chunk(dedupedLinks, 500)) {
    const { error } = await supabase
      .from("patient_practitioner_links")
      .upsert(batch, { onConflict: "patient_id,practitioner_id,link_type" });
    if (error) throw new Error(`patient_practitioner_links upsert failed: ${error.message}`);
  }
  console.log(`\nPostgres patient_practitioner_links upserted: ${dedupedLinks.length}`);

  // ── 5. hospital_admin_profiles ────────────────────────────────────────────
  const adminProfiles = await HospitalAdminProfile.find().lean();
  console.log(`\nMongo hospital admin profiles: ${adminProfiles.length}`);

  const adminRows: any[] = [];
  for (const p of adminProfiles as any[]) {
    const userId = userIdByMongoId.get(p.userId?.toString());
    if (!userId) {
      console.warn(`  skip hospital admin profile ${p._id}: no matching user`);
      continue;
    }
    adminRows.push({
      mongo_id: p._id.toString(),
      user_id: userId,
      facility_id: null, // backfilled by the facility-domain migration (needs facilities table + mongo_id mapping)
      department: p.department || null,
      permissions: p.permissions || [],
    });
  }
  for (const batch of chunk(adminRows, 500)) {
    const { error } = await supabase
      .from("hospital_admin_profiles")
      .upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`hospital_admin_profiles upsert failed: ${error.message}`);
  }
  console.log(`Postgres hospital_admin_profiles upserted: ${adminRows.length}`);

  console.log("\nBackfill complete.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
