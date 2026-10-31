/**
 * ONE-SHOT RESET + SEED (Supabase dev database)
 *
 *   1. Wipes every app table (rows only; schema and migrations stay)
 *   2. Creates the platform admins (mega_admin): Amanda Mazwi + Mayo
 *   3. Creates global content: system config, platform fee config, articles, health tips
 *   4. Creates two fictional hospitals, each with its own hospital admin,
 *      5 doctors and 5 patients plus clinical, consultation, messaging,
 *      scheduling and billing data:
 *        - Baobab Private Hospital (Johannesburg)  -> logins use makabmahlalela+...@gmail.com
 *        - Sunbird Regional Hospital (Durban)      -> logins use aymish143+...@gmail.com
 *
 * DESTRUCTIVE. Dev databases only. Refuses to run against production.
 *
 * Run:
 *   PowerShell:
 *     $env:ALLOW_SEED="true"; $env:PLATFORM_ADMIN_PASSWORD='D*g*Health@2026'; npx tsx scripts/seed-all.ts
 *   bash:
 *     ALLOW_SEED=true PLATFORM_ADMIN_PASSWORD='D*g*Health@2026' npx tsx scripts/seed-all.ts
 *
 *   Add --yes to skip the "type RESET" confirmation prompt.
 *
 * Hospital accounts use the password: Password123!
 * Platform admins use the value of PLATFORM_ADMIN_PASSWORD.
 */
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";
import * as dotenv from "dotenv";
import path from "path";
import readline from "readline";
import { createClient } from "@supabase/supabase-js";

// Dev-only credentials first (dotenv never overrides values already set).
dotenv.config({ path: path.join(__dirname, "../.env.seed.local") });
dotenv.config({ path: path.join(__dirname, "../.env.local") });

// ---- PRODUCTION GUARD ----
const PROTECTED_PROJECT_REFS = [
  "cagmxeebwtjrbaemwdwj", // production
  ...(process.env.PROTECTED_SUPABASE_REFS ?? "").split(",").map((r) => r.trim()).filter(Boolean),
];
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
function assertSafeToSeed() {
  if (process.env.ALLOW_SEED !== "true") {
    throw new Error("Refusing to seed: set ALLOW_SEED=true to confirm this is a dev database.");
  }
  if (process.env.APP_ENV === "production" || process.env.VERCEL_ENV === "production") {
    throw new Error("Refusing to seed: APP_ENV/VERCEL_ENV is production.");
  }
  const hit = PROTECTED_PROJECT_REFS.find((ref) => SUPABASE_URL.includes(ref));
  if (hit) throw new Error(`Refusing to seed: ${SUPABASE_URL} is a protected (production) Supabase project.`);
}
assertSafeToSeed();

const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Missing SUPABASE_URL / SUPABASE_SECRET_KEY");
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// Fail fast, BEFORE anything is wiped.
const PLATFORM_ADMIN_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD;
if (!PLATFORM_ADMIN_PASSWORD || PLATFORM_ADMIN_PASSWORD.length < 8) {
  throw new Error("Set PLATFORM_ADMIN_PASSWORD (at least 8 characters) in the shell before running.");
}

// ---- HELPERS ----
const hash = (pw: string) => bcrypt.hashSync(pw, 10);
const subDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() - n); return r; };
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);
const pickOne = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const pickSome = <T,>(arr: T[], min = 1, max = 3): T[] => {
  const count = randInt(min, Math.min(max, arr.length));
  return [...arr].sort(() => 0.5 - Math.random()).slice(0, count);
};
const generateSAId = (dob: Date, female: boolean) => {
  const y = dob.getFullYear().toString().slice(-2);
  const m = (dob.getMonth() + 1).toString().padStart(2, "0");
  const d = dob.getDate().toString().padStart(2, "0");
  const g = female ? randInt(0, 4999).toString().padStart(4, "0") : randInt(5000, 9999).toString().padStart(4, "0");
  return `${y}${m}${d}${g}0${faker.string.numeric(2)}`;
};

async function insertBatch<T extends Record<string, unknown>>(table: string, rows: T[], select = "id"): Promise<any[]> {
  const out: any[] = [];
  for (let i = 0; i < rows.length; i += 500) {
    const { data, error } = await supabase.from(table).insert(rows.slice(i, i + 500)).select(select);
    if (error) throw new Error(`${table} insert failed: ${error.message}`);
    out.push(...(data || []));
  }
  return out;
}

function confirmReset(): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question('This permanently deletes ALL data in the target database. Type "RESET" to continue: ', (a) => {
      rl.close();
      resolve(a.trim() === "RESET");
    });
  });
}

// ---- SHARED DATA POOLS ----
const CHRONIC_CONDITIONS = ["Hypertension", "Type 2 Diabetes", "Asthma", "Hypothyroidism", "Hyperlipidemia", "Anxiety Disorder", "Migraine", "Osteoporosis", "Chronic Back Pain"];
const MEDICATIONS = ["Amlodipine 5mg", "Metformin 500mg", "Atorvastatin 20mg", "Lisinopril 10mg", "Salbutamol Inhaler", "Omeprazole 20mg", "Levothyroxine 50mcg", "Sertraline 50mg"];
const ALLERGENS = [
  { allergen: "Penicillin", reaction: "Anaphylaxis", severity: "severe" },
  { allergen: "Sulfonamides", reaction: "Rash and urticaria", severity: "moderate" },
  { allergen: "Peanuts", reaction: "Hives", severity: "mild" },
  { allergen: "Latex", reaction: "Contact dermatitis", severity: "moderate" },
];
const COMPLAINT_TEMPLATES = [
  "Patient presents with persistent headache for the past 3 days",
  "Chief complaint of shortness of breath on exertion",
  "Follow-up for hypertension management and medication review",
  "Routine diabetes mellitus check-up and HbA1c review",
  "Skin rash on forearms, pruritic, appeared 5 days ago",
  "Chronic lower back pain, worsening with prolonged sitting",
  "Annual wellness check-up with blood pressure monitoring",
];
const LAB_TESTS = [
  { testName: "Full Blood Count (FBC)", parameters: [
    { name: "Haemoglobin", unit: "g/dL", referenceRange: "13.0-17.0", baseValue: 14.5 },
    { name: "White Cell Count", unit: "10^9/L", referenceRange: "4.0-11.0", baseValue: 7.2 },
    { name: "Platelets", unit: "10^9/L", referenceRange: "150-400", baseValue: 260 },
  ]},
  { testName: "HbA1c", parameters: [{ name: "Glycated Haemoglobin", unit: "%", referenceRange: "<6.5", baseValue: 7.2 }] },
  { testName: "Lipid Profile", parameters: [
    { name: "Total Cholesterol", unit: "mmol/L", referenceRange: "<5.2", baseValue: 5.4 },
    { name: "LDL Cholesterol", unit: "mmol/L", referenceRange: "<3.4", baseValue: 3.2 },
    { name: "HDL Cholesterol", unit: "mmol/L", referenceRange: ">1.0", baseValue: 1.3 },
  ]},
];
const VACCINES = [
  { name: "Influenza (Annual)", dosage: "0.5 mL IM" },
  { name: "Hepatitis B", dosage: "1.0 mL IM" },
  { name: "Tetanus-Diphtheria (Td)", dosage: "0.5 mL IM" },
];
const BANKS = ["FNB", "Standard Bank", "Nedbank", "Absa", "Capitec"];
const MEDAIDS = ["Discovery Health", "Bonitas", "Momentum Health", "GEMS"];

// ---- HOSPITAL DEFINITIONS ----
type DoctorDef = { tag: string; fn: string; ln: string; spec: string; hpcsa: string; exp: number; langs: string[]; bio: string };
type PatientDef = {
  tag: string; fn: string; ln: string; dob: Date; gender: "male" | "female"; mobile: string; saId?: string;
  ecName: string; ecPhone: string; ecRel: string;
  medAid: { provider: string; planName: string; memberNumber: string } | null; tier: "free" | "pro" | "family";
};
type HospitalDef = {
  label: string; baseEmail: string; patientFilePrefix: string;
  city: string; province: string;
  facility: Record<string, unknown>;
  admin: { fn: string; ln: string };
  doctors: DoctorDef[]; patients: PatientDef[];
};

const HOSPITALS: HospitalDef[] = [
  // ---------- Hospital 1: Baobab Private Hospital (fictional) ----------
  {
    label: "Baobab Private Hospital", baseEmail: "makabmahlalela", patientFilePrefix: "BP",
    city: "Johannesburg", province: "Gauteng",
    facility: {
      name: "Baobab Private Hospital", facility_type: "Private",
      address_street: "14 Acacia Road, Parktown", address_city: "Johannesburg", address_province: "Gauteng",
      location_lng: 28.04, location_lat: -26.18,
      contact_phone: "+27 11 555 0100", contact_emergency_phone: "+27 11 555 0111", contact_email: "makabmahlalela@gmail.com",
      bed_total: 300, bed_general_available: 240, bed_icu_available: 40, current_wait_time_mins: 15, is_open: true,
      specialties: ["Cardiology", "Pediatrics", "Psychiatry", "Endocrinology", "General Medicine", "Radiology", "Pharmacy"],
      emergency_services: true, file_number_prefix: "BP",
    },
    admin: { fn: "Sarah", ln: "Jenkins" },
    doctors: [
      { tag: "mitchell", fn: "Oliver", ln: "Mitchell", spec: "General Practitioner", hpcsa: "MP0123456", exp: 18, langs: ["English", "Afrikaans", "isiZulu"], bio: "Experienced family physician committed to holistic patient care and preventive medicine." },
      { tag: "vanwyk", fn: "Anke", ln: "van Wyk", spec: "Cardiologist", hpcsa: "MP0654321", exp: 22, langs: ["English", "Afrikaans"], bio: "Specializing in interventional cardiology and heart failure management." },
      { tag: "nkosi", fn: "Sipho", ln: "Nkosi", spec: "Psychiatrist", hpcsa: "MP0234567", exp: 14, langs: ["English", "isiZulu", "Sesotho"], bio: "Psychiatrist focused on anxiety, depression and community mental health through telehealth." },
      { tag: "naidoo", fn: "Priya", ln: "Naidoo", spec: "Pediatrician", hpcsa: "MP0345678", exp: 11, langs: ["English", "isiZulu"], bio: "Pediatrician passionate about child development, immunisation and family-centred care." },
      { tag: "khumalo", fn: "Zanele", ln: "Khumalo", spec: "Endocrinologist", hpcsa: "MP0456789", exp: 16, langs: ["English", "isiZulu", "Xhosa"], bio: "Endocrinologist managing diabetes, thyroid and metabolic disorders." },
    ],
    patients: [
      { tag: "thandiwe", fn: "Thandiwe", ln: "Mokoena", dob: new Date(1990, 4, 12), gender: "female", saId: "9005125123081", mobile: "+27 82 111 2222", ecName: "Samuel Mokoena", ecPhone: "+27 82 111 0000", ecRel: "Husband", medAid: { provider: "Discovery Health", planName: "Classic Smart", memberNumber: "DSC123456789" }, tier: "pro" },
      { tag: "john", fn: "John", ln: "Dlamini", dob: new Date(1983, 0, 15), gender: "male", saId: "8301155012084", mobile: "+27 71 333 4444", ecName: "Busi Dlamini", ecPhone: "+27 71 333 0000", ecRel: "Sister", medAid: null, tier: "pro" },
      { tag: "nomvula", fn: "Nomvula", ln: "Sithole", dob: new Date(1976, 8, 3), gender: "female", mobile: "+27 83 555 1234", ecName: "Sipho Sithole", ecPhone: "+27 83 555 0000", ecRel: "Spouse", medAid: { provider: "Bonitas", planName: "Comprehensive", memberNumber: "BON987654321" }, tier: "free" },
      { tag: "pieter", fn: "Pieter", ln: "Botha", dob: new Date(1965, 1, 21), gender: "male", mobile: "+27 72 444 9876", ecName: "Marelize Botha", ecPhone: "+27 72 444 0000", ecRel: "Spouse", medAid: { provider: "Momentum Health", planName: "Essential", memberNumber: "MOM456789123" }, tier: "pro" },
      { tag: "fatima", fn: "Fatima", ln: "Patel", dob: new Date(1998, 10, 9), gender: "female", mobile: "+27 76 222 3456", ecName: "Ayesha Patel", ecPhone: "+27 76 222 0000", ecRel: "Sibling", medAid: null, tier: "free" },
    ],
  },
  // ---------- Hospital 2: Sunbird Regional Hospital (fictional) ----------
  {
    label: "Sunbird Regional Hospital", baseEmail: "aymish143", patientFilePrefix: "SB",
    city: "Durban", province: "KwaZulu-Natal",
    facility: {
      name: "Sunbird Regional Hospital", facility_type: "Private",
      address_street: "25 Marula Avenue, Berea", address_city: "Durban", address_province: "KwaZulu-Natal",
      location_lng: 31.005, location_lat: -29.855,
      contact_phone: "+27 31 555 0100", contact_emergency_phone: "+27 31 555 0111", contact_email: "aymish143@gmail.com",
      bed_total: 400, bed_general_available: 300, bed_icu_available: 50, current_wait_time_mins: 25, is_open: true,
      specialties: ["General Medicine", "Obstetrics", "Orthopedics", "Dermatology", "Neurology", "Radiology", "Pharmacy"],
      emergency_services: true, file_number_prefix: "SB",
    },
    admin: { fn: "Naledi", ln: "Maseko" },
    doctors: [
      { tag: "drthabo", fn: "Thabo", ln: "Mokoena", spec: "General Practitioner", hpcsa: "MP0567890", exp: 15, langs: ["English", "isiZulu", "Sesotho"], bio: "General practitioner focused on family medicine, chronic disease follow-up and preventive care." },
      { tag: "drmarelize", fn: "Marelize", ln: "Botha", spec: "Obstetrician", hpcsa: "MP0678901", exp: 19, langs: ["English", "Afrikaans"], bio: "Obstetrician supporting women through pregnancy, delivery and postnatal care." },
      { tag: "drbongani", fn: "Bongani", ln: "Dlamini", spec: "Orthopedic Surgeon", hpcsa: "MP0789012", exp: 21, langs: ["English", "isiZulu"], bio: "Orthopedic surgeon treating joint, spine and sports injuries." },
      { tag: "drfatima", fn: "Fatima", ln: "Khan", spec: "Dermatologist", hpcsa: "MP0890123", exp: 12, langs: ["English", "Afrikaans"], bio: "Dermatologist managing skin conditions, allergies and cosmetic concerns via telehealth." },
      { tag: "drriaan", fn: "Riaan", ln: "Steyn", spec: "Neurologist", hpcsa: "MP0901234", exp: 17, langs: ["English", "Afrikaans"], bio: "Neurologist specialising in headache disorders, epilepsy and stroke recovery." },
    ],
    patients: [
      { tag: "lerato", fn: "Lerato", ln: "Mahlangu", dob: new Date(1988, 2, 17), gender: "female", mobile: "+27 82 555 1001", ecName: "Kagiso Mahlangu", ecPhone: "+27 82 555 0001", ecRel: "Spouse", medAid: { provider: "Discovery Health", planName: "Smart", memberNumber: "DSC555100100" }, tier: "pro" },
      { tag: "andile", fn: "Andile", ln: "Zulu", dob: new Date(1979, 10, 2), gender: "male", mobile: "+27 71 555 2002", ecName: "Nandi Zulu", ecPhone: "+27 71 555 0002", ecRel: "Sibling", medAid: null, tier: "free" },
      { tag: "chantelle", fn: "Chantelle", ln: "du Plessis", dob: new Date(1995, 5, 24), gender: "female", mobile: "+27 83 555 3003", ecName: "Johan du Plessis", ecPhone: "+27 83 555 0003", ecRel: "Parent", medAid: { provider: "Bonitas", planName: "Essential", memberNumber: "BON555300300" }, tier: "pro" },
      { tag: "sandile", fn: "Sandile", ln: "Nkosi", dob: new Date(1960, 8, 12), gender: "male", mobile: "+27 72 555 4004", ecName: "Zinhle Nkosi", ecPhone: "+27 72 555 0004", ecRel: "Child", medAid: { provider: "GEMS", planName: "Sapphire", memberNumber: "GEM555400400" }, tier: "free" },
      { tag: "ayesha", fn: "Ayesha", ln: "Naidoo", dob: new Date(2001, 0, 30), gender: "female", mobile: "+27 76 555 5005", ecName: "Priya Naidoo", ecPhone: "+27 76 555 0005", ecRel: "Parent", medAid: null, tier: "free" },
    ],
  },
];

const PLATFORM_ADMINS = [
  { email: "admin@digi-health.co.za", first_name: "Amanda", last_name: "Mazwi" },
  { email: "mayo@razonetix.com", first_name: "Mayibongwe", last_name: "Mahlalela" },
];

// Child -> parent order so FK constraints never block the wipe.
const WIPE_ORDER = [
  "import_job_rows", "import_jobs", "set_password_tokens", "facility_patient_profiles",
  "wellness_scores", "wellness_checkins", "billings", "hospital_transactions", "ai_chat_logs",
  "medical_documents", "family_links", "platform_invites", "staff_approval_requests",
  "practitioner_schedule_slots", "practitioner_schedules", "reviews",
  "patient_events", "body_annotations", "offline_action_queue", "notifications",
  "health_tips", "articles", "messages", "attached_records", "calls",
  "conversations", "clinical_decision_support", "ai_triage_sessions",
  "risk_scores", "hospital_revenue_by_department", "hospital_revenue",
  "platform_fee_config", "payment_methods", "payout_requests", "subscriptions",
  "payment_transactions", "lab_result_parameters", "lab_results", "immunizations",
  "prescriptions", "patient_allergies", "medical_context", "anthropometrics",
  "consultations", "bed_occupancy", "hospital_appointments", "staff_invites",
  "staff", "facility_patients", "patient_practitioner_links", "practitioner_facilities",
  "hospital_admin_profiles", "practitioner_profiles", "patient_profiles",
  "facilities", "audit_logs", "system_config", "users",
];
const KEY_COLUMN: Record<string, string> = { practitioner_facilities: "practitioner_id" };

async function wipeAll() {
  console.log("Wiping existing data...");
  for (const table of WIPE_ORDER) {
    const keyCol = KEY_COLUMN[table] ?? "id";
    const { error } = await supabase.from(table).delete().not(keyCol, "is", null);
    if (error) console.warn(`  wipe ${table} skipped:`, error.message);
  }
  console.log("Wipe complete.\n");
}

// ============================================================
// SEED ONE HOSPITAL (admin, doctors, patients and all their data)
// ============================================================
async function seedHospital(def: HospitalDef, pw: string) {
  const email = (tag: string) => `${def.baseEmail}+${tag}@gmail.com`;
  console.log(`\n=== ${def.label} ===`);

  // Facility + hospital admin
  const [facility] = await insertBatch("facilities", [def.facility], "id, name");
  const [hospitalAdmin] = await insertBatch("users", [{
    email: email("hospital"), password_hash: pw, role: "hospital_admin",
    first_name: def.admin.fn, last_name: def.admin.ln, status: "active", email_verified: true,
  }], "id");
  await insertBatch("hospital_admin_profiles", [{
    user_id: hospitalAdmin.id, facility_id: facility.id, department: "Administration",
    permissions: ["bed_management", "staff_management", "reports", "billing"],
  }]);
  const hospitalProvisioned = {
    provisioned_via: "hospital_import",
    provisioned_by: hospitalAdmin.id,
    profile_completed_at: new Date().toISOString(),
  };

  // Doctors (also staff of this hospital; no other staff rows)
  const doctors = await insertBatch("users", def.doctors.map((d) => ({
    email: email(d.tag), password_hash: pw, role: "practitioner",
    first_name: d.fn, last_name: d.ln, status: "active", email_verified: true, ...hospitalProvisioned,
  })), "id, first_name, last_name");
  await insertBatch("practitioner_profiles", doctors.map((u, i) => {
    const d = def.doctors[i];
    return {
      user_id: u.id, specialisation: d.spec, hpcsa_number: d.hpcsa, experience_years: d.exp,
      bio: d.bio, languages: d.langs, accepted_medical_aids: pickSome(MEDAIDS, 2, 4),
      rating: parseFloat(faker.number.float({ min: 4.0, max: 5.0, fractionDigits: 1 }).toFixed(1)),
      review_count: randInt(20, 300), is_online: i < 3, achievements: i % 2 === 0 ? ["Excellence Award"] : [],
      bank_account_holder: `Dr ${d.fn} ${d.ln}`, bank_name: pickOne(BANKS),
      bank_account_number: faker.string.numeric(10), bank_branch_code: faker.string.numeric(6),
      tax_number: faker.string.numeric(10),
      address_street: `${randInt(1, 200)} Medical Centre, ${def.city}`, address_city: def.city, address_province: def.province,
    };
  }));
  await insertBatch("practitioner_facilities", doctors.map((u) => ({ practitioner_id: u.id, facility_id: facility.id })), "practitioner_id");
  await insertBatch("staff", doctors.map((u, i) => ({
    user_id: u.id, facility_id: facility.id, role: "doctor", department: def.doctors[i].spec,
    shift_start: "08:00", shift_end: "16:00", shift_days: [1, 2, 3, 4, 5], is_on_duty: true, hourly_rate: 450,
    file_number: `DR-${String(i + 1).padStart(4, "0")}`, status: "active",
  })), "id");

  // Patients
  const patients = await insertBatch("users", def.patients.map((p) => ({
    email: email(p.tag), password_hash: pw, role: "patient", first_name: p.fn, last_name: p.ln,
    sa_id: p.saId ?? generateSAId(p.dob, p.gender === "female"), mobile: p.mobile, status: "active", email_verified: true,
    ...hospitalProvisioned,
  })), "id, first_name, last_name");
  await insertBatch("patient_profiles", patients.map((u, i) => {
    const p = def.patients[i];
    return {
      user_id: u.id, date_of_birth: p.dob.toISOString().slice(0, 10), gender: p.gender,
      emergency_contact_name: p.ecName, emergency_contact_phone: p.ecPhone, emergency_contact_relationship: p.ecRel,
      medical_aid_provider: p.medAid?.provider || null, medical_aid_plan_name: p.medAid?.planName || null,
      medical_aid_member_number: p.medAid?.memberNumber || null,
      subscription_tier: p.tier, popia_consent_date: subDays(new Date(), randInt(30, 400)).toISOString(),
    };
  }));
  const patientFiles = await insertBatch("facility_patients", patients.map((u, i) => ({
    facility_id: facility.id, patient_id: u.id, file_number: `${def.patientFilePrefix}-${String(i + 1).padStart(6, "0")}`,
    status: "active", verified_at: new Date().toISOString(), issued_by: hospitalAdmin.id,
  })), "id, patient_id");
  await insertBatch("facility_patient_profiles", patientFiles.map((f) => {
    const p = def.patients[patients.findIndex((u) => u.id === f.patient_id)];
    return {
      facility_patient_id: f.id,
      medical_aid_provider: p.medAid?.provider || null, medical_aid_plan_name: p.medAid?.planName || null,
      medical_aid_member_number: p.medAid?.memberNumber || null,
      emergency_contact_name: p.ecName, emergency_contact_phone: p.ecPhone, emergency_contact_relationship: p.ecRel,
      referring_doctor: `Dr. ${doctors[0].first_name} ${doctors[0].last_name}`,
    };
  }), "id");

  // Links: GP + one specialist per patient as my_doctor/assigned, plus one favorite
  const links: any[] = [];
  const myDoctorPairs: { patient: any; doctor: any }[] = [];
  patients.forEach((pat, i) => {
    const mine = [doctors[0], doctors[(i % 4) + 1]];
    for (const doc of mine) {
      links.push({ patient_id: pat.id, practitioner_id: doc.id, link_type: "my_doctor" });
      links.push({ patient_id: pat.id, practitioner_id: doc.id, link_type: "assigned" });
      myDoctorPairs.push({ patient: pat, doctor: doc });
    }
    const fav = pickOne(doctors.filter((d) => !mine.includes(d)));
    links.push({ patient_id: pat.id, practitioner_id: fav.id, link_type: "favorite" });
  });
  await insertBatch("patient_practitioner_links", links, "patient_id");

  // Clinical data (hospital-owned: facility_id set)
  const medContextRows: any[] = [];
  const anthroRows: any[] = [];
  const prescriptionRows: any[] = [];
  const labInputs: any[] = [];
  const immunizationRows: any[] = [];
  patients.forEach((pat, i) => {
    const conditions = i < 4 ? pickSome(CHRONIC_CONDITIONS, 1, 2) : [];
    const meds = conditions.length ? pickSome(MEDICATIONS, 1, 2) : [];
    medContextRows.push({
      patient_id: pat.id, facility_id: facility.id, chronic_conditions: conditions, current_medications: meds,
      family_history: pickSome(["Hypertension", "Diabetes", "Heart Disease", "Stroke"], 1, 2),
      __allergy: i % 2 === 0 ? pickOne(ALLERGENS) : null,
    });
    const baseWeight = randInt(55, 100);
    const baseHeight = randInt(155, 190);
    const baseBMI = parseFloat((baseWeight / (baseHeight / 100) ** 2).toFixed(1));
    const bloodType = pickOne(["A+", "B+", "O+", "O-", "AB+"]);
    for (let m = 5; m >= 0; m--) {
      anthroRows.push({
        patient_id: pat.id, facility_id: facility.id, date_recorded: subDays(new Date(), m * 30 + randInt(0, 7)).toISOString(),
        height_cm: baseHeight, weight_kg: parseFloat((baseWeight + (Math.random() - 0.5) * 4).toFixed(1)),
        bmi: parseFloat((baseBMI + (Math.random() - 0.5) * 1.5).toFixed(1)), blood_type: bloodType,
        systolic_bp: randInt(110, 150), diastolic_bp: randInt(70, 100), heart_rate_bpm: randInt(60, 100),
        spo2: randInt(95, 100), temperature_celsius: parseFloat((36 + Math.random() * 1.5).toFixed(1)),
      });
    }
    for (const med of meds) {
      prescriptionRows.push({
        patient_id: pat.id, facility_id: facility.id, practitioner_id: pickOne(doctors).id, medication_name: med,
        dosage: pickOne(["Once daily", "Twice daily", "As needed"]),
        instructions: pickOne(["Take with food", "Take at bedtime", "Take in the morning"]),
        status: pickOne(["active", "active", "completed"]),
        prescribed_date: subDays(new Date(), randInt(10, 365)).toISOString(), refills_remaining: randInt(0, 5),
      });
    }
    labInputs.push({ patientId: pat.id, orderedById: pickOne(doctors).id, template: LAB_TESTS[i % LAB_TESTS.length] });
    const vaccine = pickOne(VACCINES);
    immunizationRows.push({
      patient_id: pat.id, facility_id: facility.id, vaccine_name: vaccine.name,
      date_administered: subDays(new Date(), randInt(30, 500)).toISOString(), dosage: vaccine.dosage,
      batch_number: faker.string.alphanumeric(8).toUpperCase(), administered_by: `Dr. ${doctors[0].last_name}`,
      next_due_date: addDays(new Date(), randInt(180, 365)).toISOString(),
    });
  });
  const insertedContexts = await insertBatch("medical_context", medContextRows.map(({ __allergy, ...r }) => r), "id, patient_id");
  const allergyRows: any[] = [];
  insertedContexts.forEach((c, i) => {
    const a = medContextRows[i].__allergy;
    if (a) allergyRows.push({ medical_context_id: c.id, allergen: a.allergen, severity: a.severity, reaction: a.reaction, source: pickOne(["patient", "clinician"]) });
  });
  if (allergyRows.length) await insertBatch("patient_allergies", allergyRows, "id");
  await insertBatch("anthropometrics", anthroRows, "id");
  if (prescriptionRows.length) await insertBatch("prescriptions", prescriptionRows, "id");
  const insertedLabs = await insertBatch("lab_results", labInputs.map((l) => ({
    patient_id: l.patientId, facility_id: facility.id, ordered_by: l.orderedById, test_name: l.template.testName,
    date_reported: subDays(new Date(), randInt(1, 120)).toISOString(),
  })), "id");
  const labParamRows: any[] = [];
  insertedLabs.forEach((lr, i) => {
    for (const p of labInputs[i].template.parameters) {
      const variance = p.baseValue * 0.15;
      const value = parseFloat((p.baseValue + (Math.random() - 0.5) * variance * 2).toFixed(1));
      labParamRows.push({
        lab_result_id: lr.id, name: p.name, value: String(value), unit: p.unit, reference_range: p.referenceRange,
        status: value > p.baseValue * 1.1 ? "high" : value < p.baseValue * 0.9 ? "low" : "normal",
      });
    }
  });
  await insertBatch("lab_result_parameters", labParamRows, "id");
  await insertBatch("immunizations", immunizationRows, "id");

  // Consultations (40: every pair gets 2 online + 2 in-person)
  const consultRows: any[] = [];
  for (let i = 0; i < 40; i++) {
    const { patient, doctor } = myDoctorPairs[i % myDoctorPairs.length];
    const consultType = ["video", "in_person", "chat", "in_person"][Math.floor(i / myDoctorPairs.length) % 4];
    const isPast = Math.random() > 0.25;
    const date = isPast ? subDays(new Date(), randInt(1, 120)) : addDays(new Date(), randInt(1, 30));
    const status = isPast
      ? (Math.random() > 0.1 ? "completed" : pickOne(["cancelled", "missed"]))
      : (Math.random() > 0.3 ? "scheduled" : pickOne(["requested", "pending"]));
    const riskScore = Math.random() > 0.5 ? randInt(15, 95) : null;
    const riskColor = riskScore ? (riskScore > 75 ? "red" : riskScore > 40 ? "gray" : "green") : null;
    consultRows.push({
      patient_id: patient.id, practitioner_id: doctor.id, facility_id: facility.id,
      type: consultType, status,
      scheduled_start_time: date.toISOString(),
      scheduled_end_time: new Date(date.getTime() + randInt(20, 60) * 60000).toISOString(),
      chief_complaint: pickOne(COMPLAINT_TEMPLATES),
      clinical_risk_score: riskScore, clinical_risk_color: riskColor,
      clinical_risk_factors: riskScore ? pickSome(["High Blood Pressure", "Irregular Pulse", "Elevated Glucose", "Smoking", "Obesity"], 1, 3) : [],
      soap_subjective: status === "completed" ? faker.lorem.paragraph() : null,
      soap_objective: status === "completed" ? pickOne(["Vitals stable. BP 130/85 mmHg, HR 76 bpm, SpO2 98%.", "BMI 28.4. Heart sounds normal, no murmurs.", "Alert and oriented. No acute distress."]) : null,
      soap_assessment: status === "completed" ? faker.lorem.sentences(2) : null,
      soap_plan: status === "completed" ? pickOne(["Continue current medications. Follow up in 4 weeks.", "Repeat HbA1c in 3 months.", "Refer to specialist. Chest X-ray requested."]) : null,
      soap_signed_at: status === "completed" ? new Date(date.getTime() + randInt(30, 90) * 60000).toISOString() : null,
    });
  }
  const consultations = await insertBatch("consultations", consultRows, "id, patient_id, practitioner_id, status");
  const completed = consultations.filter((c) => c.status === "completed").slice(0, 12);
  const reviewComments = [
    "Excellent consultation. The doctor was thorough and explained everything clearly.",
    "Very professional and caring. Felt reassured after the appointment.",
    "The telehealth appointment was seamless and just as good as in-person.",
  ];
  await insertBatch("reviews", completed.map((c) => ({
    consultation_id: c.id, patient_id: c.patient_id, practitioner_id: c.practitioner_id,
    rating: faker.number.float({ min: 3.5, max: 5.0, fractionDigits: 1 }), comment: pickOne(reviewComments),
    categories: { communication: faker.number.float({ min: 3.5, max: 5, fractionDigits: 1 }), professionalism: faker.number.float({ min: 3.5, max: 5, fractionDigits: 1 }) },
    is_verified: true,
  })), "id");

  // Conversations + messages
  const convos = await insertBatch("conversations", myDoctorPairs.map(({ patient, doctor }) => ({
    patient_id: patient.id, practitioner_id: doctor.id, facility_id: facility.id, status: pickOne(["active", "active", "ended"]),
    started_at: subDays(new Date(), randInt(1, 60)).toISOString(), minutes_allocated: pickOne([15, 30, 45, 60]),
  })), "id, patient_id, practitioner_id");
  const patientLines = [
    "Doctor, I've been experiencing some discomfort since yesterday.",
    "My readings have been high this week, should I be worried?",
    "Can I get a repeat prescription for my medication?",
    "I noticed some swelling, is that normal?",
    "Thank you for the advice last time, I'm feeling much better.",
  ];
  const doctorLines = [
    "Please monitor your readings twice daily and log them in the app.",
    "Your results are slightly elevated. Let's discuss adjustments.",
    "I'll send the prescription digitally; you can collect it at any pharmacy.",
    "That should settle with rest. If it persists, please come in.",
    "That's great progress! Keep up the lifestyle changes.",
  ];
  const messageRows: any[] = [];
  for (const conv of convos) {
    const n = randInt(4, 10);
    for (let k = 0; k < n; k++) {
      const fromPatient = k % 2 === 0;
      messageRows.push({
        conversation_id: conv.id,
        sender_id: fromPatient ? conv.patient_id : conv.practitioner_id,
        receiver_id: fromPatient ? conv.practitioner_id : conv.patient_id,
        content: fromPatient ? pickOne(patientLines) : pickOne(doctorLines),
        is_read: Math.random() > 0.2, delivered_at: subDays(new Date(), n - k).toISOString(),
      });
    }
  }
  await insertBatch("messages", messageRows, "id");

  // Hospital appointments (20, in-person at the hospital)
  await insertBatch("hospital_appointments", Array.from({ length: 20 }, () => {
    const { patient, doctor } = pickOne(myDoctorPairs);
    const isPast = Math.random() > 0.4;
    const date = isPast ? subDays(new Date(), randInt(1, 90)) : addDays(new Date(), randInt(1, 30));
    return {
      facility_id: facility.id, patient_id: patient.id, practitioner_id: doctor.id,
      type: pickOne(["consultation", "procedure", "lab"]),
      scheduled_start: date.toISOString(), scheduled_end: new Date(date.getTime() + randInt(30, 90) * 60000).toISOString(),
      status: isPast ? pickOne(["completed", "completed", "cancelled"]) : pickOne(["scheduled", "in_progress"]),
      room: `Room ${randInt(1, 50)}`,
    };
  }), "id");

  // Practitioner schedules (next 14 days, weekdays)
  for (const doc of doctors) {
    const scheduleBatch: any[] = [];
    const slotsByIndex: any[][] = [];
    for (let d = 0; d < 14; d++) {
      const schedDate = addDays(new Date(), d);
      const dow = schedDate.getDay();
      if (dow === 0 || dow === 6) continue;
      const slots: any[] = [];
      for (let h = pickOne([8, 9]); h < 17; h++) {
        slots.push({
          start_time: `${h.toString().padStart(2, "0")}:00`, end_time: `${(h + 1).toString().padStart(2, "0")}:00`,
          status: pickOne(["available", "available", "available", "booked"]),
        });
      }
      scheduleBatch.push({ practitioner_id: doc.id, schedule_date: schedDate.toISOString().slice(0, 10) });
      slotsByIndex.push(slots);
    }
    const inserted = await insertBatch("practitioner_schedules", scheduleBatch, "id");
    await insertBatch("practitioner_schedule_slots", inserted.flatMap((s, i) => slotsByIndex[i].map((slot) => ({ schedule_id: s.id, ...slot }))), "id");
  }

  // Patient events
  const eventTitles = ["GP Follow-up Appointment", "Medication Reminder", "Lab Test", "Specialist Consultation", "Take Morning Medication", "Blood Sugar Check", "Annual Wellness Check"];
  const eventRows: any[] = [];
  for (const pat of patients) {
    for (let e = 0; e < randInt(3, 6); e++) {
      const eventDate = Math.random() > 0.5 ? subDays(new Date(), randInt(1, 30)) : addDays(new Date(), randInt(1, 60));
      eventRows.push({
        patient_id: pat.id, title: pickOne(eventTitles), event_at: eventDate.toISOString(),
        event_date: eventDate.toDateString(), event_time: pickOne(["08:00", "09:00", "11:30", "14:00", "16:30"]),
        type: pickOne(["appointment", "reminder", "note"]),
        notes: faker.datatype.boolean() ? faker.lorem.sentence() : null,
        color: pickOne(["primary", "success", "warning", "danger", "info"]),
      });
    }
  }
  await insertBatch("patient_events", eventRows, "id");

  // Billing
  const prices: Record<string, number> = { free: 0, pro: 299, family: 499 };
  const txnCategories = ["service_booking", "subscription", "pharmacy", "lab", "procedure"];
  const subRows: any[] = [];
  const pmRows: any[] = [];
  const txnRows: any[] = [];
  patients.forEach((pat, i) => {
    const p = def.patients[i];
    subRows.push({
      patient_id: pat.id, tier: p.tier, status: "active",
      start_date: subDays(new Date(), randInt(30, 365)).toISOString(), next_billing_date: addDays(new Date(), randInt(1, 30)).toISOString(),
      auto_renew: true, price: prices[p.tier],
    });
    pmRows.push({ patient_id: pat.id, type: "card", is_default: true, card_brand: pickOne(["Visa", "Mastercard"]), card_last4: faker.string.numeric(4), card_expiry_month: randInt(1, 12), card_expiry_year: randInt(2027, 2030) });
    if (p.medAid) {
      pmRows.push({ patient_id: pat.id, type: "medical_aid", is_default: false, medical_aid_provider: p.medAid.provider, medical_aid_number: p.medAid.memberNumber });
    }
    for (let j = 0; j < randInt(4, 8); j++) {
      const amount = randInt(150, 3500);
      const cat = pickOne(txnCategories);
      txnRows.push({
        patient_id: pat.id, practitioner_id: pickOne(doctors).id, facility_id: facility.id, amount, currency: "ZAR",
        provider: pickOne(["card", "medical_aid", "eft"]), status: pickOne(["completed", "completed", "completed", "pending", "failed"]),
        description: `${cat.replace("_", " ")} charge`, category: cat, occurred_at: subDays(new Date(), randInt(1, 180)).toISOString(),
        platform_fee_amount: parseFloat((amount * 0.15).toFixed(2)), practitioner_earnings: parseFloat((amount * 0.85).toFixed(2)),
      });
    }
  });
  await insertBatch("subscriptions", subRows, "id");
  await insertBatch("payment_methods", pmRows, "id");
  await insertBatch("payment_transactions", txnRows, "id");
  await insertBatch("payout_requests", doctors.map((doc) => ({
    practitioner_id: doc.id, facility_id: facility.id, amount: randInt(5000, 40000), currency: "ZAR",
    status: pickOne(["paid", "paid", "pending", "approved"]), requested_at: subDays(new Date(), randInt(1, 60)).toISOString(),
    processed_at: Math.random() > 0.3 ? subDays(new Date(), randInt(1, 30)).toISOString() : null,
    bank_account_holder: `Dr. ${doc.first_name} ${doc.last_name}`, bank_name: pickOne(BANKS),
    bank_account_number: faker.string.numeric(10), bank_branch_code: faker.string.numeric(6),
    period_from: subDays(new Date(), 60).toISOString(), period_to: subDays(new Date(), 30).toISOString(),
    consultation_count: randInt(10, 80), platform_fee_deducted: randInt(500, 3000),
  })), "id");

  const revenueRows: any[] = [];
  const revenueDepts: any[][] = [];
  for (let m = 5; m >= 0; m--) {
    const totalRev = randInt(500000, 3000000);
    revenueRows.push({
      facility_id: facility.id, period: "monthly", revenue_date: subDays(new Date(), m * 30).toISOString().slice(0, 10),
      total_revenue: totalRev, pending_payouts: randInt(50000, 200000), completed_payouts: randInt(200000, 800000), net_revenue: Math.floor(totalRev * 0.85),
    });
    revenueDepts.push([
      { department: "Emergency", revenue: Math.floor(totalRev * 0.25), transaction_count: randInt(50, 200) },
      { department: "Pharmacy", revenue: Math.floor(totalRev * 0.15), transaction_count: randInt(100, 500) },
      { department: "Radiology", revenue: Math.floor(totalRev * 0.2), transaction_count: randInt(30, 150) },
      { department: "Surgical", revenue: Math.floor(totalRev * 0.4), transaction_count: randInt(20, 80) },
    ]);
  }
  const insertedRevenue = await insertBatch("hospital_revenue", revenueRows, "id");
  await insertBatch("hospital_revenue_by_department", insertedRevenue.flatMap((r, i) => revenueDepts[i].map((d) => ({ hospital_revenue_id: r.id, ...d }))), "id");

  // Hospital transactions, wellness, practitioner invoices
  await insertBatch("hospital_transactions", Array.from({ length: 24 }, () => ({
    facility_id: facility.id, patient_id: pickOne(patients).id, amount: randInt(150, 6000),
    type: pickOne(["service_booking", "procedure", "pharmacy"]),
    status: pickOne(["paid", "paid", "paid", "pending", "refunded"]),
    payment_method: pickOne(["cash", "card", "medical_aid"]),
    occurred_at: subDays(new Date(), randInt(0, 90)).toISOString(),
  })), "id");
  const checkinRows: any[] = [];
  const scoreRows: any[] = [];
  for (const pat of patients) {
    for (let d = 6; d >= 0; d--) {
      const day = subDays(new Date(), d).toISOString();
      checkinRows.push({ patient_id: pat.id, mood: randInt(2, 5), sleep_hours: parseFloat((5 + Math.random() * 4).toFixed(1)), steps: randInt(2000, 12000), checkin_date: day });
      scoreRows.push({ patient_id: pat.id, score_date: day, score: randInt(55, 95) });
    }
  }
  await insertBatch("wellness_checkins", checkinRows, "id");
  await insertBatch("wellness_scores", scoreRows, "id");
  await insertBatch("billings", completed.map((c, i) => ({
    patient_id: c.patient_id, practitioner_id: c.practitioner_id, consultation_id: c.id,
    amount: randInt(300, 1500), type: "consultation", status: pickOne(["paid", "paid", "pending"]),
    payment_method: pickOne(["card", "medical_aid", "eft"]), billed_at: subDays(new Date(), randInt(1, 90)).toISOString(),
    invoice_number: `${def.patientFilePrefix}-INV-${String(i + 1).padStart(5, "0")}`,
  })), "id");

  console.log(`  ${doctors.length} doctors, ${patients.length} patients, ${consultations.length} consultations, ${convos.length} conversations (${messageRows.length} messages), ${txnRows.length} payments`);
  return { label: def.label, email, doctors: def.doctors, patients: def.patients };
}

async function main() {
  console.log(`Target: ${SUPABASE_URL}\n`);
  if (!process.argv.includes("--yes")) {
    const ok = await confirmReset();
    if (!ok) {
      console.log("Aborted. Nothing was changed.");
      return;
    }
  }

  await wipeAll();

  const hospitalPw = hash("Password123!");

  // ---------- Platform admins ----------
  console.log("Seeding platform admins...");
  const adminHash = hash(PLATFORM_ADMIN_PASSWORD as string);
  const now = new Date().toISOString();
  const platformAdmins = await insertBatch("users", PLATFORM_ADMINS.map((a) => ({
    email: a.email.toLowerCase(), password_hash: adminHash, role: "mega_admin",
    first_name: a.first_name, last_name: a.last_name, status: "active", email_verified: true, email_verified_at: now,
  })), "id, email");

  // ---------- Global content ----------
  console.log("Seeding global settings and content...");
  await insertBatch("platform_fee_config", [{ platform_fee_percent: 15, subscription_fee_percent: 10, updated_by: platformAdmins[0].id, notes: "Default platform config" }], "id");
  await insertBatch("system_config", [{
    features: { telehealth: true, aiDiagnizer: true, prescriptions: true, registrations: true },
    maintenance_mode: false, popia_version: "1.0", consultation_fee_default: 0,
    emergency_numbers: ["112", "10177"], supported_languages: ["en", "af", "zu"],
  }], "id");
  await insertBatch("articles", [
    { title: "Understanding Cardiovascular Health in the Modern Era", slug: "understanding-cardiovascular-health-modern-era", excerpt: "Heart disease remains a global challenge, but modern proactive measures and digital monitoring can dramatically improve lifespan and quality of life.", content: "<h2>The Heart of the Matter</h2><p>Cardiovascular diseases remain the leading cause of death globally.</p>", cover_image: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&q=80&w=800", author: "Dr. Anke van Wyk", tags: ["Cardiology", "Wellness", "Preventative Care"], likes: 342, is_published: true, published_at: subDays(new Date(), 10).toISOString() },
    { title: "Managing Type 2 Diabetes: A Holistic Approach", slug: "managing-type-2-diabetes-holistic", excerpt: "Diabetes management is not just about insulin; it's about a complete lifestyle recalibration.", content: "<h2>Beyond the Numbers</h2><p>True management of Type 2 Diabetes requires a comprehensive overhaul of habits.</p>", cover_image: "https://images.unsplash.com/photo-1584308666744-24d5e44299ec?auto=format&fit=crop&q=80&w=800", author: "Dr. Zanele Khumalo", tags: ["Endocrinology", "Diabetes", "Diet"], likes: 228, is_published: true, published_at: subDays(new Date(), 5).toISOString() },
    { title: "Mental Health in Post-Pandemic South Africa", slug: "mental-health-post-pandemic-south-africa", excerpt: "The psychological toll of COVID-19 continues to affect millions of South Africans.", content: "<h2>A Silent Crisis</h2><p>South Africa faces a significant mental health crisis.</p>", cover_image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800", author: "Dr. Sipho Nkosi", tags: ["Mental Health", "Telehealth", "South Africa"], likes: 415, is_published: true, published_at: subDays(new Date(), 20).toISOString() },
    { title: "The Rise of Telehealth: Revolutionizing Patient Care in Africa", slug: "rise-of-telehealth-revolutionizing-patient-care-africa", excerpt: "From rural villages to urban centers, telehealth is transforming how Africans access quality healthcare.", content: "<h2>Breaking Barriers</h2><p>Geographic distance has long been a barrier to healthcare access across Africa.</p>", cover_image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800", author: "Dr. Oliver Mitchell", tags: ["Telehealth", "Innovation", "Africa"], likes: 567, is_published: true, published_at: subDays(new Date(), 15).toISOString() },
    { title: "Child Health Basics: Immunisation and Nutrition", slug: "child-health-basics-immunisation-nutrition", excerpt: "A practical guide for parents on keeping children healthy through their early years.", content: "<h2>Healthy Start</h2><p>Immunisation and good nutrition are the foundation of child health.</p>", cover_image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=800", author: "Dr. Priya Naidoo", tags: ["Pediatrics", "Nutrition", "Prevention"], likes: 198, is_published: true, published_at: subDays(new Date(), 30).toISOString() },
  ], "id");
  const tipTitles = ["Drink 8 Glasses of Water Daily", "Walk for 20 Minutes Every Day", "Limit Screen Time Before Bed", "Practice Deep Breathing for Stress", "Eat More Vegetables at Every Meal", "Check Your Blood Pressure Weekly"];
  const tipAuthors = HOSPITALS.flatMap((h) => h.doctors.map((d) => `Dr. ${d.fn} ${d.ln}`));
  await insertBatch("health_tips", tipTitles.map((title, idx) => ({
    title, excerpt: faker.lorem.sentence(), content: faker.lorem.paragraphs(2), author: pickOne(tipAuthors),
    published_date: subDays(new Date(), idx).toISOString(), read_time: pickOne(["1 min", "2 min", "3 min"]), tag: "Daily Tip", category: "tip",
  })), "id");

  // ---------- Hospitals ----------
  const results = [];
  for (const def of HOSPITALS) results.push(await seedHospital(def, hospitalPw));

  // ---------- Summary ----------
  console.log("\n====== RESET + SEED COMPLETE ======");
  console.log("\nPlatform admins (mega_admin), password = PLATFORM_ADMIN_PASSWORD:");
  PLATFORM_ADMINS.forEach((a) => console.log(`  ${a.first_name} ${a.last_name}: ${a.email}`));
  console.log("\nHospital accounts, password = Password123!");
  for (const r of results) {
    console.log(`\n${r.label}`);
    console.log(`  Admin:    ${r.email("hospital")}`);
    console.log(`  Doctors:  ${r.doctors.map((d) => r.email(d.tag)).join(", ")}`);
    console.log(`  Patients: ${r.patients.map((p) => r.email(p.tag)).join(", ")}`);
  }
  console.log("\n===================================\n");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});