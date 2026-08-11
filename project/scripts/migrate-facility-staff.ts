/**
 * One-time (re-runnable) backfill: Mongo Facility/Staff/StaffInvite/
 * HospitalAppointment/BedOccupancy -> Postgres facilities/staff/
 * staff_invites/hospital_appointments/bed_occupancy.
 *
 * Depends on users already being backfilled (scripts/migrate-users.ts) —
 * uses their mongo_id -> uuid mapping to resolve user_id/practitioner_id
 * FKs. Also backfills the facility_id FK on hospital_admin_profiles /
 * practitioner_facilities left null by migrate-users.ts, and links
 * PractitionerProfile.affiliatedFacilityIds into practitioner_facilities.
 *
 * Idempotent: every insert is an upsert keyed on mongo_id, safe to re-run.
 * Does NOT touch or delete anything in MongoDB.
 *
 * Run: npx tsx scripts/migrate-facility-staff.ts
 */
import mongoose from "mongoose";
import * as dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

import Facility from "../lib/models/Facility";
import Staff from "../lib/models/Staff";
import StaffInvite from "../lib/models/StaffInvite";
import HospitalAppointment from "../lib/models/HospitalAppointment";
import BedOccupancy from "../lib/models/BedOccupancy";
import { HospitalAdminProfile, PractitionerProfile } from "../lib/models/RoleProfiles";

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SECRET_KEY in .env.local");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function mapFacilityType(t?: string): "Public" | "Private" | "NGO" | null {
  if (!t) return null;
  const norm = t.toLowerCase();
  if (norm === "public") return "Public";
  if (norm === "private") return "Private";
  if (norm === "ngo") return "NGO";
  // Some rows may already hold the correctly-cased value.
  if (t === "Public" || t === "Private" || t === "NGO") return t as any;
  return null;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not found in .env.local");
  await mongoose.connect(uri);
  const supabase = getSupabase();

  console.log("Connected to Mongo + Supabase. Starting facility/staff backfill...\n");

  // ── 0. load the user mongo_id -> uuid map (needed for every FK below) ────
  const { data: userRows, error: userErr } = await supabase.from("users").select("id, mongo_id");
  if (userErr) throw new Error(`failed to load users: ${userErr.message}`);
  const userIdByMongoId = new Map((userRows || []).map((r: any) => [r.mongo_id, r.id]));
  console.log(`Loaded ${userIdByMongoId.size} user id mappings.\n`);

  // ── 1. facilities ─────────────────────────────────────────────────────────
  const facilities = await Facility.find().lean();
  console.log(`Mongo facilities: ${facilities.length}`);

  const facilityRows = (facilities as any[]).map((f) => ({
    mongo_id: f._id.toString(),
    name: f.name,
    facility_type: mapFacilityType(f.facilityType),
    address_street: f.address?.street || null,
    address_city: f.address?.city || null,
    address_province: f.address?.province || null,
    location_lat: f.address?.coordinates?.[1] ?? null,
    location_lng: f.address?.coordinates?.[0] ?? null,
    contact_phone: f.contactInfo?.phone || null,
    contact_emergency_phone: f.contactInfo?.emergencyPhone || null,
    contact_email: f.contactInfo?.email || null,
    bed_total: f.bedCapacity?.total || 0,
    bed_general_available: f.bedCapacity?.generalAvailable || 0,
    bed_icu_available: f.bedCapacity?.icuAvailable || 0,
    current_wait_time_mins: f.currentWaitTimeMins || 0,
    is_open: f.isOpen !== false,
    specialties: f.specialties || [],
    emergency_services: !!f.emergencyServices,
    logo: f.logo || null,
    wallpaper: f.wallpaper || null,
    reg_certificate: f.regCertificate || null,
  }));

  let facilityIdByMongoId = new Map<string, string>();
  for (const batch of chunk(facilityRows, 500)) {
    const { data, error } = await supabase
      .from("facilities")
      .upsert(batch, { onConflict: "mongo_id" })
      .select("id, mongo_id");
    if (error) throw new Error(`facilities upsert failed: ${error.message}`);
    for (const row of data || []) facilityIdByMongoId.set(row.mongo_id, row.id);
  }
  console.log(`Postgres facilities upserted: ${facilityIdByMongoId.size}\n`);

  // ── 2. staff ──────────────────────────────────────────────────────────────
  const staff = await Staff.find().lean();
  console.log(`Mongo staff: ${staff.length}`);

  const staffRows: any[] = [];
  for (const s of staff as any[]) {
    const facilityId = facilityIdByMongoId.get(s.facilityId?.toString());
    if (!facilityId) {
      console.warn(`  skip staff ${s._id}: no matching facility`);
      continue;
    }
    staffRows.push({
      mongo_id: s._id.toString(),
      user_id: s.userId ? userIdByMongoId.get(s.userId.toString()) || null : null,
      facility_id: facilityId,
      role: s.role,
      department: s.department,
      shift_start: s.shiftSchedule?.start || null,
      shift_end: s.shiftSchedule?.end || null,
      shift_days: s.shiftSchedule?.days || [],
      is_on_duty: !!s.isOnDuty,
      hourly_rate: s.hourlyRate || 0,
      qualifications: s.qualifications || [],
    });
  }
  for (const batch of chunk(staffRows, 500)) {
    const { error } = await supabase.from("staff").upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`staff upsert failed: ${error.message}`);
  }
  console.log(`Postgres staff upserted: ${staffRows.length}\n`);

  // ── 3. staff_invites ──────────────────────────────────────────────────────
  const invites = await StaffInvite.find().lean();
  console.log(`Mongo staff invites: ${invites.length}`);

  const inviteRows: any[] = [];
  for (const inv of invites as any[]) {
    const facilityId = facilityIdByMongoId.get(inv.facilityId?.toString());
    const invitedBy = userIdByMongoId.get(inv.invitedBy?.toString());
    if (!facilityId || !invitedBy) {
      console.warn(`  skip invite ${inv._id}: missing facility or inviter`);
      continue;
    }
    inviteRows.push({
      mongo_id: inv._id.toString(),
      email: inv.email,
      facility_id: facilityId,
      invited_by: invitedBy,
      token: inv.token,
      status: inv.status || "pending",
      shift_start: inv.shiftStart || "08:00",
      shift_end: inv.shiftEnd || "16:00",
      hourly_rate: inv.hourlyRate || 0,
      expires_at: inv.expiresAt,
      accepted_at: inv.acceptedAt || null,
    });
  }
  for (const batch of chunk(inviteRows, 500)) {
    const { error } = await supabase.from("staff_invites").upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`staff_invites upsert failed: ${error.message}`);
  }
  console.log(`Postgres staff_invites upserted: ${inviteRows.length}\n`);

  // ── 4. hospital_appointments ──────────────────────────────────────────────
  const appts = await HospitalAppointment.find().lean();
  console.log(`Mongo hospital appointments: ${appts.length}`);

  const apptRows: any[] = [];
  for (const a of appts as any[]) {
    const facilityId = facilityIdByMongoId.get(a.facilityId?.toString());
    const patientId = userIdByMongoId.get(a.patientId?.toString());
    const practitionerId = userIdByMongoId.get(a.practitionerId?.toString());
    if (!facilityId || !patientId || !practitionerId) {
      console.warn(`  skip appointment ${a._id}: missing facility/patient/practitioner`);
      continue;
    }
    apptRows.push({
      mongo_id: a._id.toString(),
      facility_id: facilityId,
      patient_id: patientId,
      practitioner_id: practitionerId,
      type: a.type,
      scheduled_start: a.scheduledStart,
      scheduled_end: a.scheduledEnd,
      status: a.status || "scheduled",
      room: a.room,
    });
  }
  for (const batch of chunk(apptRows, 500)) {
    const { error } = await supabase
      .from("hospital_appointments")
      .upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`hospital_appointments upsert failed: ${error.message}`);
  }
  console.log(`Postgres hospital_appointments upserted: ${apptRows.length}\n`);

  // ── 5. bed_occupancy ──────────────────────────────────────────────────────
  const occupancy = await BedOccupancy.find().lean();
  console.log(`Mongo bed occupancy rows: ${occupancy.length}`);

  const occupancyRows: any[] = [];
  for (const o of occupancy as any[]) {
    const facilityId = facilityIdByMongoId.get(o.facilityId?.toString());
    if (!facilityId) {
      console.warn(`  skip bed occupancy ${o._id}: no matching facility`);
      continue;
    }
    occupancyRows.push({
      mongo_id: o._id.toString(),
      facility_id: facilityId,
      total_beds: o.totalBeds,
      occupied_beds: o.occupiedBeds,
      icu_occupied: o.icuOccupied || 0,
      emergency_occupied: o.emergencyOccupied || 0,
      recorded_at: o.timestamp || o.createdAt || new Date().toISOString(),
    });
  }
  for (const batch of chunk(occupancyRows, 500)) {
    const { error } = await supabase.from("bed_occupancy").upsert(batch, { onConflict: "mongo_id" });
    if (error) throw new Error(`bed_occupancy upsert failed: ${error.message}`);
  }
  console.log(`Postgres bed_occupancy upserted: ${occupancyRows.length}\n`);

  // ── 6. backfill hospital_admin_profiles.facility_id (left null by
  //      migrate-users.ts, which ran before facilities existed) ────────────
  const adminProfiles = await HospitalAdminProfile.find().lean();
  let adminFacilityUpdates = 0;
  for (const p of adminProfiles as any[]) {
    const facilityId = facilityIdByMongoId.get(p.hospitalId?.toString());
    if (!facilityId) continue;
    const { error } = await supabase
      .from("hospital_admin_profiles")
      .update({ facility_id: facilityId })
      .eq("mongo_id", p._id.toString());
    if (!error) adminFacilityUpdates++;
  }
  console.log(`Postgres hospital_admin_profiles.facility_id backfilled: ${adminFacilityUpdates}\n`);

  // ── 7. practitioner_facilities (from PractitionerProfile.affiliatedFacilityIds) ─
  const practitionerProfiles = await PractitionerProfile.find().lean();
  const affiliations: { practitioner_id: string; facility_id: string }[] = [];
  for (const p of practitionerProfiles as any[]) {
    const practitionerId = userIdByMongoId.get(p.userId?.toString());
    if (!practitionerId) continue;
    for (const fid of p.affiliatedFacilityIds || []) {
      const facilityId = facilityIdByMongoId.get(fid.toString());
      if (facilityId) affiliations.push({ practitioner_id: practitionerId, facility_id: facilityId });
    }
  }
  const dedupedAffiliations = Array.from(
    new Map(affiliations.map((a) => [`${a.practitioner_id}:${a.facility_id}`, a])).values(),
  );
  for (const batch of chunk(dedupedAffiliations, 500)) {
    const { error } = await supabase
      .from("practitioner_facilities")
      .upsert(batch, { onConflict: "practitioner_id,facility_id" });
    if (error) throw new Error(`practitioner_facilities upsert failed: ${error.message}`);
  }
  console.log(`Postgres practitioner_facilities upserted: ${dedupedAffiliations.length}`);

  console.log("\nBackfill complete.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
