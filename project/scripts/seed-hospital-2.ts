/**
 * ADDITIVE seed: a SECOND hospital (Sunbird Regional Hospital, Durban - a fictional hospital) with its own
 * 5 doctors and 5 patients. It does NOT wipe the database, so the first hospital
 * (Netcare Milpark) and everything else stays untouched.
 *
 * Re-runnable: it first removes only this hospital's own set (its facility and
 * the 11 users listed below), then recreates it.
 *
 * Does not touch global rows (super/mega admin, articles, health tips,
 * system_config, platform_fee_config) - the first seed already created those.
 *
 * Run (dev databases only):
 *   ALLOW_SEED=true npx tsx scripts/seed-hospital-2.ts
 */
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";
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

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SECRET_KEY");
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

async function insertBatch<T extends Record<string, unknown>>(table: string, rows: T[], select = "id"): Promise<any[]> {
  const out: any[] = [];
  for (let i = 0; i < rows.length; i += 500) {
    const { data, error } = await supabase.from(table).insert(rows.slice(i, i + 500)).select(select);
    if (error) throw new Error(`${table} insert failed: ${error.message}`);
    out.push(...(data || []));
  }
  return out;
}

// ---- THIS SET'S IDENTITY ----
const BASE = "aymish143";
const email = (tag: string) => `${BASE}+${tag}@gmail.com`;
const FACILITY_NAME = "Sunbird Regional Hospital"; // fictional
// An earlier run of this script used a real hospital name; remove that leftover facility too.
const LEGACY_FACILITY_NAME = "Netcare St Augustine's Hospital";

const doctorDefs = [
  { tag: "drthabo", fn: "Thabo", ln: "Mokoena", spec: "General Practitioner", hpcsa: "MP0567890", exp: 15, langs: ["English", "isiZulu", "Sesotho"], bio: "General practitioner focused on family medicine, chronic disease follow-up and preventive care." },
  { tag: "drmarelize", fn: "Marelize", ln: "Botha", spec: "Obstetrician", hpcsa: "MP0678901", exp: 19, langs: ["English", "Afrikaans"], bio: "Obstetrician supporting women through pregnancy, delivery and postnatal care." },
  { tag: "drbongani", fn: "Bongani", ln: "Dlamini", spec: "Orthopedic Surgeon", hpcsa: "MP0789012", exp: 21, langs: ["English", "isiZulu"], bio: "Orthopedic surgeon treating joint, spine and sports injuries." },
  { tag: "drfatima", fn: "Fatima", ln: "Khan", spec: "Dermatologist", hpcsa: "MP0890123", exp: 12, langs: ["English", "Afrikaans"], bio: "Dermatologist managing skin conditions, allergies and cosmetic concerns via telehealth." },
  { tag: "drriaan", fn: "Riaan", ln: "Steyn", spec: "Neurologist", hpcsa: "MP0901234", exp: 17, langs: ["English", "Afrikaans"], bio: "Neurologist specialising in headache disorders, epilepsy and stroke recovery." },
];

const patientDefs = [
  { tag: "lerato", fn: "Lerato", ln: "Mahlangu", dob: new Date(1988, 2, 17), gender: "female", mobile: "+27 82 555 1001", ecName: "Kagiso Mahlangu", ecPhone: "+27 82 555 0001", ecRel: "Spouse", medAid: { provider: "Discovery Health", planName: "Smart", memberNumber: "DSC555100100" }, tier: "pro" },
  { tag: "andile", fn: "Andile", ln: "Zulu", dob: new Date(1979, 10, 2), gender: "male", mobile: "+27 71 555 2002", ecName: "Nandi Zulu", ecPhone: "+27 71 555 0002", ecRel: "Sibling", medAid: null, tier: "free" },
  { tag: "chantelle", fn: "Chantelle", ln: "du Plessis", dob: new Date(1995, 5, 24), gender: "female", mobile: "+27 83 555 3003", ecName: "Johan du Plessis", ecPhone: "+27 83 555 0003", ecRel: "Parent", medAid: { provider: "Bonitas", planName: "Essential", memberNumber: "BON555300300" }, tier: "pro" },
  { tag: "sandile", fn: "Sandile", ln: "Nkosi", dob: new Date(1960, 8, 12), gender: "male", mobile: "+27 72 555 4004", ecName: "Zinhle Nkosi", ecPhone: "+27 72 555 0004", ecRel: "Child", medAid: { provider: "GEMS", planName: "Sapphire", memberNumber: "GEM555400400" }, tier: "free" },
  { tag: "ayesha", fn: "Ayesha", ln: "Naidoo", dob: new Date(2001, 0, 30), gender: "female", mobile: "+27 76 555 5005", ecName: "Priya Naidoo", ecPhone: "+27 76 555 0005", ecRel: "Parent", medAid: null, tier: "free" },
];

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

// Remove only THIS set (re-run safety). Cascades clear everything hanging off these rows.
async function removeExistingSet() {
  console.log("Removing any previous copy of this hospital set...");
  const emails = [
    email("hospital"),
    ...doctorDefs.map((d) => email(d.tag)),
    ...patientDefs.map((p) => email(p.tag)),
  ];
  const fac = await supabase.from("facilities").delete().in("name", [FACILITY_NAME, LEGACY_FACILITY_NAME]);
  if (fac.error) console.warn("  facility cleanup skipped:", fac.error.message);
  const usr = await supabase.from("users").delete().in("email", emails);
  if (usr.error) console.warn("  user cleanup skipped:", usr.error.message);
}

async function main() {
  await removeExistingSet();
  const pw = hash("Password123!");

  // ============================================================
  // 1. FACILITY
  // ============================================================
  console.log("\nSeeding facility...");
  const [facility] = await insertBatch("facilities", [{
    name: FACILITY_NAME, facility_type: "Private",
    address_street: "25 Marula Avenue, Berea", address_city: "Durban", address_province: "KwaZulu-Natal",
    location_lng: 31.0050, location_lat: -29.8550,
    contact_phone: "+27 31 555 0100", contact_emergency_phone: "+27 31 555 0111", contact_email: `${BASE}@gmail.com`,
    bed_total: 400, bed_general_available: 300, bed_icu_available: 50, current_wait_time_mins: 25, is_open: true,
    specialties: ["General Medicine", "Obstetrics", "Orthopedics", "Dermatology", "Neurology", "Radiology", "Pharmacy"],
    emergency_services: true, file_number_prefix: "SB",
  }], "id, name");
  console.log(`  ${facility.name} created.`);

  // ============================================================
  // 2. HOSPITAL ADMIN
  // ============================================================
  const [hospitalAdmin] = await insertBatch("users", [{
    email: email("hospital"), password_hash: pw, role: "hospital_admin",
    first_name: "Naledi", last_name: "Maseko", status: "active", email_verified: true,
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

  // ============================================================
  // 3. DOCTORS (5)
  // ============================================================
  console.log("\nSeeding 5 doctors...");
  const doctors = await insertBatch("users", doctorDefs.map((d) => ({
    email: email(d.tag), password_hash: pw, role: "practitioner",
    first_name: d.fn, last_name: d.ln, status: "active", email_verified: true, ...hospitalProvisioned,
  })), "id, first_name, last_name");
  await insertBatch("practitioner_profiles", doctors.map((u, i) => {
    const d = doctorDefs[i];
    return {
      user_id: u.id, specialisation: d.spec, hpcsa_number: d.hpcsa, experience_years: d.exp,
      bio: d.bio, languages: d.langs, accepted_medical_aids: pickSome(MEDAIDS, 2, 4),
      rating: parseFloat(faker.number.float({ min: 4.0, max: 5.0, fractionDigits: 1 }).toFixed(1)),
      review_count: randInt(20, 300), is_online: i < 3, achievements: i % 2 === 0 ? ["Excellence Award"] : [],
      bank_account_holder: `Dr ${d.fn} ${d.ln}`, bank_name: pickOne(BANKS),
      bank_account_number: faker.string.numeric(10), bank_branch_code: faker.string.numeric(6),
      tax_number: faker.string.numeric(10),
      address_street: `${randInt(1, 200)} Medical Centre, Durban`, address_city: "Durban", address_province: "KwaZulu-Natal",
    };
  }));
  await insertBatch("practitioner_facilities", doctors.map((u) => ({ practitioner_id: u.id, facility_id: facility.id })), "practitioner_id");
  await insertBatch("staff", doctors.map((u, i) => ({
    user_id: u.id, facility_id: facility.id, role: "doctor", department: doctorDefs[i].spec,
    shift_start: "08:00", shift_end: "16:00", shift_days: [1, 2, 3, 4, 5], is_on_duty: true, hourly_rate: 450,
    file_number: `DR-${String(i + 1).padStart(4, "0")}`, status: "active",
  })), "id");

  // ============================================================
  // 4. PATIENTS (5)
  // ============================================================
  console.log("Seeding 5 patients...");
  const saIds = patientDefs.map((p) => generateSAId(p.dob, p.gender === "female"));
  const patients = await insertBatch("users", patientDefs.map((p, i) => ({
    email: email(p.tag), password_hash: pw, role: "patient", first_name: p.fn, last_name: p.ln,
    sa_id: saIds[i], mobile: p.mobile, status: "active", email_verified: true, ...hospitalProvisioned,
  })), "id, first_name, last_name");
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
  const patientFiles = await insertBatch("facility_patients", patients.map((u, i) => ({
    facility_id: facility.id, patient_id: u.id, file_number: `SB-${String(i + 1).padStart(6, "0")}`,
    status: "active", verified_at: new Date().toISOString(), issued_by: hospitalAdmin.id,
  })), "id, patient_id");
  await insertBatch("facility_patient_profiles", patientFiles.map((f) => {
    const p = patientDefs[patients.findIndex((u) => u.id === f.patient_id)];
    return {
      facility_patient_id: f.id,
      medical_aid_provider: p.medAid?.provider || null, medical_aid_plan_name: p.medAid?.planName || null,
      medical_aid_member_number: p.medAid?.memberNumber || null,
      emergency_contact_name: p.ecName, emergency_contact_phone: p.ecPhone, emergency_contact_relationship: p.ecRel,
      referring_doctor: `Dr. ${doctors[0].first_name} ${doctors[0].last_name}`,
    };
  }), "id");

  // Links: GP + one specialist per patient as my_doctor/assigned, plus one favorite
  console.log("  Linking patients <-> doctors...");
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

  // (No separate nurse/technician staff rows: only the doctors are seeded as staff.)

  // ============================================================
  // 6. CLINICAL DATA (hospital-owned: facility_id set)
  // ============================================================
  console.log("\nSeeding clinical data...");
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

  // ============================================================
  // 7. CONSULTATIONS (40: every pair gets 2 online + 2 in-person)
  // ============================================================
  console.log("\nSeeding consultations...");
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

  // ============================================================
  // 8. CONVERSATIONS + MESSAGES
  // ============================================================
  console.log("Seeding conversations & messages...");
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

  // ============================================================
  // 9. HOSPITAL APPOINTMENTS (20, in-person at the hospital)
  // ============================================================
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

  // ============================================================
  // 10. PRACTITIONER SCHEDULES (next 14 days, weekdays)
  // ============================================================
  console.log("Seeding practitioner schedules...");
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

  // ============================================================
  // 11. PATIENT EVENTS
  // ============================================================
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

  // ============================================================
  // 12. BILLING
  // ============================================================
  console.log("Seeding billing data...");
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

  // ============================================================
  // 13. HOSPITAL TRANSACTIONS, WELLNESS, PRACTITIONER INVOICES
  // ============================================================
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
    invoice_number: `SB-INV-${String(i + 1).padStart(5, "0")}`,
  })), "id");

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log("\n====== HOSPITAL 2 SEEDED (existing data untouched) ======");
  console.log(`Hospital:      ${facility.name}`);
  console.log(`Doctors:       ${doctors.length}`);
  console.log(`Patients:      ${patients.length}`);
  console.log(`Consultations: ${consultations.length}`);
  console.log(`Conversations: ${convos.length} / Messages: ${messageRows.length}`);
  console.log(`Transactions:  ${txnRows.length}`);
  console.log("\nAll accounts use password: Password123!");
  console.log("Logins (all deliver to aymish143@gmail.com):");
  console.log(`  Hospital admin: ${email("hospital")}`);
  console.log(`  Doctors:        ${doctorDefs.map((d) => email(d.tag)).join(", ")}`);
  console.log(`  Patients:       ${patientDefs.map((p) => email(p.tag)).join(", ")}`);
  console.log("==========================================================\n");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});