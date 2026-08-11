/**
 * Postgres-native seed script — generates a full, realistic, self-consistent
 * dataset directly in Supabase Postgres via faker.js, WITHOUT touching
 * MongoDB at all. This is the dataset for finishing the full disconnect
 * from Mongo: same known anchor emails and shared password as the original
 * scripts/seed.ts (so existing test-login docs/habits keep working), same
 * data-generation patterns, but writes straight into the 36 Postgres tables.
 *
 * DESTRUCTIVE: wipes every row in every app table before reseeding (Postgres
 * only — MongoDB is never touched by this script). Safe to re-run.
 *
 * Run: npx tsx scripts/seed-supabase.ts
 */
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";
import * as dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

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
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
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

// ---- DATA POOLS (same as scripts/seed.ts) ----
const SPECIALISATIONS = [
  "General Practitioner", "Cardiologist", "Pediatrician", "Dermatologist",
  "Psychiatrist", "Neurologist", "Orthopedic Surgeon", "Oncologist",
  "Endocrinologist", "Gastroenterologist", "Pulmonologist", "Radiologist",
  "Obstetrician", "Rheumatologist", "Urologist", "Ophthalmologist",
  "ENT Specialist", "Hematologist", "Nephrologist", "Geriatrician",
];
const SOUTH_AFRICAN_FIRST_NAMES_M = [
  "Sipho", "Thabo", "Bongani", "Lethiwe", "Lungelo", "Mthokozisi", "Siyanda",
  "Nkosinathi", "Mduduzi", "Sibusiso", "Andile", "Lwazi", "Nhlanhla", "Musa",
  "Sandile", "Thandolwethu", "Sakhile", "Mthunzi", "Mpendulo", "Bayanda",
  "James", "Michael", "David", "Robert", "William", "Richard", "Thomas",
  "Pieter", "Johan", "Christiaan", "Hendrik", "Schalk", "Riaan", "Deon",
  "Keegan", "Bradley", "Dylan", "Nathan", "Ethan", "Cameron",
];
const SOUTH_AFRICAN_FIRST_NAMES_F = [
  "Thandiwe", "Nokuthula", "Nomvula", "Zanele", "Lungile", "Nomthandazo",
  "Buyisiwe", "Thandi", "Noxolo", "Sifiso", "Ntombifuthi", "Simangele",
  "Hlengiwe", "Nompumelelo", "Zinhle", "Nothando", "Nokukhanya", "Mbali",
  "Sarah", "Emma", "Olivia", "Ava", "Isabella", "Mia", "Charlotte",
  "Anke", "Marelize", "Liesl", "Riana", "Hanlie", "Elzette", "Chantelle",
  "Priya", "Fatima", "Ayesha", "Nomsa", "Nandi", "Lerato", "Palesa",
];
const SOUTH_AFRICAN_LAST_NAMES = [
  "Mokoena", "Dlamini", "Zulu", "Mthembu", "Nkosi", "Khumalo", "Ndlovu",
  "Mhlongo", "Gumede", "Ntanzi", "Sithole", "Mthethwa", "Luthuli", "Bhengu",
  "van Wyk", "van der Merwe", "Botha", "Nel", "du Plessis", "Joubert",
  "Pretorius", "Steyn", "Venter", "Visser", "Coetzer", "Swanepoel", "du Toit",
  "Mitchell", "Johnson", "Williams", "Brown", "Jones", "Davis", "Miller",
  "Patel", "Khan", "Naidoo", "Pillay", "Govender", "Reddy", "Singh",
];
const CHRONIC_CONDITIONS = [
  "Hypertension", "Type 2 Diabetes", "Asthma", "COPD", "Heart Failure",
  "Hypothyroidism", "Hyperlipidemia", "Depression", "Anxiety Disorder",
  "Chronic Kidney Disease", "Rheumatoid Arthritis", "Osteoporosis",
  "Epilepsy", "Migraine", "Fibromyalgia", "Irritable Bowel Syndrome",
  "Sleep Apnea", "Atrial Fibrillation", "Chronic Back Pain",
];
const MEDICATIONS = [
  "Amlodipine 5mg", "Metformin 500mg", "Atorvastatin 20mg", "Lisinopril 10mg",
  "Losartan 50mg", "Salbutamol Inhaler", "Metoprolol 25mg", "Omeprazole 20mg",
  "Levothyroxine 50mcg", "Aspirin 81mg", "Furosemide 40mg", "Warfarin 5mg",
  "Sertraline 50mg", "Amitriptyline 25mg", "Prednisolone 5mg", "Montelukast 10mg",
  "Rosuvastatin 10mg", "Spironolactone 25mg", "Carvedilol 6.25mg", "Empagliflozin 10mg",
];
const ALLERGENS = [
  { allergen: "Penicillin", reaction: "Anaphylaxis", severity: "severe" },
  { allergen: "Sulfonamides", reaction: "Rash and urticaria", severity: "moderate" },
  { allergen: "NSAIDs", reaction: "Bronchospasm", severity: "severe" },
  { allergen: "Peanuts", reaction: "Hives", severity: "mild" },
  { allergen: "Latex", reaction: "Contact dermatitis", severity: "moderate" },
  { allergen: "Codeine", reaction: "Nausea and itching", severity: "mild" },
  { allergen: "Shellfish", reaction: "Anaphylaxis", severity: "severe" },
  { allergen: "Cephalosporins", reaction: "Maculopapular rash", severity: "moderate" },
];
const COMPLAINT_TEMPLATES = [
  "Patient presents with persistent headache for the past 3 days",
  "Chief complaint of shortness of breath on exertion",
  "Follow-up for hypertension management and medication review",
  "Routine diabetes mellitus check-up and HbA1c review",
  "Patient reports chest palpitations and mild dizziness",
  "Skin rash on forearms, pruritic, appeared 5 days ago",
  "Chronic lower back pain, worsening with prolonged sitting",
  "Annual wellness check-up with blood pressure monitoring",
  "Complaint of fatigue and unexplained weight loss over 2 months",
  "Follow-up post-operative care after appendectomy",
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
  { testName: "Renal Function", parameters: [
    { name: "Creatinine", unit: "µmol/L", referenceRange: "64-104", baseValue: 85 },
    { name: "eGFR", unit: "mL/min/1.73m²", referenceRange: ">60", baseValue: 78 },
  ]},
];
const VACCINES = [
  { name: "COVID-19 (Pfizer-BioNTech)", dosage: "0.3 mL IM" },
  { name: "Influenza (Annual)", dosage: "0.5 mL IM" },
  { name: "Hepatitis B", dosage: "1.0 mL IM" },
  { name: "Tetanus-Diphtheria (Td)", dosage: "0.5 mL IM" },
];
const SA_PROVINCES = ["Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape", "Limpopo", "Mpumalanga", "North West", "Free State", "Northern Cape"];
const SA_CITIES = ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth", "East London", "Bloemfontein", "Polokwane", "Nelspruit"];
const BANKS = ["FNB", "Standard Bank", "Nedbank", "Absa", "Capitec"];
const MEDAIDS = ["Discovery Health", "Bonitas", "Momentum Health", "GEMS", "Bestmed", "Fedhealth", "Medihelp"];

// Tables in child->parent order so FK constraints never block the wipe.
const WIPE_ORDER = [
  "practitioner_schedule_slots", "practitioner_schedules", "reviews",
  "patient_events", "body_annotations", "offline_action_queue", "notifications",
  "health_tips", "articles", "messages", "attached_records", "calls",
  "conversations", "clinical_decision_support", "ai_triage_sessions",
  "risk_scores", "hospital_revenue_by_department", "hospital_revenue",
  "platform_fee_config", "payment_methods", "payout_requests", "subscriptions",
  "payment_transactions", "lab_result_parameters", "lab_results", "immunizations",
  "prescriptions", "patient_allergies", "medical_context", "anthropometrics",
  "consultations", "bed_occupancy", "hospital_appointments", "staff_invites",
  "staff", "patient_practitioner_links", "practitioner_facilities",
  "hospital_admin_profiles", "practitioner_profiles", "patient_profiles",
  "facilities", "audit_logs", "system_config", "users",
];

async function wipeAll() {
  console.log("Wiping existing Postgres data (MongoDB untouched)...");
  for (const table of WIPE_ORDER) {
    const { error } = await supabase.from(table).delete().not("id", "is", null);
    if (error) console.warn(`  wipe ${table} skipped:`, error.message);
  }
  console.log("Wipe complete.\n");
}

async function main() {
  await wipeAll();

  const pw = hash("Password123!");

  // ============================================================
  // 1. FACILITIES
  // ============================================================
  console.log("Seeding facilities...");
  const facilityRows = [
    { name: "Netcare Milpark Hospital", facility_type: "Private", address_street: "9 Guild Rd, Parktown", address_city: "Johannesburg", address_province: "Gauteng", location_lng: 28.0315, location_lat: -26.1802, contact_phone: "+27 11 480 0000", contact_emergency_phone: "+27 11 480 0111", contact_email: "info@milpark.netcare.co.za", bed_total: 300, bed_general_available: 240, bed_icu_available: 40, current_wait_time_mins: 15, is_open: true, specialties: ["Cardiology", "Trauma", "Neurology", "Burn Unit", "Radiology", "Pharmacy"], emergency_services: true },
    { name: "Life Brenthurst Hospital", facility_type: "Private", address_street: "4 Park Lane, Parktown", address_city: "Johannesburg", address_province: "Gauteng", location_lng: 28.0385, location_lat: -26.1822, contact_phone: "+27 11 647 9000", contact_emergency_phone: "+27 11 647 9111", contact_email: "brenthurst@lifehealthcare.co.za", bed_total: 150, bed_general_available: 100, bed_icu_available: 20, current_wait_time_mins: 20, is_open: true, specialties: ["Maternity", "Orthopedics", "General Surgery"], emergency_services: true },
    { name: "Mediclinic Sandton", facility_type: "Private", address_street: "Corner Main Rd & Peter Place", address_city: "Sandton", address_province: "Gauteng", location_lng: 28.0163, location_lat: -26.0718, contact_phone: "+27 11 709 2000", contact_emergency_phone: "+27 11 709 2111", contact_email: "sandton@mediclinic.co.za", bed_total: 200, bed_general_available: 150, bed_icu_available: 25, current_wait_time_mins: 10, is_open: true, specialties: ["Pediatrics", "Oncology", "Internal Medicine"], emergency_services: true },
    { name: "Helen Joseph Hospital", facility_type: "Public", address_street: "1 Perth Rd, Rossmore", address_city: "Johannesburg", address_province: "Gauteng", location_lng: 27.9945, location_lat: -26.1834, contact_phone: "+27 11 489 1011", contact_emergency_phone: "+27 11 489 1111", contact_email: "info@gauteng.gov.za", bed_total: 500, bed_general_available: 400, bed_icu_available: 30, current_wait_time_mins: 45, is_open: true, specialties: ["General Medicine", "Trauma", "Psychiatry"], emergency_services: true },
    { name: "Groote Schuur Hospital", facility_type: "Public", address_street: "Anzio Rd, Observatory", address_city: "Cape Town", address_province: "Western Cape", location_lng: 18.4633, location_lat: -33.9405, contact_phone: "+27 21 404 9111", contact_emergency_phone: "+27 21 404 9009", contact_email: "info@gsh.gov.za", bed_total: 800, bed_general_available: 600, bed_icu_available: 80, current_wait_time_mins: 60, is_open: true, specialties: ["Cardiothoracic Surgery", "Neurosurgery", "Transplant Services", "Oncology"], emergency_services: true },
    { name: "Netcare St Augustine's Hospital", facility_type: "Private", address_street: "107 J.B. Marks Rd", address_city: "Durban", address_province: "KwaZulu-Natal", location_lng: 30.9866, location_lat: -29.8468, contact_phone: "+27 31 268 5000", contact_emergency_phone: "+27 31 268 5100", contact_email: "staugs@netcare.co.za", bed_total: 400, bed_general_available: 300, bed_icu_available: 50, current_wait_time_mins: 25, is_open: true, specialties: ["Trauma", "Cardiology", "Maternity", "Orthopedics"], emergency_services: true },
    { name: "Tygerberg Hospital", facility_type: "Public", address_street: "Francie van Zijl Dr", address_city: "Bellville", address_province: "Western Cape", location_lng: 18.6293, location_lat: -33.9177, contact_phone: "+27 21 938 4911", contact_emergency_phone: "+27 21 938 9111", contact_email: "info@tygerberg.gov.za", bed_total: 1386, bed_general_available: 1100, bed_icu_available: 120, current_wait_time_mins: 75, is_open: true, specialties: ["Burn Unit", "Neonatal ICU", "Cardiology", "General Medicine", "Psychiatry"], emergency_services: true },
  ];
  const facilities = await insertBatch("facilities", facilityRows, "id, name");
  console.log(`  ${facilities.length} facilities created.`);

  // ============================================================
  // 2. ADMIN USERS
  // ============================================================
  console.log("\nSeeding admin users...");
  const adminData = [
    { email: "admin@milpark.netcare.co.za", firstName: "Sarah", lastName: "Jenkins", facilityIdx: 0 },
    { email: "admin@brenthurst.co.za", firstName: "Deon", lastName: "Pretorius", facilityIdx: 1 },
    { email: "admin@mediclinic-sandton.co.za", firstName: "Priya", lastName: "Naidoo", facilityIdx: 2 },
    { email: "admin@helenjoseph.co.za", firstName: "Thabo", lastName: "Mokoena", facilityIdx: 3 },
    { email: "admin@staugs.netcare.co.za", firstName: "Zanele", lastName: "Khumalo", facilityIdx: 5 },
  ];
  const hospitalAdminUsers = await insertBatch(
    "users",
    adminData.map((a) => ({
      email: a.email, password_hash: pw, role: "hospital_admin",
      first_name: a.firstName, last_name: a.lastName, status: "active", email_verified: true,
    })),
    "id, email",
  );
  await insertBatch(
    "hospital_admin_profiles",
    hospitalAdminUsers.map((u, i) => ({
      user_id: u.id,
      facility_id: facilities[adminData[i].facilityIdx].id,
      department: pickOne(["Administration", "Finance", "Operations", "Quality Assurance"]),
      permissions: ["bed_management", "staff_management", "reports", "billing"],
    })),
  );

  const [superAdmin] = await insertBatch("users", [{
    email: "super@247digihealth.com", password_hash: pw, role: "super_admin",
    first_name: "Alex", last_name: "Thornton", status: "active", email_verified: true,
  }], "id");
  const [megaAdmin] = await insertBatch("users", [{
    email: "mega@247digihealth.com", password_hash: pw, role: "mega_admin",
    first_name: "Victoria", last_name: "Harrington", status: "active", email_verified: true,
  }], "id");
  console.log(`  ${hospitalAdminUsers.length} hospital admins + super + mega admin created.`);

  // ============================================================
  // 3. PRACTITIONERS (50: 2 named anchors + 48 generated)
  // ============================================================
  console.log("\nSeeding 50 practitioners...");
  const practUserRows = [
    { email: "mitchell@247digihealth.com", password_hash: pw, role: "practitioner", first_name: "Oliver", last_name: "Mitchell", status: "active", email_verified: true },
    { email: "vwyk@247digihealth.com", password_hash: pw, role: "practitioner", first_name: "Anke", last_name: "van Wyk", status: "active", email_verified: true },
  ];
  const practMeta: { spec: string; hpcsa: string }[] = [
    { spec: "General Practitioner", hpcsa: "MP0123456" },
    { spec: "Cardiologist", hpcsa: "MP0654321" },
  ];
  for (let i = 0; i < 48; i++) {
    const isFemale = faker.datatype.boolean();
    const fn = isFemale ? pickOne(SOUTH_AFRICAN_FIRST_NAMES_F) : pickOne(SOUTH_AFRICAN_FIRST_NAMES_M);
    const ln = pickOne(SOUTH_AFRICAN_LAST_NAMES);
    practUserRows.push({
      email: `dr.${fn.toLowerCase().replace(/\s/g, "")}.${ln.toLowerCase().replace(/\s/g, "")}${i}@247digihealth.com`,
      password_hash: pw, role: "practitioner", first_name: fn, last_name: ln,
      status: pickOne(["active", "active", "active", "pending_verification"]), email_verified: true,
    });
    practMeta.push({ spec: pickOne(SPECIALISATIONS), hpcsa: "MP" + faker.string.numeric(7) });
  }
  const practitionerUsers = await insertBatch("users", practUserRows, "id, first_name, last_name");

  const practProfileRows = practitionerUsers.map((u, i) => {
    const meta = practMeta[i];
    const expYears = randInt(2, 35);
    const city = pickOne(SA_CITIES);
    const province = pickOne(SA_PROVINCES);
    const bank = pickOne(BANKS);
    return {
      user_id: u.id,
      specialisation: meta.spec,
      hpcsa_number: meta.hpcsa,
      experience_years: expYears,
      bio: i < 2
        ? (i === 0
          ? "Experienced family physician committed to holistic patient care and preventive medicine."
          : "Specializing in interventional cardiology and heart failure management.")
        : `Dr. ${u.first_name} ${u.last_name} is a ${meta.spec} with ${expYears} years of experience. ${faker.lorem.sentence()}`,
      languages: i < 2 ? ["English", "Afrikaans", "isiZulu"] : pickSome(["English", "Afrikaans", "isiZulu", "Xhosa", "Sesotho", "Setswana", "Venda"], 1, 3),
      accepted_medical_aids: pickSome(MEDAIDS, 2, 5),
      rating: parseFloat(faker.number.float({ min: 3.5, max: 5.0, fractionDigits: 1 }).toFixed(1)),
      review_count: randInt(5, 500),
      is_online: faker.datatype.boolean(),
      achievements: faker.datatype.boolean() ? [pickOne(["Dean's List", "Excellence Award", "Research Grant Recipient", "Top Specialist 2023"])] : [],
      bank_account_holder: `Dr ${u.first_name} ${u.last_name}`,
      bank_name: bank,
      bank_account_number: faker.string.numeric(10),
      bank_branch_code: faker.string.numeric(6),
      tax_number: faker.string.numeric(10),
      address_street: `${randInt(1, 200)} Medical Centre, ${city}`,
      address_city: city,
      address_province: province,
    };
  });
  await insertBatch("practitioner_profiles", practProfileRows);

  const practFacilityLinks: { practitioner_id: string; facility_id: string }[] = [];
  practitionerUsers.forEach((u) => {
    for (const f of pickSome(facilities, 1, 2)) practFacilityLinks.push({ practitioner_id: u.id, facility_id: f.id });
  });
  await insertBatch("practitioner_facilities", practFacilityLinks, "practitioner_id");
  console.log(`  ${practitionerUsers.length} practitioners created.`);

  // ============================================================
  // 4. PATIENTS (250: 2 anchors + 248 generated)
  // ============================================================
  console.log("\nSeeding 250 patients...");
  const patientUserRows: any[] = [
    { email: "thandiwe.mokoena@example.com", password_hash: pw, role: "patient", first_name: "Thandiwe", last_name: "Mokoena", sa_id: "9005125123081", mobile: "+27 82 111 2222", status: "active", email_verified: true },
    { email: "john.dlamini@example.com", password_hash: pw, role: "patient", first_name: "John", last_name: "Dlamini", sa_id: "8301155012084", mobile: "+27 71 333 4444", status: "active", email_verified: true },
  ];
  const patientMeta: any[] = [
    { dob: new Date(1990, 4, 12), gender: "female", ecName: "Samuel Mokoena", ecPhone: "+27 82 111 0000", ecRel: "Husband", medAid: { provider: "Discovery Health", planName: "Classic Smart", memberNumber: "DSC123456789" }, tier: "pro" },
    { dob: new Date(1983, 0, 15), gender: "male", ecName: "Busi Dlamini", ecPhone: "+27 71 333 0000", ecRel: "Sister", medAid: null, tier: "pro" },
  ];
  const usedSaIds = new Set(["9005125123081", "8301155012084"]);
  const usedEmails = new Set(["thandiwe.mokoena@example.com", "john.dlamini@example.com"]);
  for (let i = 0; i < 248; i++) {
    const isFemale = faker.datatype.boolean();
    const dob = faker.date.birthdate({ min: 18, max: 80, mode: "age" });
    const fn = isFemale ? pickOne(SOUTH_AFRICAN_FIRST_NAMES_F) : pickOne(SOUTH_AFRICAN_FIRST_NAMES_M);
    const ln = pickOne(SOUTH_AFRICAN_LAST_NAMES);
    let saId = generateSAId(dob, isFemale);
    let attempts = 0;
    while (usedSaIds.has(saId) && attempts < 20) { saId = generateSAId(dob, isFemale); attempts++; }
    usedSaIds.add(saId);
    let email = `${fn.toLowerCase().replace(/\s/g, "")}.${ln.toLowerCase().replace(/\s/g, "")}${i}@example.com`;
    if (usedEmails.has(email)) email = `patient${i}.${faker.string.alphanumeric(4)}@example.com`;
    usedEmails.add(email);
    const hasMedicalAid = faker.datatype.boolean();

    patientUserRows.push({
      email, password_hash: pw, role: "patient", first_name: fn, last_name: ln, sa_id: saId,
      mobile: `+27 ${randInt(60, 84)} ${faker.string.numeric(3)} ${faker.string.numeric(4)}`,
      status: pickOne(["active", "active", "active", "suspended"]), email_verified: true,
    });
    patientMeta.push({
      dob, gender: isFemale ? "female" : "male",
      ecName: faker.person.fullName(), ecPhone: `+27 ${randInt(60, 84)} ${faker.string.numeric(7)}`,
      ecRel: pickOne(["Spouse", "Parent", "Child", "Sibling", "Friend"]),
      medAid: hasMedicalAid ? { provider: pickOne(MEDAIDS), planName: pickOne(["Classic", "Smart", "Comprehensive", "Essential", "Core", "Executive"]), memberNumber: faker.string.alphanumeric(10).toUpperCase() } : null,
      tier: pickOne(["free", "free", "pro", "pro"]),
    });
  }
  const patientUsers = await insertBatch("users", patientUserRows, "id");
  await insertBatch("patient_profiles", patientUsers.map((u, i) => {
    const m = patientMeta[i];
    return {
      user_id: u.id, date_of_birth: m.dob.toISOString().slice(0, 10), gender: m.gender,
      emergency_contact_name: m.ecName, emergency_contact_phone: m.ecPhone, emergency_contact_relationship: m.ecRel,
      medical_aid_provider: m.medAid?.provider || null, medical_aid_plan_name: m.medAid?.planName || null, medical_aid_member_number: m.medAid?.memberNumber || null,
      subscription_tier: m.tier, popia_consent_date: subDays(new Date(), randInt(1, 700)).toISOString(),
    };
  }));

  // Patient <-> practitioner links (myDoctorIds / favoritePractitionerIds / assignedPatientIds)
  console.log("  Linking patients <-> practitioners...");
  const links: { patient_id: string; practitioner_id: string; link_type: string }[] = [];
  for (const pat of patientUsers) {
    for (const doc of pickSome(practitionerUsers, 1, 3)) links.push({ patient_id: pat.id, practitioner_id: doc.id, link_type: "my_doctor" });
    if (faker.datatype.boolean()) {
      for (const doc of pickSome(practitionerUsers, 1, 2)) links.push({ patient_id: pat.id, practitioner_id: doc.id, link_type: "favorite" });
    }
  }
  for (const doc of practitionerUsers) {
    for (const pat of pickSome(patientUsers, 3, 15)) links.push({ patient_id: pat.id, practitioner_id: doc.id, link_type: "assigned" });
  }
  const dedupedLinks = Array.from(new Map(links.map((l) => [`${l.patient_id}:${l.practitioner_id}:${l.link_type}`, l])).values());
  await insertBatch("patient_practitioner_links", dedupedLinks, "patient_id");
  console.log(`  ${patientUsers.length} patients created, ${dedupedLinks.length} relationship links.`);

  // ============================================================
  // 5. HOSPITAL STAFF (8 per facility)
  // ============================================================
  console.log("\nSeeding hospital staff...");
  const staffRoles = ["nurse", "technician", "admin"];
  const depts = ["Emergency", "Cardiology", "Pharmacy", "Radiology", "ICU", "General Ward", "Maternity", "Pediatrics"];
  const staffRows: any[] = [];
  for (const fac of facilities) {
    for (let s = 0; s < 8; s++) {
      staffRows.push({
        facility_id: fac.id, role: pickOne(staffRoles), department: pickOne(depts),
        shift_start: pickOne(["06:00", "07:00", "08:00"]), shift_end: pickOne(["14:00", "16:00", "18:00"]),
        shift_days: pickSome([1, 2, 3, 4, 5], 4, 5), is_on_duty: faker.datatype.boolean(),
        hourly_rate: randInt(80, 350),
        qualifications: pickSome(["SANC Registration", "BLS Certified", "ALS Certified", "Specialist Nursing", "Radiography Diploma"], 1, 3),
      });
    }
  }
  await insertBatch("staff", staffRows, "id");
  console.log(`  ${staffRows.length} staff records created.`);

  // ============================================================
  // 6. CLINICAL DATA
  // ============================================================
  console.log("\nSeeding clinical data for all patients...");
  const medContextRows: any[] = [];
  const anthroRows: any[] = [];
  const prescriptionRows: any[] = [];
  const labResultInputs: any[] = [];
  const immunizationRows: any[] = [];

  for (const pat of patientUsers) {
    const hasCondition = Math.random() > 0.4;
    const conditions = hasCondition ? pickSome(CHRONIC_CONDITIONS, 1, 3) : [];
    const hasAllergy = Math.random() > 0.5;
    const allergy = hasAllergy ? pickOne(ALLERGENS) : null;
    const meds = conditions.length > 0 ? pickSome(MEDICATIONS, 1, 3) : [];

    medContextRows.push({
      patient_id: pat.id, chronic_conditions: conditions, current_medications: meds,
      family_history: faker.datatype.boolean() ? pickSome(["Hypertension", "Diabetes", "Heart Disease", "Cancer", "Stroke"], 1, 2) : [],
      __allergy: allergy,
    });

    const baseWeight = randInt(50, 110);
    const baseHeight = randInt(155, 195);
    const baseBMI = parseFloat((baseWeight / (baseHeight / 100) ** 2).toFixed(1));
    for (let m = 5; m >= 0; m--) {
      anthroRows.push({
        patient_id: pat.id, date_recorded: subDays(new Date(), m * 30 + randInt(0, 7)).toISOString(),
        height_cm: baseHeight, weight_kg: parseFloat((baseWeight + (Math.random() - 0.5) * 4).toFixed(1)),
        bmi: parseFloat((baseBMI + (Math.random() - 0.5) * 1.5).toFixed(1)),
        blood_type: pickOne(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
        systolic_bp: randInt(110, 150), diastolic_bp: randInt(70, 100), heart_rate_bpm: randInt(60, 100),
        spo2: randInt(95, 100), temperature_celsius: parseFloat((36 + Math.random() * 1.5).toFixed(1)),
      });
    }

    if (meds.length > 0) {
      for (const med of meds) {
        prescriptionRows.push({
          patient_id: pat.id, practitioner_id: pickOne(practitionerUsers).id, medication_name: med,
          dosage: pickOne(["Once daily", "Twice daily", "Three times daily", "As needed"]),
          instructions: pickOne(["Take with food", "Take on an empty stomach", "Take at bedtime", "Take in the morning"]),
          status: pickOne(["active", "active", "active", "completed", "discontinued"]),
          prescribed_date: subDays(new Date(), randInt(10, 365)).toISOString(), refills_remaining: randInt(0, 5),
        });
      }
    }

    if (Math.random() > 0.5) {
      labResultInputs.push({ patientId: pat.id, orderedById: pickOne(practitionerUsers).id, template: pickOne(LAB_TESTS) });
    }

    if (Math.random() > 0.4) {
      const vaccine = pickOne(VACCINES);
      immunizationRows.push({
        patient_id: pat.id, vaccine_name: vaccine.name, date_administered: subDays(new Date(), randInt(30, 730)).toISOString(),
        dosage: vaccine.dosage, batch_number: faker.string.alphanumeric(8).toUpperCase(),
        administered_by: `Dr. ${pickOne(SOUTH_AFRICAN_LAST_NAMES)}`, next_due_date: addDays(new Date(), randInt(180, 365)).toISOString(),
      });
    }
  }

  const insertedContexts = await insertBatch(
    "medical_context",
    medContextRows.map(({ __allergy, ...r }) => r),
    "id, patient_id",
  );
  const allergyRows: any[] = [];
  insertedContexts.forEach((c, i) => {
    const allergy = medContextRows[i].__allergy;
    if (allergy) {
      allergyRows.push({ medical_context_id: c.id, allergen: allergy.allergen, severity: allergy.severity, reaction: allergy.reaction, source: pickOne(["patient", "clinician"]) });
    }
  });
  if (allergyRows.length) await insertBatch("patient_allergies", allergyRows, "id");
  await insertBatch("anthropometrics", anthroRows, "id");
  await insertBatch("prescriptions", prescriptionRows, "id");

  const insertedLabResults = await insertBatch(
    "lab_results",
    labResultInputs.map((l) => ({ patient_id: l.patientId, ordered_by: l.orderedById, test_name: l.template.testName, date_reported: subDays(new Date(), randInt(1, 180)).toISOString() })),
    "id",
  );
  const labParamRows: any[] = [];
  insertedLabResults.forEach((lr, i) => {
    const template = labResultInputs[i].template;
    for (const p of template.parameters) {
      const variance = p.baseValue * 0.15;
      const value = parseFloat((p.baseValue + (Math.random() - 0.5) * variance * 2).toFixed(1));
      labParamRows.push({
        lab_result_id: lr.id, name: p.name, value: String(value), unit: p.unit, reference_range: p.referenceRange,
        status: value > p.baseValue * 1.1 ? "high" : value < p.baseValue * 0.9 ? "low" : "normal",
      });
    }
  });
  if (labParamRows.length) await insertBatch("lab_result_parameters", labParamRows, "id");
  await insertBatch("immunizations", immunizationRows, "id");
  console.log(`  medical_context: ${insertedContexts.length} (+${allergyRows.length} allergies), anthropometrics: ${anthroRows.length}, prescriptions: ${prescriptionRows.length}, lab_results: ${insertedLabResults.length} (+${labParamRows.length} params), immunizations: ${immunizationRows.length}`);

  // ============================================================
  // 7. CONSULTATIONS (1000)
  // ============================================================
  console.log("\nSeeding 1000 consultations...");
  const consultRows: any[] = [];
  for (let i = 0; i < 1000; i++) {
    const isPast = Math.random() > 0.2;
    const pat = pickOne(patientUsers);
    const doc = pickOne(practitionerUsers);
    const fac = pickOne(facilities);
    const date = isPast ? subDays(new Date(), randInt(1, 180)) : addDays(new Date(), randInt(1, 60));
    const status = isPast
      ? (Math.random() > 0.08 ? "completed" : Math.random() > 0.5 ? "cancelled" : "missed")
      : (Math.random() > 0.3 ? "scheduled" : pickOne(["requested", "pending"]));
    const hasRisk = Math.random() > 0.65;
    const riskScore = hasRisk ? randInt(15, 95) : null;
    const riskColor = riskScore ? (riskScore > 75 ? "red" : riskScore > 40 ? "gray" : "green") : null;

    consultRows.push({
      patient_id: pat.id, practitioner_id: doc.id, facility_id: fac.id,
      type: pickOne(["video", "video", "chat", "in_person", "in_person"]), status,
      scheduled_start_time: date.toISOString(), scheduled_end_time: new Date(date.getTime() + randInt(20, 60) * 60000).toISOString(),
      chief_complaint: pickOne(COMPLAINT_TEMPLATES),
      clinical_risk_score: riskScore, clinical_risk_color: riskColor,
      clinical_risk_factors: riskScore ? pickSome(["High Blood Pressure", "Irregular Pulse", "Elevated Glucose", "Respiratory Distress", "Family History", "Smoking", "Obesity"], 1, 3) : [],
      soap_subjective: status === "completed" ? faker.lorem.paragraph() : null,
      soap_objective: status === "completed" ? pickOne(["Vitals stable. BP 130/85 mmHg, HR 76 bpm, SpO2 98%.", "BMI 28.4. Heart sounds normal, no murmurs.", "Alert and oriented. No acute distress.", "Temperature 36.8°C. Throat mildly erythematous."]) : null,
      soap_assessment: status === "completed" ? faker.lorem.sentences(2) : null,
      soap_plan: status === "completed" ? pickOne(["Continue current medications. Follow up in 4 weeks.", "Increase Metformin dose. Repeat HbA1c in 3 months.", "Refer to specialist. Chest X-ray requested.", "Start physiotherapy. Return if symptoms worsen."]) : null,
      soap_signed_at: status === "completed" ? new Date(date.getTime() + randInt(30, 90) * 60000).toISOString() : null,
    });
  }
  const insertedConsultations = await insertBatch("consultations", consultRows, "id, patient_id, practitioner_id, status");
  console.log(`  ${insertedConsultations.length} consultations created.`);

  // Reviews (for a slice of completed consultations)
  const completedConsults = insertedConsultations.filter((c) => c.status === "completed").filter((_, idx) => idx % 3 === 0).slice(0, 200);
  const reviewComments = [
    "Excellent consultation. The doctor was thorough and explained everything clearly.",
    "Very professional and caring. Felt reassured after the appointment.",
    "The doctor took time to listen to all my concerns. Highly recommended.",
    "Very knowledgeable and explained my treatment plan in simple terms.",
    "The telehealth appointment was seamless and just as good as in-person.",
  ];
  await insertBatch("reviews", completedConsults.map((c) => ({
    consultation_id: c.id, patient_id: c.patient_id, practitioner_id: c.practitioner_id,
    rating: faker.number.float({ min: 3.0, max: 5.0, fractionDigits: 1 }),
    comment: pickOne(reviewComments),
    categories: { communication: faker.number.float({ min: 3, max: 5, fractionDigits: 1 }), professionalism: faker.number.float({ min: 3.5, max: 5, fractionDigits: 1 }) },
    is_verified: true,
  })), "id");
  console.log(`  ${completedConsults.length} reviews created.`);

  // ============================================================
  // 8. CONVERSATIONS + MESSAGES (60 threads)
  // ============================================================
  console.log("\nSeeding conversations & messages...");
  const convoRows = Array.from({ length: 60 }, () => {
    const pat = pickOne(patientUsers);
    const doc = pickOne(practitionerUsers);
    return {
      patient_id: pat.id, practitioner_id: doc.id, status: pickOne(["active", "active", "ended"]),
      started_at: subDays(new Date(), randInt(1, 90)).toISOString(), minutes_allocated: pickOne([15, 30, 45, 60]),
    };
  });
  const insertedConvos = await insertBatch("conversations", convoRows, "id, patient_id, practitioner_id");
  const patientLines = [
    "Doctor, I've been experiencing some chest discomfort since yesterday.",
    "My blood pressure readings have been high this week — should I be worried?",
    "Can I get a repeat prescription for my Metformin?",
    "I noticed some swelling in my ankles, is that normal?",
    "Thank you for the advice last time, I'm feeling much better.",
  ];
  const doctorLines = [
    "Please monitor your blood pressure twice daily and log the results in the app.",
    "The test results show your HbA1c is slightly elevated. Let's discuss adjustments.",
    "You can collect the prescription from any pharmacy. I'll send it digitally.",
    "The swelling should resolve with rest and elevation. If it persists, come in.",
    "That's great progress! Keep up the lifestyle changes.",
  ];
  const messageRows: any[] = [];
  for (const conv of insertedConvos) {
    const msgCount = randInt(4, 15);
    for (let k = 0; k < msgCount; k++) {
      const fromPatient = k % 2 === 0;
      messageRows.push({
        conversation_id: conv.id, sender_id: fromPatient ? conv.patient_id : conv.practitioner_id,
        receiver_id: fromPatient ? conv.practitioner_id : conv.patient_id,
        content: fromPatient ? pickOne(patientLines) : pickOne(doctorLines),
        is_read: Math.random() > 0.2, delivered_at: subDays(new Date(), msgCount - k).toISOString(),
      });
    }
  }
  await insertBatch("messages", messageRows, "id");
  console.log(`  ${insertedConvos.length} conversations, ${messageRows.length} messages.`);

  // ============================================================
  // 9. HOSPITAL APPOINTMENTS (200)
  // ============================================================
  console.log("\nSeeding 200 hospital appointments...");
  const apptRows = Array.from({ length: 200 }, () => {
    const pat = pickOne(patientUsers);
    const doc = pickOne(practitionerUsers);
    const fac = pickOne(facilities);
    const isPast = Math.random() > 0.3;
    const date = isPast ? subDays(new Date(), randInt(1, 120)) : addDays(new Date(), randInt(1, 45));
    return {
      facility_id: fac.id, patient_id: pat.id, practitioner_id: doc.id,
      type: pickOne(["consultation", "procedure", "lab"]),
      scheduled_start: date.toISOString(), scheduled_end: new Date(date.getTime() + randInt(30, 90) * 60000).toISOString(),
      status: isPast ? pickOne(["completed", "completed", "cancelled"]) : pickOne(["scheduled", "in_progress"]),
      room: `Room ${randInt(1, 50)}`,
    };
  });
  await insertBatch("hospital_appointments", apptRows, "id");
  console.log(`  ${apptRows.length} appointments created.`);

  // ============================================================
  // 10. PRACTITIONER SCHEDULES (next 14 days)
  // ============================================================
  console.log("\nSeeding practitioner schedules...");
  let scheduleCount = 0;
  let slotCount = 0;
  for (const doc of practitionerUsers) {
    const scheduleBatch: any[] = [];
    const slotsByIndex: any[][] = [];
    for (let d = 0; d < 14; d++) {
      const schedDate = addDays(new Date(), d);
      const dayOfWeek = schedDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      if (faker.datatype.boolean() && d > 0) continue;
      const slots: any[] = [];
      const startHour = pickOne([8, 9]);
      for (let h = startHour; h < 17; h++) {
        slots.push({ start_time: `${h.toString().padStart(2, "0")}:00`, end_time: `${(h + 1).toString().padStart(2, "0")}:00`, status: pickOne(["available", "available", "booked", "booked", "available"]) });
      }
      scheduleBatch.push({ practitioner_id: doc.id, schedule_date: schedDate.toISOString().slice(0, 10) });
      slotsByIndex.push(slots);
    }
    if (!scheduleBatch.length) continue;
    const insertedSchedules = await insertBatch("practitioner_schedules", scheduleBatch, "id");
    const slotRows = insertedSchedules.flatMap((s, i) => slotsByIndex[i].map((slot) => ({ schedule_id: s.id, ...slot })));
    if (slotRows.length) await insertBatch("practitioner_schedule_slots", slotRows, "id");
    scheduleCount += insertedSchedules.length;
    slotCount += slotRows.length;
  }
  console.log(`  ${scheduleCount} schedule days, ${slotCount} slots.`);

  // ============================================================
  // 11. PATIENT EVENTS (top 100 patients)
  // ============================================================
  console.log("\nSeeding patient events...");
  const eventTitles = ["GP Follow-up Appointment", "Blood Pressure Medication Reminder", "Lab Test at Pathcare", "Specialist Consultation", "Take Morning Medication", "Blood Sugar Check", "Physiotherapy Session", "Dentist Appointment", "Eye Test", "Annual Wellness Check"];
  const eventRows: any[] = [];
  for (const pat of patientUsers.slice(0, 100)) {
    const numEvents = randInt(2, 6);
    for (let e = 0; e < numEvents; e++) {
      const eventDate = Math.random() > 0.5 ? subDays(new Date(), randInt(1, 30)) : addDays(new Date(), randInt(1, 60));
      eventRows.push({
        patient_id: pat.id, title: pickOne(eventTitles), event_at: eventDate.toISOString(),
        type: pickOne(["appointment", "reminder", "note"]),
        notes: faker.datatype.boolean() ? faker.lorem.sentence() : null,
        color: pickOne(["primary", "success", "warning", "danger", "info"]),
      });
    }
  }
  await insertBatch("patient_events", eventRows, "id");
  console.log(`  ${eventRows.length} patient events created.`);

  // ============================================================
  // 12. BILLING
  // ============================================================
  console.log("\nSeeding billing data...");
  const prices: Record<string, number> = { free: 0, pro: 299, family: 499 };
  const txnCategories = ["service_booking", "subscription", "pharmacy", "lab", "procedure"];
  const subRows: any[] = [];
  const pmRows: any[] = [];
  const txnRows: any[] = [];
  for (const pat of patientUsers) {
    const tier = pickOne(["free", "free", "pro", "pro", "family"]);
    subRows.push({
      patient_id: pat.id, tier, status: pickOne(["active", "active", "active", "trial", "cancelled"]),
      start_date: subDays(new Date(), randInt(30, 365)).toISOString(), next_billing_date: addDays(new Date(), randInt(1, 30)).toISOString(),
      auto_renew: Math.random() > 0.2, price: prices[tier],
    });
    pmRows.push({ patient_id: pat.id, type: "card", is_default: true, card_brand: pickOne(["Visa", "Mastercard"]), card_last4: faker.string.numeric(4), card_expiry_month: randInt(1, 12), card_expiry_year: randInt(2025, 2029) });
    if (Math.random() > 0.5) {
      pmRows.push({ patient_id: pat.id, type: "medical_aid", is_default: false, medical_aid_provider: pickOne(MEDAIDS), medical_aid_number: faker.string.alphanumeric(10).toUpperCase() });
    }
    const txCount = randInt(3, 8);
    for (let j = 0; j < txCount; j++) {
      const amount = randInt(150, 3500);
      const cat = pickOne(txnCategories);
      txnRows.push({
        patient_id: pat.id, practitioner_id: pickOne(practitionerUsers).id, amount, currency: "ZAR",
        provider: pickOne(["card", "medical_aid", "eft"]), status: pickOne(["completed", "completed", "completed", "pending", "failed"]),
        description: `${cat.replace("_", " ")} charge`, category: cat, occurred_at: subDays(new Date(), randInt(1, 180)).toISOString(),
        platform_fee_amount: parseFloat((amount * 0.15).toFixed(2)), practitioner_earnings: parseFloat((amount * 0.85).toFixed(2)),
      });
    }
  }
  await insertBatch("subscriptions", subRows, "id");
  await insertBatch("payment_methods", pmRows, "id");
  await insertBatch("payment_transactions", txnRows, "id");

  const payoutRows: any[] = [];
  for (const doc of practitionerUsers) {
    if (Math.random() > 0.25) {
      payoutRows.push({
        practitioner_id: doc.id, amount: randInt(5000, 40000), currency: "ZAR",
        status: pickOne(["paid", "paid", "pending", "approved"]), requested_at: subDays(new Date(), randInt(1, 60)).toISOString(),
        processed_at: Math.random() > 0.3 ? subDays(new Date(), randInt(1, 30)).toISOString() : null,
        bank_account_holder: `Dr. ${doc.first_name} ${doc.last_name}`, bank_name: pickOne(BANKS),
        bank_account_number: faker.string.numeric(10), bank_branch_code: faker.string.numeric(6),
        period_from: subDays(new Date(), 60).toISOString(), period_to: subDays(new Date(), 30).toISOString(),
        consultation_count: randInt(10, 80), platform_fee_deducted: randInt(500, 3000),
      });
    }
  }
  await insertBatch("payout_requests", payoutRows, "id");

  const revenueRows: any[] = [];
  const revenueDeptsByFacility: any[][] = [];
  for (const fac of facilities) {
    for (let m = 5; m >= 0; m--) {
      const totalRev = randInt(500000, 3000000);
      revenueRows.push({
        facility_id: fac.id, period: "monthly", revenue_date: subDays(new Date(), m * 30).toISOString().slice(0, 10),
        total_revenue: totalRev, pending_payouts: randInt(50000, 200000), completed_payouts: randInt(200000, 800000), net_revenue: Math.floor(totalRev * 0.85),
      });
      revenueDeptsByFacility.push([
        { department: "Emergency", revenue: Math.floor(totalRev * 0.25), transaction_count: randInt(50, 200) },
        { department: "Pharmacy", revenue: Math.floor(totalRev * 0.15), transaction_count: randInt(100, 500) },
        { department: "Radiology", revenue: Math.floor(totalRev * 0.2), transaction_count: randInt(30, 150) },
        { department: "Surgical", revenue: Math.floor(totalRev * 0.4), transaction_count: randInt(20, 80) },
      ]);
    }
  }
  const insertedRevenue = await insertBatch("hospital_revenue", revenueRows, "id");
  const revenueDeptRows = insertedRevenue.flatMap((r, i) => revenueDeptsByFacility[i].map((d) => ({ hospital_revenue_id: r.id, ...d })));
  await insertBatch("hospital_revenue_by_department", revenueDeptRows, "id");
  console.log(`  subscriptions: ${subRows.length}, payment_methods: ${pmRows.length}, transactions: ${txnRows.length}, payouts: ${payoutRows.length}, revenue: ${insertedRevenue.length} (+${revenueDeptRows.length} dept rows)`);

  await insertBatch("platform_fee_config", [{ platform_fee_percent: 15, subscription_fee_percent: 10, updated_by: megaAdmin.id, notes: "Default platform config" }], "id");

  // ============================================================
  // 13. CONTENT (articles + health tips)
  // ============================================================
  console.log("\nSeeding articles & health tips...");
  await insertBatch("articles", [
    { title: "Understanding Cardiovascular Health in the Modern Era", slug: "understanding-cardiovascular-health-modern-era", excerpt: "Heart disease remains a global challenge, but modern proactive measures and digital monitoring can dramatically improve lifespan and quality of life.", content: "<h2>The Heart of the Matter</h2><p>Cardiovascular diseases remain the leading cause of death globally.</p>", cover_image: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&q=80&w=800", author: "Dr. Anke van Wyk", tags: ["Cardiology", "Wellness", "Preventative Care"], likes: 342, is_published: true, published_at: subDays(new Date(), 10).toISOString() },
    { title: "Managing Type 2 Diabetes: A Holistic Approach", slug: "managing-type-2-diabetes-holistic", excerpt: "Diabetes management is not just about insulin; it's about a complete lifestyle recalibration.", content: "<h2>Beyond the Numbers</h2><p>True management of Type 2 Diabetes requires a comprehensive overhaul of habits.</p>", cover_image: "https://images.unsplash.com/photo-1584308666744-24d5e44299ec?auto=format&fit=crop&q=80&w=800", author: "Dr. Oliver Mitchell", tags: ["Endocrinology", "Diabetes", "Diet"], likes: 228, is_published: true, published_at: subDays(new Date(), 5).toISOString() },
    { title: "Mental Health in Post-Pandemic South Africa", slug: "mental-health-post-pandemic-south-africa", excerpt: "The psychological toll of COVID-19 continues to affect millions of South Africans.", content: "<h2>A Silent Crisis</h2><p>South Africa faces a significant mental health crisis.</p>", cover_image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800", author: "Dr. Sipho Nkosi", tags: ["Mental Health", "Telehealth", "South Africa"], likes: 415, is_published: true, published_at: subDays(new Date(), 20).toISOString() },
    { title: "The Rise of Telehealth: Revolutionizing Patient Care in Africa", slug: "rise-of-telehealth-revolutionizing-patient-care-africa", excerpt: "From rural villages to urban centers, telehealth is transforming how Africans access quality healthcare.", content: "<h2>Breaking Barriers</h2><p>Geographic distance has long been a barrier to healthcare access across Africa.</p>", cover_image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800", author: "Dr. Zanele Khumalo", tags: ["Telehealth", "Innovation", "Africa"], likes: 567, is_published: true, published_at: subDays(new Date(), 15).toISOString() },
    { title: "Nutrition and Chronic Disease Prevention", slug: "nutrition-chronic-disease-prevention", excerpt: "Scientific evidence increasingly shows that dietary choices are the single most powerful tool in preventing chronic diseases.", content: "<h2>Food as Medicine</h2><p>Chronic diseases are heavily influenced by dietary patterns.</p>", cover_image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=800", author: "Dr. Priya Naidoo", tags: ["Nutrition", "Chronic Disease", "Prevention"], likes: 198, is_published: true, published_at: subDays(new Date(), 30).toISOString() },
  ], "id");

  const tipTitles = ["Drink 8 Glasses of Water Daily", "Walk for 20 Minutes Every Day", "Limit Screen Time Before Bed", "Practice Deep Breathing for Stress", "Eat More Vegetables at Every Meal", "Check Your Blood Pressure Weekly", "Stretch for 10 Minutes Each Morning", "Take Your Medication on Time", "Sleep 7–8 Hours Every Night", "Get an Annual Physical Check-Up"];
  await insertBatch("health_tips", tipTitles.map((title, idx) => ({
    title, excerpt: faker.lorem.sentence(), content: faker.lorem.paragraphs(2),
    author: pickOne(["Dr. Oliver Mitchell", "Dr. Anke van Wyk", "Dr. Sipho Nkosi", "Dr. Priya Naidoo", "Dr. Zanele Khumalo"]),
    published_date: subDays(new Date(), idx).toISOString(), read_time: pickOne(["1 min", "2 min", "3 min"]), tag: "Daily Tip", category: "tip",
  })), "id");
  console.log("  5 articles, 10 health tips created.");

  // ============================================================
  // 14. SYSTEM CONFIG (single row)
  // ============================================================
  await insertBatch("system_config", [{
    features: { telehealth: true, aiDiagnizer: true, prescriptions: true, registrations: true },
    maintenance_mode: false, popia_version: "1.0", consultation_fee_default: 0,
    emergency_numbers: ["112", "10177"], supported_languages: ["en", "af", "zu"],
  }], "id");

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log("\n====== SEEDING COMPLETE (Postgres only — MongoDB untouched) ======");
  console.log(`Facilities: ${facilities.length}`);
  console.log(`Hospital admins: ${hospitalAdminUsers.length} + super + mega admin`);
  console.log(`Practitioners: ${practitionerUsers.length}`);
  console.log(`Patients: ${patientUsers.length}`);
  console.log(`Consultations: ${insertedConsultations.length}`);
  console.log(`Conversations: ${insertedConvos.length} / Messages: ${messageRows.length}`);
  console.log(`Hospital appointments: ${apptRows.length}`);
  console.log(`Transactions: ${txnRows.length}`);
  console.log("\nAll accounts use password: Password123!");
  console.log("Known logins: admin@milpark.netcare.co.za, super@247digihealth.com, mega@247digihealth.com,");
  console.log("              mitchell@247digihealth.com, thandiwe.mokoena@example.com, john.dlamini@example.com");
  console.log("=====================================================\n");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
