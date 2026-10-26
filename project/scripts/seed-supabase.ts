/**
 * Postgres-native seed script (Supabase) — LEAN dataset:
 *   1 hospital, 1 hospital admin, super + mega admin, 5 doctors, 5 patients,
 *   and a small but fully linked set of clinical, consultation, messaging,
 *   scheduling and billing data around them.
 *
 * Same known anchor emails and shared password as before, so existing
 * test-login habits keep working.
 *
 * DESTRUCTIVE: wipes every row in every app table before reseeding.
 * Safe to re-run. Dev databases only.
 *
 * Run: ALLOW_SEED=true npx tsx scripts/seed-supabase.ts
 */
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";
import * as dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";

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

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SECRET_KEY in .env.local");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
const supabase = getSupabase();

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

async function insertBatch<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  select = "id",
): Promise<any[]> {
  const out: any[] = [];
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { data, error } = await supabase.from(table).insert(batch).select(select);
    if (error) throw new Error(`${table} insert failed: ${error.message}`);
    out.push(...(data || []));
  }
  return out;
}

// ---- DATA POOLS ----
const CHRONIC_CONDITIONS = [
  "Hypertension", "Type 2 Diabetes", "Asthma", "Hypothyroidism", "Hyperlipidemia",
  "Anxiety Disorder", "Migraine", "Osteoporosis", "Chronic Back Pain",
];
const MEDICATIONS = [
  "Amlodipine 5mg", "Metformin 500mg", "Atorvastatin 20mg", "Lisinopril 10mg",
  "Salbutamol Inhaler", "Omeprazole 20mg", "Levothyroxine 50mcg", "Sertraline 50mg",
];
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
  "Patient reports chest palpitations and mild dizziness",
  "Chronic lower back pain, worsening with prolonged sitting",
  "Annual wellness check-up with blood pressure monitoring",
];
const LAB_TESTS = [
  { testName: "Full Blood Count (FBC)", parameters: [
    { name: "Haemoglobin", unit: "g/dL", referenceRange: "13.0-17.0", baseValue: 14.5 },
    { name: "White Cell Count", unit: "10^9/L", referenceRange: "4.0-11.0", baseValue: 7.2 },
    { name: "Platelets", unit: "10^9/L", referenceRange: "150-400", baseValue: 260 },
  ]},
  { testName: "HbA1c", parameters: [
    { name: "Glycated Haemoglobin", unit: "%", referenceRange: "<6.5", baseValue: 7.2 },
  ]},
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

// Tables in child->parent order so FK constraints never block the wipe.
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

async function wipeAll() {
  console.log("Wiping existing Postgres data...");
  for (const table of WIPE_ORDER) {
    const keyCol = table === "practitioner_facilities" ? "practitioner_id" : "id";
    const { error } = await supabase.from(table).delete().not(keyCol, "is", null);
    if (error) console.warn(`  wipe ${table} skipped:`, error.message);
  }
  console.log("Wipe complete.\n");
}

async function main() {
  await wipeAll();
  const pw = hash("Password123!");

  // ============================================================
  // 1. FACILITY (1)
  // ============================================================
  console.log("Seeding facility...");
  const [facility] = await insertBatch("facilities", [{
    name: "Netcare Milpark Hospital", facility_type: "Private",
    address_street: "9 Guild Rd, Parktown", address_city: "Johannesburg", address_province: "Gauteng",
    location_lng: 28.0315, location_lat: -26.1802,
    contact_phone: "+27 11 480 0000", contact_emergency_phone: "+27 11 480 0111", contact_email: "makabmahlalela@gmail.com",
    bed_total: 300, bed_general_available: 240, bed_icu_available: 40, current_wait_time_mins: 15, is_open: true,
    specialties: ["Cardiology", "Pediatrics", "Psychiatry", "Endocrinology", "General Medicine", "Radiology", "Pharmacy"],
    emergency_services: true, file_number_prefix: "PF",
  }], "id, name");
  console.log(`  ${facility.name} created.`);

  // ============================================================
  // 2. ADMINS (hospital admin + super + mega)
  // ============================================================
  console.log("\nSeeding admins...");
  const [hospitalAdmin] = await insertBatch("users", [{
    email: "makabmahlalela+hospital@gmail.com", password_hash: pw, role: "hospital_admin",
    first_name: "Sarah", last_name: "Jenkins", status: "active", email_verified: true,
  }], "id");
  await insertBatch("hospital_admin_profiles", [{
    user_id: hospitalAdmin.id, facility_id: facility.id, department: "Administration",
    permissions: ["bed_management", "staff_management", "reports", "billing"],
  }]);
  await insertBatch("users", [{
    email: "super@247digihealth.com", password_hash: pw, role: "super_admin",
    first_name: "Alex", last_name: "Thornton", status: "active", email_verified: true,
  }], "id");
  const [megaAdmin] = await insertBatch("users", [{
    email: "mega@247digihealth.com", password_hash: pw, role: "mega_admin",
    first_name: "Victoria", last_name: "Harrington", status: "active", email_verified: true,
  }], "id");
  // Doctors/patients are "loaded by the hospital" (migration 013 provenance fields)
  const hospitalProvisioned = {
    provisioned_via: "hospital_import",
    provisioned_by: hospitalAdmin.id,
    profile_completed_at: new Date().toISOString(),
  };

  // ============================================================
  // 3. DOCTORS (5, all belong to the hospital)
  // ============================================================
  console.log("\nSeeding 5 doctors...");
  const doctorDefs = [
    { email: "makabmahlalela+mitchell@gmail.com", fn: "Oliver", ln: "Mitchell", spec: "General Practitioner", hpcsa: "MP0123456", exp: 18, langs: ["English", "Afrikaans", "isiZulu"], bio: "Experienced family physician committed to holistic patient care and preventive medicine." },
    { email: "makabmahlalela+vanwyk@gmail.com", fn: "Anke", ln: "van Wyk", spec: "Cardiologist", hpcsa: "MP0654321", exp: 22, langs: ["English", "Afrikaans"], bio: "Specializing in interventional cardiology and heart failure management." },
    { email: "makabmahlalela+nkosi@gmail.com", fn: "Sipho", ln: "Nkosi", spec: "Psychiatrist", hpcsa: "MP0234567", exp: 14, langs: ["English", "isiZulu", "Sesotho"], bio: "Psychiatrist focused on anxiety, depression and community mental health through telehealth." },
    { email: "makabmahlalela+naidoo@gmail.com", fn: "Priya", ln: "Naidoo", spec: "Pediatrician", hpcsa: "MP0345678", exp: 11, langs: ["English", "isiZulu"], bio: "Pediatrician passionate about child development, immunisation and family-centred care." },
    { email: "makabmahlalela+khumalo@gmail.com", fn: "Zanele", ln: "Khumalo", spec: "Endocrinologist", hpcsa: "MP0456789", exp: 16, langs: ["English", "isiZulu", "Xhosa"], bio: "Endocrinologist managing diabetes, thyroid and metabolic disorders." },
  ];
  const doctors = await insertBatch(
    "users",
    doctorDefs.map((d) => ({
      email: d.email, password_hash: pw, role: "practitioner",
      first_name: d.fn, last_name: d.ln, status: "active", email_verified: true,
      ...hospitalProvisioned,
    })),
    "id, first_name, last_name",
  );
  await insertBatch("practitioner_profiles", doctors.map((u, i) => {
    const d = doctorDefs[i];
    return {
      user_id: u.id, specialisation: d.spec, hpcsa_number: d.hpcsa, experience_years: d.exp,
      bio: d.bio, languages: d.langs, accepted_medical_aids: pickSome(MEDAIDS, 2, 4),
      rating: parseFloat(faker.number.float({ min: 4.0, max: 5.0, fractionDigits: 1 }).toFixed(1)),
      review_count: randInt(20, 300), is_online: i < 3,
      achievements: i % 2 === 0 ? ["Excellence Award"] : [],
      bank_account_holder: `Dr ${d.fn} ${d.ln}`, bank_name: pickOne(BANKS),
      bank_account_number: faker.string.numeric(10), bank_branch_code: faker.string.numeric(6),
      tax_number: faker.string.numeric(10),
      address_street: `${randInt(1, 200)} Medical Centre, Parktown`, address_city: "Johannesburg", address_province: "Gauteng",
    };
  }));
  await insertBatch("practitioner_facilities", doctors.map((u) => ({ practitioner_id: u.id, facility_id: facility.id })), "practitioner_id");
  // Doctors are also staff of the hospital (needed for booking / file numbers)
  await insertBatch("staff", doctors.map((u, i) => ({
    user_id: u.id, facility_id: facility.id, role: "doctor", department: doctorDefs[i].spec,
    shift_start: "08:00", shift_end: "16:00", shift_days: [1, 2, 3, 4, 5], is_on_duty: true, hourly_rate: 450,
    file_number: `DR-${String(i + 1).padStart(4, "0")}`, status: "active",
  })), "id");

  // ============================================================
  // 4. PATIENTS (5, all hold a file at the hospital)
  // ============================================================
  console.log("Seeding 5 patients...");
  const patientDefs = [
    { email: "makabmahlalela+thandiwe@gmail.com", fn: "Thandiwe", ln: "Mokoena", saId: "9005125123081", mobile: "+27 82 111 2222", dob: new Date(1990, 4, 12), gender: "female", ecName: "Samuel Mokoena", ecPhone: "+27 82 111 0000", ecRel: "Husband", medAid: { provider: "Discovery Health", planName: "Classic Smart", memberNumber: "DSC123456789" }, tier: "pro" },
    { email: "makabmahlalela+john@gmail.com", fn: "John", ln: "Dlamini", saId: "8301155012084", mobile: "+27 71 333 4444", dob: new Date(1983, 0, 15), gender: "male", ecName: "Busi Dlamini", ecPhone: "+27 71 333 0000", ecRel: "Sister", medAid: null, tier: "pro" },
    { email: "makabmahlalela+nomvula@gmail.com", fn: "Nomvula", ln: "Sithole", saId: generateSAId(new Date(1976, 8, 3), true), mobile: "+27 83 555 1234", dob: new Date(1976, 8, 3), gender: "female", ecName: "Sipho Sithole", ecPhone: "+27 83 555 0000", ecRel: "Spouse", medAid: { provider: "Bonitas", planName: "Comprehensive", memberNumber: "BON987654321" }, tier: "free" },
    { email: "makabmahlalela+pieter@gmail.com", fn: "Pieter", ln: "Botha", saId: generateSAId(new Date(1965, 1, 21), false), mobile: "+27 72 444 9876", dob: new Date(1965, 1, 21), gender: "male", ecName: "Marelize Botha", ecPhone: "+27 72 444 0000", ecRel: "Spouse", medAid: { provider: "Momentum Health", planName: "Essential", memberNumber: "MOM456789123" }, tier: "pro" },
    { email: "makabmahlalela+fatima@gmail.com", fn: "Fatima", ln: "Patel", saId: generateSAId(new Date(1998, 10, 9), true), mobile: "+27 76 222 3456", dob: new Date(1998, 10, 9), gender: "female", ecName: "Ayesha Patel", ecPhone: "+27 76 222 0000", ecRel: "Sibling", medAid: null, tier: "free" },
  ];
  const patients = await insertBatch(
    "users",
    patientDefs.map((p) => ({
      email: p.email, password_hash: pw, role: "patient", first_name: p.fn, last_name: p.ln,
      sa_id: p.saId, mobile: p.mobile, status: "active", email_verified: true,
      ...hospitalProvisioned,
    })),
    "id, first_name, last_name",
  );
  await insertBatch("patient_profiles", patients.map((u, i) => {
    const p = patientDefs[i];
    return {
      user_id: u.id, date_of_birth: p.dob.toISOString().slice(0, 10), gender: p.gender,
      emergency_contact_name: p.ecName, emergency_contact_phone: p.ecPhone, emergency_contact_relationship: p.ecRel,
      medical_aid_provider: p.medAid?.provider || null, medical_aid_plan_name: p.medAid?.planName || null,
      medical_aid_member_number: p.medAid?.memberNumber || null,
      subscription_tier: p.tier, popia_consent_date: subDays(new Date(), randInt(30, 400)).toISOString(),
    };
  }));

  // Hospital file numbers: every patient holds an active file at the hospital
  const patientFiles = await insertBatch("facility_patients", patients.map((u, i) => ({
    facility_id: facility.id, patient_id: u.id, file_number: `PF-${String(i + 1).padStart(6, "0")}`,
    status: "active", verified_at: new Date().toISOString(), issued_by: hospitalAdmin.id,
  })), "id, patient_id");
  // What this hospital knows about each patient (separate from the patient's own profile)
  await insertBatch("facility_patient_profiles", patientFiles.map((f) => {
    const idx = patients.findIndex((u) => u.id === f.patient_id);
    const p = patientDefs[idx];
    return {
      facility_patient_id: f.id,
      medical_aid_provider: p.medAid?.provider || null, medical_aid_plan_name: p.medAid?.planName || null,
      medical_aid_member_number: p.medAid?.memberNumber || null,
      emergency_contact_name: p.ecName, emergency_contact_phone: p.ecPhone, emergency_contact_relationship: p.ecRel,
      referring_doctor: `Dr. ${doctors[0].first_name} ${doctors[0].last_name}`,
    };
  }), "id");

  // Patient <-> doctor links: each patient has 2 "my doctors" (first is always the GP
  // or a rotating specialist), 1 favorite; every my_doctor link also appears as "assigned".
  console.log("  Linking patients <-> doctors...");
  const links: { patient_id: string; practitioner_id: string; link_type: string }[] = [];
  const myDoctorPairs: { patient: any; doctor: any }[] = [];
  patients.forEach((pat, i) => {
    const mine = [doctors[0], doctors[(i % 4) + 1]]; // GP + one specialist
    for (const doc of mine) {
      links.push({ patient_id: pat.id, practitioner_id: doc.id, link_type: "my_doctor" });
      links.push({ patient_id: pat.id, practitioner_id: doc.id, link_type: "assigned" });
      myDoctorPairs.push({ patient: pat, doctor: doc });
    }
    const fav = pickOne(doctors.filter((d) => !mine.includes(d)));
    links.push({ patient_id: pat.id, practitioner_id: fav.id, link_type: "favorite" });
  });
  await insertBatch("patient_practitioner_links", links, "patient_id");
  console.log(`  ${links.length} relationship links.`);

  // ============================================================
  // 5. HOSPITAL SUPPORT STAFF (8)
  // ============================================================
  console.log("\nSeeding hospital support staff...");
  const depts = ["Emergency", "Cardiology", "Pharmacy", "Radiology", "ICU", "General Ward", "Maternity", "Pediatrics"];
  await insertBatch("staff", depts.map((dept) => ({
    facility_id: facility.id, role: pickOne(["nurse", "technician", "admin"]), department: dept,
    shift_start: pickOne(["06:00", "07:00", "08:00"]), shift_end: pickOne(["14:00", "16:00", "18:00"]),
    shift_days: pickSome([1, 2, 3, 4, 5], 4, 5), is_on_duty: faker.datatype.boolean(), hourly_rate: randInt(80, 350),
    qualifications: pickSome(["SANC Registration", "BLS Certified", "ALS Certified", "Specialist Nursing"], 1, 3),
  })), "id");

  // ============================================================
  // 6. CLINICAL DATA (per patient)
  // ============================================================
  console.log("\nSeeding clinical data...");
  const medContextRows: any[] = [];
  const anthroRows: any[] = [];
  const prescriptionRows: any[] = [];
  const labInputs: any[] = [];
  const immunizationRows: any[] = [];

  patients.forEach((pat, i) => {
    const conditions = i < 4 ? pickSome(CHRONIC_CONDITIONS, 1, 2) : []; // last patient is healthy
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
      patient_id: pat.id, facility_id: facility.id, vaccine_name: vaccine.name, date_administered: subDays(new Date(), randInt(30, 500)).toISOString(),
      dosage: vaccine.dosage, batch_number: faker.string.alphanumeric(8).toUpperCase(),
      administered_by: `Dr. ${doctors[0].last_name}`, next_due_date: addDays(new Date(), randInt(180, 365)).toISOString(),
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

  const insertedLabs = await insertBatch(
    "lab_results",
    labInputs.map((l) => ({ patient_id: l.patientId, facility_id: facility.id, ordered_by: l.orderedById, test_name: l.template.testName, date_reported: subDays(new Date(), randInt(1, 120)).toISOString() })),
    "id",
  );
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
  console.log(`  ${insertedContexts.length} medical contexts, ${anthroRows.length} anthropometrics, ${prescriptionRows.length} prescriptions, ${insertedLabs.length} labs, ${immunizationRows.length} immunizations`);

  // ============================================================
  // 7. CONSULTATIONS (40, always between linked patient/doctor pairs)
  // ============================================================
  console.log("\nSeeding consultations...");
  const consultRows: any[] = [];
  for (let i = 0; i < 40; i++) {
    const { patient, doctor } = pickOne(myDoctorPairs);
    const isPast = Math.random() > 0.25;
    const date = isPast ? subDays(new Date(), randInt(1, 120)) : addDays(new Date(), randInt(1, 30));
    const status = isPast
      ? (Math.random() > 0.1 ? "completed" : pickOne(["cancelled", "missed"]))
      : (Math.random() > 0.3 ? "scheduled" : pickOne(["requested", "pending"]));
    const riskScore = Math.random() > 0.5 ? randInt(15, 95) : null;
    const riskColor = riskScore ? (riskScore > 75 ? "red" : riskScore > 40 ? "gray" : "green") : null;
    consultRows.push({
      patient_id: patient.id, practitioner_id: doctor.id, facility_id: facility.id,
      type: pickOne(["video", "video", "chat", "in_person"]), status,
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
  console.log(`  ${consultations.length} consultations, ${completed.length} reviews.`);

  // ============================================================
  // 8. CONVERSATIONS + MESSAGES (one thread per my_doctor pair)
  // ============================================================
  console.log("\nSeeding conversations & messages...");
  const convos = await insertBatch(
    "conversations",
    myDoctorPairs.map(({ patient, doctor }) => ({
      patient_id: patient.id, practitioner_id: doctor.id, facility_id: facility.id, status: pickOne(["active", "active", "ended"]),
      started_at: subDays(new Date(), randInt(1, 60)).toISOString(), minutes_allocated: pickOne([15, 30, 45, 60]),
    })),
    "id, patient_id, practitioner_id",
  );
  const patientLines = [
    "Doctor, I've been experiencing some chest discomfort since yesterday.",
    "My blood pressure readings have been high this week — should I be worried?",
    "Can I get a repeat prescription for my medication?",
    "I noticed some swelling in my ankles, is that normal?",
    "Thank you for the advice last time, I'm feeling much better.",
  ];
  const doctorLines = [
    "Please monitor your blood pressure twice daily and log the results in the app.",
    "Your results are slightly elevated. Let's discuss adjustments.",
    "I'll send the prescription digitally; you can collect it at any pharmacy.",
    "The swelling should resolve with rest and elevation. If it persists, come in.",
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
  console.log(`  ${convos.length} conversations, ${messageRows.length} messages.`);

  // ============================================================
  // 9. HOSPITAL APPOINTMENTS (20)
  // ============================================================
  console.log("\nSeeding hospital appointments...");
  const apptRows = Array.from({ length: 20 }, () => {
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
  });
  await insertBatch("hospital_appointments", apptRows, "id");

  // ============================================================
  // 10. PRACTITIONER SCHEDULES (next 14 days, every weekday)
  // ============================================================
  console.log("Seeding practitioner schedules...");
  let scheduleCount = 0;
  let slotCount = 0;
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
    const slotRows = inserted.flatMap((s, i) => slotsByIndex[i].map((slot) => ({ schedule_id: s.id, ...slot })));
    await insertBatch("practitioner_schedule_slots", slotRows, "id");
    scheduleCount += inserted.length;
    slotCount += slotRows.length;
  }
  console.log(`  ${scheduleCount} schedule days, ${slotCount} slots.`);

  // ============================================================
  // 11. PATIENT EVENTS
  // ============================================================
  const eventTitles = ["GP Follow-up Appointment", "Blood Pressure Medication Reminder", "Lab Test at Pathcare", "Specialist Consultation", "Take Morning Medication", "Blood Sugar Check", "Annual Wellness Check"];
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

  // ============================================================
  // 12. BILLING
  // ============================================================
  console.log("\nSeeding billing data...");
  const prices: Record<string, number> = { free: 0, pro: 299, family: 499 };
  const txnCategories = ["service_booking", "subscription", "pharmacy", "lab", "procedure"];
  const subRows: any[] = [];
  const pmRows: any[] = [];
  const txnRows: any[] = [];
  patients.forEach((pat, i) => {
    const tier = patientDefs[i].tier;
    subRows.push({
      patient_id: pat.id, tier, status: "active",
      start_date: subDays(new Date(), randInt(30, 365)).toISOString(), next_billing_date: addDays(new Date(), randInt(1, 30)).toISOString(),
      auto_renew: true, price: prices[tier],
    });
    pmRows.push({ patient_id: pat.id, type: "card", is_default: true, card_brand: pickOne(["Visa", "Mastercard"]), card_last4: faker.string.numeric(4), card_expiry_month: randInt(1, 12), card_expiry_year: randInt(2027, 2030) });
    if (patientDefs[i].medAid) {
      pmRows.push({ patient_id: pat.id, type: "medical_aid", is_default: false, medical_aid_provider: patientDefs[i].medAid!.provider, medical_aid_number: patientDefs[i].medAid!.memberNumber });
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

  await insertBatch("platform_fee_config", [{ platform_fee_percent: 15, subscription_fee_percent: 10, updated_by: megaAdmin.id, notes: "Default platform config" }], "id");
  console.log(`  ${subRows.length} subscriptions, ${pmRows.length} payment methods, ${txnRows.length} transactions.`);

  // ============================================================
  // 13. CONTENT (articles authored by the 5 seeded doctors + tips)
  // ============================================================
  console.log("\nSeeding articles & health tips...");
  await insertBatch("articles", [
    { title: "Understanding Cardiovascular Health in the Modern Era", slug: "understanding-cardiovascular-health-modern-era", excerpt: "Heart disease remains a global challenge, but modern proactive measures and digital monitoring can dramatically improve lifespan and quality of life.", content: "<h2>The Heart of the Matter</h2><p>Cardiovascular diseases remain the leading cause of death globally.</p>", cover_image: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&q=80&w=800", author: "Dr. Anke van Wyk", tags: ["Cardiology", "Wellness", "Preventative Care"], likes: 342, is_published: true, published_at: subDays(new Date(), 10).toISOString() },
    { title: "Managing Type 2 Diabetes: A Holistic Approach", slug: "managing-type-2-diabetes-holistic", excerpt: "Diabetes management is not just about insulin; it's about a complete lifestyle recalibration.", content: "<h2>Beyond the Numbers</h2><p>True management of Type 2 Diabetes requires a comprehensive overhaul of habits.</p>", cover_image: "https://images.unsplash.com/photo-1584308666744-24d5e44299ec?auto=format&fit=crop&q=80&w=800", author: "Dr. Zanele Khumalo", tags: ["Endocrinology", "Diabetes", "Diet"], likes: 228, is_published: true, published_at: subDays(new Date(), 5).toISOString() },
    { title: "Mental Health in Post-Pandemic South Africa", slug: "mental-health-post-pandemic-south-africa", excerpt: "The psychological toll of COVID-19 continues to affect millions of South Africans.", content: "<h2>A Silent Crisis</h2><p>South Africa faces a significant mental health crisis.</p>", cover_image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800", author: "Dr. Sipho Nkosi", tags: ["Mental Health", "Telehealth", "South Africa"], likes: 415, is_published: true, published_at: subDays(new Date(), 20).toISOString() },
    { title: "The Rise of Telehealth: Revolutionizing Patient Care in Africa", slug: "rise-of-telehealth-revolutionizing-patient-care-africa", excerpt: "From rural villages to urban centers, telehealth is transforming how Africans access quality healthcare.", content: "<h2>Breaking Barriers</h2><p>Geographic distance has long been a barrier to healthcare access across Africa.</p>", cover_image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800", author: "Dr. Oliver Mitchell", tags: ["Telehealth", "Innovation", "Africa"], likes: 567, is_published: true, published_at: subDays(new Date(), 15).toISOString() },
    { title: "Child Health Basics: Immunisation and Nutrition", slug: "child-health-basics-immunisation-nutrition", excerpt: "A practical guide for parents on keeping children healthy through their early years.", content: "<h2>Healthy Start</h2><p>Immunisation and good nutrition are the foundation of child health.</p>", cover_image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=800", author: "Dr. Priya Naidoo", tags: ["Pediatrics", "Nutrition", "Prevention"], likes: 198, is_published: true, published_at: subDays(new Date(), 30).toISOString() },
  ], "id");

  const tipTitles = ["Drink 8 Glasses of Water Daily", "Walk for 20 Minutes Every Day", "Limit Screen Time Before Bed", "Practice Deep Breathing for Stress", "Eat More Vegetables at Every Meal", "Check Your Blood Pressure Weekly"];
  await insertBatch("health_tips", tipTitles.map((title, idx) => ({
    title, excerpt: faker.lorem.sentence(), content: faker.lorem.paragraphs(2),
    author: pickOne(doctorDefs.map((d) => `Dr. ${d.fn} ${d.ln}`)),
    published_date: subDays(new Date(), idx).toISOString(), read_time: pickOne(["1 min", "2 min", "3 min"]), tag: "Daily Tip", category: "tip",
  })), "id");

  // ============================================================
  // 14. HOSPITAL TRANSACTIONS, WELLNESS, PRACTITIONER INVOICES
  // ============================================================
  console.log("\nSeeding hospital transactions, wellness & invoices...");
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
    invoice_number: `INV-${String(i + 1).padStart(5, "0")}`,
  })), "id");

  // ============================================================
  // 15. SYSTEM CONFIG (single row)
  // ============================================================
  await insertBatch("system_config", [{
    features: { telehealth: true, aiDiagnizer: true, prescriptions: true, registrations: true },
    maintenance_mode: false, popia_version: "1.0", consultation_fee_default: 0,
    emergency_numbers: ["112", "10177"], supported_languages: ["en", "af", "zu"],
  }], "id");

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log("\n====== SEEDING COMPLETE ======");
  console.log(`Hospital:      ${facility.name}`);
  console.log(`Doctors:       ${doctors.length}`);
  console.log(`Patients:      ${patients.length}`);
  console.log(`Consultations: ${consultations.length}`);
  console.log(`Conversations: ${convos.length} / Messages: ${messageRows.length}`);
  console.log(`Transactions:  ${txnRows.length}`);
  console.log("\nAll accounts use password: Password123!");
  console.log("Logins:");
  console.log("  Hospital admin: makabmahlalela+hospital@gmail.com");
  console.log("  Super / Mega:   super@247digihealth.com, mega@247digihealth.com");
  console.log("  Doctors:        makabmahlalela+mitchell / +vanwyk / +nkosi / +naidoo / +khumalo @gmail.com");
  console.log("  Patients:       makabmahlalela+thandiwe / +john / +nomvula / +pieter / +fatima @gmail.com");
  console.log("==============================\n");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});