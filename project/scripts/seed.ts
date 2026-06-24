import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// --- MODEL IMPORTS ---
import User from '../lib/models/User';
import { PatientProfile, PractitionerProfile, HospitalAdminProfile } from '../lib/models/RoleProfiles';
import Facility from '../lib/models/Facility';
import Consultation from '../lib/models/Consultation';
import { Anthropometric, MedicalContext, Prescription, LabResult, Immunization } from '../lib/models/ClinicalData';
import RiskScore from '../lib/models/RiskScore';
import Message from '../lib/models/Message';
import Conversation from '../lib/models/Conversation';
import Bed from '../lib/models/Bed';
import BedOccupancy from '../lib/models/BedOccupancy';
import Staff from '../lib/models/Staff';
import HospitalAppointment from '../lib/models/HospitalAppointment';
import HospitalTransaction from '../lib/models/HospitalTransaction';
import { PaymentTransaction, Subscription, PaymentMethod, PayoutRequest, HospitalRevenue } from '../lib/models/Billing';
import { Article } from '../lib/models/Article';
import { HealthTip } from '../lib/models/HealthTip';
import { PractitionerSchedule } from '../lib/models/Scheduling';
import { Review, MedicalDocument } from '../lib/models/ReviewsDocs';
import PatientEvent from '../lib/models/PatientEvent';

// --- HELPERS ---
const hash = (pw: string) => bcrypt.hashSync(pw, 10);
const subDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() - n); return r; };
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);
const pickOne = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const pickSome = <T>(arr: T[], min = 1, max = 3): T[] => {
  const count = randInt(min, Math.min(max, arr.length));
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const generateSAId = (dob: Date, female: boolean) => {
  const y = dob.getFullYear().toString().slice(-2);
  const m = (dob.getMonth() + 1).toString().padStart(2, '0');
  const d = dob.getDate().toString().padStart(2, '0');
  const g = female ? randInt(0, 4999).toString().padStart(4, '0') : randInt(5000, 9999).toString().padStart(4, '0');
  const rand = faker.string.numeric(2);
  return `${y}${m}${d}${g}0${rand}`;
};

// ---- DATA POOLS ----
const SPECIALISATIONS = [
  "General Practitioner", "Cardiologist", "Pediatrician", "Dermatologist",
  "Psychiatrist", "Neurologist", "Orthopedic Surgeon", "Oncologist",
  "Endocrinologist", "Gastroenterologist", "Pulmonologist", "Radiologist",
  "Obstetrician", "Rheumatologist", "Urologist", "Ophthalmologist",
  "ENT Specialist", "Hematologist", "Nephrologist", "Geriatrician"
];

const SOUTH_AFRICAN_FIRST_NAMES_M = [
  "Sipho", "Thabo", "Bongani", "Lethiwe", "Lungelo", "Mthokozisi", "Siyanda",
  "Nkosinathi", "Mduduzi", "Sibusiso", "Andile", "Lwazi", "Nhlanhla", "Musa",
  "Sandile", "Thandolwethu", "Sakhile", "Mthunzi", "Mpendulo", "Bayanda",
  "James", "Michael", "David", "Robert", "William", "Richard", "Thomas",
  "Pieter", "Johan", "Christiaan", "Hendrik", "Schalk", "Riaan", "Deon",
  "Keegan", "Bradley", "Dylan", "Nathan", "Ethan", "Cameron"
];

const SOUTH_AFRICAN_FIRST_NAMES_F = [
  "Thandiwe", "Nokuthula", "Nomvula", "Zanele", "Lungile", "Nomthandazo",
  "Buyisiwe", "Thandi", "Noxolo", "Sifiso", "Ntombifuthi", "Simangele",
  "Hlengiwe", "Nompumelelo", "Zinhle", "Nothando", "Nokukhanya", "Mbali",
  "Sarah", "Emma", "Olivia", "Ava", "Isabella", "Mia", "Charlotte",
  "Anke", "Marelize", "Liesl", "Riana", "Hanlie", "Elzette", "Chantelle",
  "Priya", "Fatima", "Ayesha", "Nomsa", "Nandi", "Lerato", "Palesa"
];

const SOUTH_AFRICAN_LAST_NAMES = [
  "Mokoena", "Dlamini", "Zulu", "Mthembu", "Nkosi", "Khumalo", "Ndlovu",
  "Mhlongo", "Gumede", "Ntanzi", "Sithole", "Mthethwa", "Luthuli", "Bhengu",
  "van Wyk", "van der Merwe", "Botha", "Nel", "du Plessis", "Joubert",
  "Pretorius", "Steyn", "Venter", "Visser", "Coetzer", "Swanepoel", "du Toit",
  "Mitchell", "Johnson", "Williams", "Brown", "Jones", "Davis", "Miller",
  "Patel", "Khan", "Naidoo", "Pillay", "Govender", "Reddy", "Singh"
];

const CHRONIC_CONDITIONS = [
  "Hypertension", "Type 2 Diabetes", "Asthma", "COPD", "Heart Failure",
  "Hypothyroidism", "Hyperlipidemia", "Depression", "Anxiety Disorder",
  "Chronic Kidney Disease", "Rheumatoid Arthritis", "Osteoporosis",
  "Epilepsy", "Migraine", "Fibromyalgia", "Irritable Bowel Syndrome",
  "Sleep Apnea", "Atrial Fibrillation", "Chronic Back Pain"
];

const MEDICATIONS = [
  "Amlodipine 5mg", "Metformin 500mg", "Atorvastatin 20mg", "Lisinopril 10mg",
  "Losartan 50mg", "Salbutamol Inhaler", "Metoprolol 25mg", "Omeprazole 20mg",
  "Levothyroxine 50mcg", "Aspirin 81mg", "Furosemide 40mg", "Warfarin 5mg",
  "Sertraline 50mg", "Amitriptyline 25mg", "Prednisolone 5mg", "Montelukast 10mg",
  "Rosuvastatin 10mg", "Spironolactone 25mg", "Carvedilol 6.25mg", "Empagliflozin 10mg"
];

const ALLERGENS = [
  { allergen: "Penicillin", reaction: "Anaphylaxis", severity: "severe" as const },
  { allergen: "Sulfonamides", reaction: "Rash and urticaria", severity: "moderate" as const },
  { allergen: "NSAIDs", reaction: "Bronchospasm", severity: "severe" as const },
  { allergen: "Peanuts", reaction: "Hives", severity: "mild" as const },
  { allergen: "Latex", reaction: "Contact dermatitis", severity: "moderate" as const },
  { allergen: "Codeine", reaction: "Nausea and itching", severity: "mild" as const },
  { allergen: "Shellfish", reaction: "Anaphylaxis", severity: "severe" as const },
  { allergen: "Cephalosporins", reaction: "Maculopapular rash", severity: "moderate" as const }
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
  "Pediatric vaccination schedule update",
  "Mental health review — depression management",
  "Asthma exacerbation, increased rescue inhaler use",
  "Urinary tract infection symptoms — dysuria and frequency",
  "Joint pain and stiffness in both hands, morning worse",
  "Pregnancy follow-up — 28 weeks gestation",
  "Dental pain radiating to the jaw",
  "Eye redness and discharge — possible conjunctivitis",
  "Earache and reduced hearing in left ear",
  "Stomach cramps and loose stools for 2 days"
];

const LAB_TESTS = [
  {
    testName: "Full Blood Count (FBC)",
    parameters: [
      { name: "Haemoglobin", unit: "g/dL", referenceRange: "13.0-17.0", baseValue: 14.5 },
      { name: "White Cell Count", unit: "10^9/L", referenceRange: "4.0-11.0", baseValue: 7.2 },
      { name: "Platelets", unit: "10^9/L", referenceRange: "150-400", baseValue: 260 }
    ]
  },
  {
    testName: "HbA1c",
    parameters: [
      { name: "Glycated Haemoglobin", unit: "%", referenceRange: "<6.5", baseValue: 7.2 }
    ]
  },
  {
    testName: "Lipid Profile",
    parameters: [
      { name: "Total Cholesterol", unit: "mmol/L", referenceRange: "<5.2", baseValue: 5.4 },
      { name: "LDL Cholesterol", unit: "mmol/L", referenceRange: "<3.4", baseValue: 3.2 },
      { name: "HDL Cholesterol", unit: "mmol/L", referenceRange: ">1.0", baseValue: 1.3 },
      { name: "Triglycerides", unit: "mmol/L", referenceRange: "<1.7", baseValue: 1.5 }
    ]
  },
  {
    testName: "Renal Function",
    parameters: [
      { name: "Creatinine", unit: "μmol/L", referenceRange: "64-104", baseValue: 85 },
      { name: "eGFR", unit: "mL/min/1.73m²", referenceRange: ">60", baseValue: 78 },
      { name: "Urea", unit: "mmol/L", referenceRange: "2.5-7.8", baseValue: 5.1 }
    ]
  },
  {
    testName: "Liver Function Tests",
    parameters: [
      { name: "ALT", unit: "U/L", referenceRange: "7-56", baseValue: 32 },
      { name: "AST", unit: "U/L", referenceRange: "10-40", baseValue: 28 },
      { name: "ALP", unit: "U/L", referenceRange: "44-147", baseValue: 95 }
    ]
  }
];

const VACCINES = [
  { name: "COVID-19 (Pfizer-BioNTech)", dosage: "0.3 mL IM" },
  { name: "Influenza (Annual)", dosage: "0.5 mL IM" },
  { name: "Hepatitis B", dosage: "1.0 mL IM" },
  { name: "Tetanus-Diphtheria (Td)", dosage: "0.5 mL IM" },
  { name: "Pneumococcal (PCV13)", dosage: "0.5 mL IM" },
  { name: "HPV (Gardasil)", dosage: "0.5 mL IM" }
];

const SA_PROVINCES = ["Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape", "Limpopo", "Mpumalanga", "North West", "Free State", "Northern Cape"];
const SA_CITIES = ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth", "East London", "Bloemfontein", "Polokwane", "Nelspruit"];

// ==================== MAIN SEED FUNCTION ====================
async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI not found in environment. Please check your .env.local file.");
    process.exit(1);
  }

  console.log("🚀 Connecting to MongoDB...");
  await mongoose.connect(uri);

  console.log("🧹 Clearing existing data...");
  const collections = Object.values(mongoose.connection.collections);
  for (const collection of collections) {
    await collection.deleteMany({});
  }

  const pw = hash("Password123!");

  // ============================================================
  // 1. FACILITIES (7 hospitals across South Africa)
  // ============================================================
  console.log("🏥 Seeding Facilities...");
  const facilities = await Facility.insertMany([
    {
      name: "Netcare Milpark Hospital",
      facilityType: 'Private',
      address: { street: "9 Guild Rd, Parktown", city: "Johannesburg", province: "Gauteng", coordinates: [28.0315, -26.1802] },
      contactInfo: { phone: "+27 11 480 0000", emergencyPhone: "+27 11 480 0111", email: "info@milpark.netcare.co.za" },
      bedCapacity: { total: 300, generalAvailable: 240, icuAvailable: 40 },
      currentWaitTimeMins: 15, isOpen: true,
      specialties: ["Cardiology", "Trauma", "Neurology", "Burn Unit", "Radiology", "Pharmacy"], emergencyServices: true
    },
    {
      name: "Life Brenthurst Hospital",
      facilityType: 'Private',
      address: { street: "4 Park Lane, Parktown", city: "Johannesburg", province: "Gauteng", coordinates: [28.0385, -26.1822] },
      contactInfo: { phone: "+27 11 647 9000", emergencyPhone: "+27 11 647 9111", email: "brenthurst@lifehealthcare.co.za" },
      bedCapacity: { total: 150, generalAvailable: 100, icuAvailable: 20 },
      currentWaitTimeMins: 20, isOpen: true,
      specialties: ["Maternity", "Orthopedics", "General Surgery"], emergencyServices: true
    },
    {
      name: "Mediclinic Sandton",
      facilityType: 'Private',
      address: { street: "Corner Main Rd & Peter Place", city: "Sandton", province: "Gauteng", coordinates: [28.0163, -26.0718] },
      contactInfo: { phone: "+27 11 709 2000", emergencyPhone: "+27 11 709 2111", email: "sandton@mediclinic.co.za" },
      bedCapacity: { total: 200, generalAvailable: 150, icuAvailable: 25 },
      currentWaitTimeMins: 10, isOpen: true,
      specialties: ["Pediatrics", "Oncology", "Internal Medicine"], emergencyServices: true
    },
    {
      name: "Helen Joseph Hospital",
      facilityType: 'Public',
      address: { street: "1 Perth Rd, Rossmore", city: "Johannesburg", province: "Gauteng", coordinates: [27.9945, -26.1834] },
      contactInfo: { phone: "+27 11 489 1011", emergencyPhone: "+27 11 489 1111", email: "info@gauteng.gov.za" },
      bedCapacity: { total: 500, generalAvailable: 400, icuAvailable: 30 },
      currentWaitTimeMins: 45, isOpen: true,
      specialties: ["General Medicine", "Trauma", "Psychiatry"], emergencyServices: true
    },
    {
      name: "Groote Schuur Hospital",
      facilityType: 'Public',
      address: { street: "Anzio Rd, Observatory", city: "Cape Town", province: "Western Cape", coordinates: [18.4633, -33.9405] },
      contactInfo: { phone: "+27 21 404 9111", emergencyPhone: "+27 21 404 9009", email: "info@gsh.gov.za" },
      bedCapacity: { total: 800, generalAvailable: 600, icuAvailable: 80 },
      currentWaitTimeMins: 60, isOpen: true,
      specialties: ["Cardiothoracic Surgery", "Neurosurgery", "Transplant Services", "Oncology"], emergencyServices: true
    },
    {
      name: "Netcare St Augustine's Hospital",
      facilityType: 'Private',
      address: { street: "107 J.B. Marks Rd", city: "Durban", province: "KwaZulu-Natal", coordinates: [30.9866, -29.8468] },
      contactInfo: { phone: "+27 31 268 5000", emergencyPhone: "+27 31 268 5100", email: "staugs@netcare.co.za" },
      bedCapacity: { total: 400, generalAvailable: 300, icuAvailable: 50 },
      currentWaitTimeMins: 25, isOpen: true,
      specialties: ["Trauma", "Cardiology", "Maternity", "Orthopedics"], emergencyServices: true
    },
    {
      name: "Tygerberg Hospital",
      facilityType: 'Public',
      address: { street: "Francie van Zijl Dr", city: "Bellville", province: "Western Cape", coordinates: [18.6293, -33.9177] },
      contactInfo: { phone: "+27 21 938 4911", emergencyPhone: "+27 21 938 9111", email: "info@tygerberg.gov.za" },
      bedCapacity: { total: 1386, generalAvailable: 1100, icuAvailable: 120 },
      currentWaitTimeMins: 75, isOpen: true,
      specialties: ["Burn Unit", "Neonatal ICU", "Cardiology", "General Medicine", "Psychiatry"], emergencyServices: true
    }
  ]);

  // ============================================================
  // 2. ADMIN USERS (5 hospital admins + 2 super admins + 1 mega admin)
  // ============================================================
  console.log("🔑 Seeding Admin Users...");
  const adminData = [
    { email: "admin@milpark.netcare.co.za", firstName: "Sarah", lastName: "Jenkins", facilityIdx: 0 },
    { email: "admin@brenthurst.co.za", firstName: "Deon", lastName: "Pretorius", facilityIdx: 1 },
    { email: "admin@mediclinic-sandton.co.za", firstName: "Priya", lastName: "Naidoo", facilityIdx: 2 },
    { email: "admin@helenjoseph.co.za", firstName: "Thabo", lastName: "Mokoena", facilityIdx: 3 },
    { email: "admin@staugs.netcare.co.za", firstName: "Zanele", lastName: "Khumalo", facilityIdx: 5 },
  ];

  const adminUsers = [];
  for (const a of adminData) {
    const u = await User.create({
      email: a.email, passwordHash: pw, role: 'hospital_admin',
      firstName: a.firstName, lastName: a.lastName, status: 'active'
    });
    await HospitalAdminProfile.create({
      userId: u._id,
      hospitalId: facilities[a.facilityIdx]._id,
      department: pickOne(["Administration", "Finance", "Operations", "Quality Assurance"]),
      permissions: ["bed_management", "staff_management", "reports", "billing"]
    });
    adminUsers.push(u);
  }

  const superAdmin = await User.create({
    email: "super@247digihealth.com", passwordHash: pw, role: 'super_admin',
    firstName: "Alex", lastName: "Thornton", status: 'active'
  });
  const megaAdmin = await User.create({
    email: "mega@247digihealth.com", passwordHash: pw, role: 'mega_admin',
    firstName: "Victoria", lastName: "Harrington", status: 'active'
  });

  // ============================================================
  // 3. PRACTITIONERS (50 doctors)
  // ============================================================
  console.log("🩺 Seeding 50 Practitioners...");
  const BANKS = ["FNB", "Standard Bank", "Nedbank", "Absa", "Capitec"];
  const MEDAIDS = ["Discovery Health", "Bonitas", "Momentum Health", "GEMS", "Bestmed", "Fedhealth", "Medihelp"];

  const practitionerUsers: any[] = [];
  // 2 anchor doctors
  const drMitchell = await User.create({ email: "mitchell@247digihealth.com", passwordHash: pw, role: 'practitioner', firstName: "Oliver", lastName: "Mitchell", status: 'active' });
  const drAnke = await User.create({ email: "vwyk@247digihealth.com", passwordHash: pw, role: 'practitioner', firstName: "Anke", lastName: "van Wyk", status: 'active' });
  practitionerUsers.push(drMitchell, drAnke);

  await PractitionerProfile.create({
    userId: drMitchell._id, specialisation: "General Practitioner", hpcsaNumber: "MP0123456",
    experienceYears: 12, bio: "Experienced family physician committed to holistic patient care and preventive medicine.",
    languages: ["English", "Afrikaans", "isiZulu"], acceptedMedicalAids: ["Discovery", "Bonitas", "Momentum"],
    rating: 4.8, reviewCount: 156, isOnline: true,
    bankAccount: { accountHolder: "Dr O Mitchell", bankName: "FNB", accountNumber: "62822113344", branchCode: "250655", taxNumber: "9123456789" },
    affiliatedFacilityIds: [facilities[0]._id, facilities[1]._id],
    achievements: ["Top GP 2023", "Patient Choice Award 2022"],
    address: { street: "123 Medical Chambers, Parktown", city: "Johannesburg", province: "Gauteng" }
  });
  await PractitionerProfile.create({
    userId: drAnke._id, specialisation: "Cardiologist", hpcsaNumber: "MP0654321",
    experienceYears: 15, bio: "Specializing in interventional cardiology and heart failure management.",
    languages: ["English", "Afrikaans", "German"], acceptedMedicalAids: ["Discovery", "Bestmed", "GEMS"],
    rating: 4.9, reviewCount: 92, isOnline: true,
    bankAccount: { accountHolder: "Dr A van Wyk Inc", bankName: "Nedbank", accountNumber: "1234567890", branchCode: "198765", taxNumber: "9876543210" },
    affiliatedFacilityIds: [facilities[0]._id],
    achievements: ["Fellowship of the College of Physicians (FCP)", "Cardiology Excellence Award 2021"],
    address: { street: "45 Heart Specialists Suite, Sandton", city: "Sandton", province: "Gauteng" }
  });

  // Generate 48 more practitioners
  for (let i = 0; i < 48; i++) {
    const isFemale = faker.datatype.boolean();
    const fn = isFemale ? pickOne(SOUTH_AFRICAN_FIRST_NAMES_F) : pickOne(SOUTH_AFRICAN_FIRST_NAMES_M);
    const ln = pickOne(SOUTH_AFRICAN_LAST_NAMES);
    const spec = pickOne(SPECIALISATIONS);
    const expYears = randInt(2, 35);
    const bank = pickOne(BANKS);
    const city = pickOne(SA_CITIES);
    const province = pickOne(SA_PROVINCES);
    const affiliatedFacilities = pickSome(facilities.map((f: any) => f._id), 1, 2);

    const uniqueEmail = `dr.${fn.toLowerCase().replace(/\s/g, '')}.${ln.toLowerCase().replace(/\s/g, '')}${i}@247digihealth.com`;
    const u = await User.create({
      email: uniqueEmail, passwordHash: pw, role: 'practitioner',
      firstName: fn, lastName: ln, status: pickOne(['active', 'active', 'active', 'pending_verification'])
    });
    practitionerUsers.push(u);

    await PractitionerProfile.create({
      userId: u._id,
      specialisation: spec,
      hpcsaNumber: "MP" + faker.string.numeric(7),
      experienceYears: expYears,
      bio: `${isFemale ? 'Dr.' : 'Dr.'} ${fn} ${ln} is a ${spec} with ${expYears} years of experience. ${faker.lorem.sentence()}`,
      languages: pickSome(["English", "Afrikaans", "isiZulu", "Xhosa", "Sesotho", "Setswana", "Venda"], 1, 3),
      acceptedMedicalAids: pickSome(MEDAIDS, 2, 5),
      rating: faker.number.float({ min: 3.5, max: 5.0, fractionDigits: 1 }),
      reviewCount: randInt(5, 500),
      isOnline: faker.datatype.boolean(),
      affiliatedFacilityIds: affiliatedFacilities,
      achievements: faker.datatype.boolean() ? [pickOne(["Dean's List", "Excellence Award", "Research Grant Recipient", "Top Specialist 2023"])] : [],
      bankAccount: {
        accountHolder: `Dr ${fn} ${ln}`,
        bankName: bank,
        accountNumber: faker.string.numeric(10),
        branchCode: faker.string.numeric(6),
        taxNumber: faker.string.numeric(10)
      },
      address: { street: `${randInt(1, 200)} Medical Centre, ${city}`, city, province }
    });
  }

  // ============================================================
  // 4. PATIENTS (250 patients)
  // ============================================================
  console.log("👥 Seeding 250 Patients...");
  const patientUsers: any[] = [];
  // 2 anchor patients
  const thandiwe = await User.create({ email: "thandiwe.mokoena@example.com", passwordHash: pw, role: 'patient', firstName: "Thandiwe", lastName: "Mokoena", saId: "9005125123081", mobile: "+27 82 111 2222", status: 'active' });
  const johnD = await User.create({ email: "john.dlamini@example.com", passwordHash: pw, role: 'patient', firstName: "John", lastName: "Dlamini", saId: "8301155012084", mobile: "+27 71 333 4444", status: 'active' });
  patientUsers.push(thandiwe, johnD);

  await PatientProfile.create({
    userId: thandiwe._id, dateOfBirth: new Date(1990, 4, 12), gender: 'female',
    emergencyContact: { name: "Samuel Mokoena", phone: "+27 82 111 0000", relationship: "Husband" },
    medicalAid: { provider: "Discovery Health", planName: "Classic Smart", memberNumber: "DSC123456789" },
    subscriptionTier: 'pro', popiaConsentDate: subDays(new Date(), 100),
    myDoctorIds: [drMitchell._id, drAnke._id]
  });
  await PatientProfile.create({
    userId: johnD._id, dateOfBirth: new Date(1983, 0, 15), gender: 'male',
    emergencyContact: { name: "Busi Dlamini", phone: "+27 71 333 0000", relationship: "Sister" },
    subscriptionTier: 'pro', popiaConsentDate: subDays(new Date(), 200),
    myDoctorIds: [drMitchell._id]
  });

  // Batch-generate 248 more patients
  const patientBatch: any[] = [];
  const patientProfileBatch: any[] = [];
  const usedSaIds = new Set<string>(["9005125123081", "8301155012084"]);
  const usedEmails = new Set<string>(["thandiwe.mokoena@example.com", "john.dlamini@example.com"]);

  for (let i = 0; i < 248; i++) {
    const isFemale = faker.datatype.boolean();
    const dob = faker.date.birthdate({ min: 18, max: 80, mode: 'age' });
    const fn = isFemale ? pickOne(SOUTH_AFRICAN_FIRST_NAMES_F) : pickOne(SOUTH_AFRICAN_FIRST_NAMES_M);
    const ln = pickOne(SOUTH_AFRICAN_LAST_NAMES);

    let saId = generateSAId(dob, isFemale);
    let attempts = 0;
    while (usedSaIds.has(saId) && attempts < 20) { saId = generateSAId(dob, isFemale); attempts++; }
    usedSaIds.add(saId);

    let email = `${fn.toLowerCase().replace(/\s/g, '')}.${ln.toLowerCase().replace(/\s/g, '')}${i}@example.com`;
    if (usedEmails.has(email)) email = `patient${i}.${faker.string.alphanumeric(4)}@example.com`;
    usedEmails.add(email);

    const hasMedicalAid = faker.datatype.boolean();
    const assignedDoctorIds = pickSome(practitionerUsers.map((u: any) => u._id), 1, 3);
    const tier = pickOne(['free', 'free', 'pro', 'pro']);

    patientBatch.push({
      email, passwordHash: pw, role: 'patient',
      firstName: fn, lastName: ln,
      saId,
      mobile: `+27 ${randInt(60, 84)} ${faker.string.numeric(3)} ${faker.string.numeric(4)}`,
      status: pickOne(['active', 'active', 'active', 'suspended'])
    });

    patientProfileBatch.push({
      dateOfBirth: dob,
      gender: isFemale ? 'female' : 'male',
      emergencyContact: {
        name: faker.person.fullName(),
        phone: `+27 ${randInt(60, 84)} ${faker.string.numeric(7)}`,
        relationship: pickOne(["Spouse", "Parent", "Child", "Sibling", "Friend"])
      },
      medicalAid: hasMedicalAid ? {
        provider: pickOne(MEDAIDS),
        planName: pickOne(["Classic", "Smart", "Comprehensive", "Essential", "Core", "Executive"]),
        memberNumber: faker.string.alphanumeric(10).toUpperCase()
      } : undefined,
      subscriptionTier: tier,
      popiaConsentDate: subDays(new Date(), randInt(1, 700)),
      myDoctorIds: assignedDoctorIds,
      favoritePractitionerIds: faker.datatype.boolean() ? pickSome(practitionerUsers.map((u: any) => u._id), 1, 2) : []
    });
  }

  const createdPatientUsers = await User.insertMany(patientBatch);
  // Link profiles to user IDs
  const profilesWithIds = patientProfileBatch.map((p, idx) => ({
    ...p,
    userId: createdPatientUsers[idx]._id
  }));
  await PatientProfile.insertMany(profilesWithIds);
  patientUsers.push(...createdPatientUsers);

  // Update doctors with assigned patients
  console.log("🔗 Linking practitioners to patients...");
  for (const doc of practitionerUsers) {
    const assignedPats = pickSome(patientUsers.map((u: any) => u._id), 3, 15);
    await PractitionerProfile.updateOne({ userId: doc._id }, { $set: { assignedPatientIds: assignedPats } });
  }

  // ============================================================
  // 5. EMTs & Hospital Staff (10 EMT users + 30 hospital staff records)
  // ============================================================
  console.log("🚑 Seeding EMTs & Hospital Staff...");
  const emtUsers: any[] = [];
  const emtAnchor = await User.create({ email: "john.rescuer@247digihealth.com", passwordHash: pw, role: 'emt', firstName: "John", lastName: "Rescuer", status: 'active' });
  emtUsers.push(emtAnchor);

  for (let i = 0; i < 9; i++) {
    const fn = pickOne([...SOUTH_AFRICAN_FIRST_NAMES_M, ...SOUTH_AFRICAN_FIRST_NAMES_F]);
    const ln = pickOne(SOUTH_AFRICAN_LAST_NAMES);
    const u = await User.create({
      email: `emt.${fn.toLowerCase()}${i}@rescue.co.za`, passwordHash: pw, role: 'emt',
      firstName: fn, lastName: ln, status: 'active'
    });
    emtUsers.push(u);
  }

  // Seed hospital Staff records (nurses, techs, admins)
  const staffBatch: any[] = [];
  const staffRoles = ['nurse', 'technician', 'admin'] as const;
  const depts = ["Emergency", "Cardiology", "Pharmacy", "Radiology", "ICU", "General Ward", "Maternity", "Pediatrics"];
  for (const fac of facilities) {
    for (let s = 0; s < 8; s++) {
      staffBatch.push({
        facilityId: fac._id,
        role: pickOne(staffRoles),
        department: pickOne(depts),
        shiftSchedule: {
          start: pickOne(["06:00", "07:00", "08:00"]),
          end: pickOne(["14:00", "16:00", "18:00"]),
          days: pickSome([1, 2, 3, 4, 5], 4, 5)
        },
        isOnDuty: faker.datatype.boolean(),
        hourlyRate: randInt(80, 350),
        qualifications: pickSome(["SANC Registration", "BLS Certified", "ALS Certified", "Specialist Nursing", "Radiography Diploma"], 1, 3)
      });
    }
  }
  await Staff.insertMany(staffBatch);

  // ============================================================
  // 6. CLINICAL DATA (Medical Context, Vitals, Prescriptions, Labs, Immunizations)
  // ============================================================
  console.log("📋 Seeding Clinical Data for all patients...");

  const medContextBatch: any[] = [];
  const anthropoBatch: any[] = [];
  const prescriptionBatch: any[] = [];
  const labResultBatch: any[] = [];
  const immunizationBatch: any[] = [];

  for (const pat of patientUsers) {
    const patId = pat._id;
    const hasCondition = Math.random() > 0.4;
    const conditions = hasCondition ? pickSome(CHRONIC_CONDITIONS, 1, 3) : [];
    const hasAllergy = Math.random() > 0.5;
    const allergies = hasAllergy ? [pickOne(ALLERGENS)] : [];
    const meds = conditions.length > 0 ? pickSome(MEDICATIONS, 1, 3) : [];

    medContextBatch.push({
      patientId: patId,
      chronicConditions: conditions,
      allergies: allergies.map(a => ({ ...a, source: pickOne(['patient', 'clinician']) as 'patient' | 'clinician' })),
      currentMedications: meds,
      familyHistory: faker.datatype.boolean() ? pickSome(["Hypertension", "Diabetes", "Heart Disease", "Cancer", "Stroke"], 1, 2) : []
    });

    // Vitals history (last 6 months, monthly)
    const baseWeight = randInt(50, 110);
    const baseHeight = randInt(155, 195);
    const baseBMI = parseFloat((baseWeight / ((baseHeight / 100) ** 2)).toFixed(1));
    for (let m = 5; m >= 0; m--) {
      anthropoBatch.push({
        patientId: patId,
        dateRecorded: subDays(new Date(), m * 30 + randInt(0, 7)),
        heightCm: baseHeight,
        weightKg: baseWeight + (Math.random() - 0.5) * 4,
        bmi: baseBMI + (Math.random() - 0.5) * 1.5,
        bloodType: pickOne(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
        vitalSigns: {
          systolicBP: randInt(110, 150),
          diastolicBP: randInt(70, 100),
          heartRateBpm: randInt(60, 100),
          spO2: randInt(95, 100),
          temperatureCelsius: 36 + Math.random() * 1.5
        }
      });
    }

    // Prescriptions (for patients with conditions)
    if (meds.length > 0) {
      for (const med of meds) {
        prescriptionBatch.push({
          patientId: patId,
          practitionerId: pickOne(practitionerUsers)._id,
          medicationName: med,
          dosage: pickOne(["Once daily", "Twice daily", "Three times daily", "As needed"]),
          instructions: pickOne(["Take with food", "Take on an empty stomach", "Take at bedtime", "Take in the morning"]),
          status: pickOne(['active', 'active', 'active', 'completed', 'discontinued']),
          prescribedDate: subDays(new Date(), randInt(10, 365)),
          refillsRemaining: randInt(0, 5)
        });
      }
    }

    // Lab results (50% of patients have labs)
    if (Math.random() > 0.5) {
      const testTemplate = pickOne(LAB_TESTS);
      labResultBatch.push({
        patientId: patId,
        orderedById: pickOne(practitionerUsers)._id,
        testName: testTemplate.testName,
        dateReported: subDays(new Date(), randInt(1, 180)),
        parameters: testTemplate.parameters.map(p => {
          const variance = p.baseValue * 0.15;
          const value = (p.baseValue + (Math.random() - 0.5) * variance * 2).toFixed(1);
          const numValue = parseFloat(value);
          return {
            name: p.name,
            value: value,
            unit: p.unit,
            referenceRange: p.referenceRange,
            status: numValue > p.baseValue * 1.1 ? 'high' : numValue < p.baseValue * 0.9 ? 'low' : 'normal'
          };
        })
      });
    }

    // Immunizations (60% of patients)
    if (Math.random() > 0.4) {
      const vaccine = pickOne(VACCINES);
      immunizationBatch.push({
        patientId: patId,
        vaccineName: vaccine.name,
        dateAdministered: subDays(new Date(), randInt(30, 730)),
        dosage: vaccine.dosage,
        batchNumber: faker.string.alphanumeric(8).toUpperCase(),
        administeredBy: `Dr. ${pickOne(SOUTH_AFRICAN_LAST_NAMES)}`,
        nextDueDate: addDays(new Date(), randInt(180, 365))
      });
    }
  }

  // Insert clinical data in batches
  console.log("💉 Inserting clinical batches...");
  await MedicalContext.insertMany(medContextBatch);
  // Anthropometric is large - split into chunks
  const CHUNK = 500;
  for (let i = 0; i < anthropoBatch.length; i += CHUNK) {
    await Anthropometric.insertMany(anthropoBatch.slice(i, i + CHUNK));
  }
  await Prescription.insertMany(prescriptionBatch);
  await LabResult.insertMany(labResultBatch);
  if (immunizationBatch.length > 0) await Immunization.insertMany(immunizationBatch);

  // ============================================================
  // 7. CONSULTATIONS (1000 consultations, spanning past 6 months + upcoming)
  // ============================================================
  console.log("📞 Seeding 1000 Consultations...");
  const consultBatch: any[] = [];
  for (let i = 0; i < 1000; i++) {
    const isPast = Math.random() > 0.2;
    const pat = pickOne(patientUsers);
    const doc = pickOne(practitionerUsers);
    const fac = pickOne(facilities);
    const date = isPast ? subDays(new Date(), randInt(1, 180)) : addDays(new Date(), randInt(1, 60));
    const status = isPast
      ? (Math.random() > 0.08 ? 'completed' : Math.random() > 0.5 ? 'cancelled' : 'no_show')
      : (Math.random() > 0.3 ? 'scheduled' : pickOne(['requested', 'pending']));

    const hasRisk = Math.random() > 0.65;
    const riskScore = hasRisk ? randInt(15, 95) : undefined;
    const riskColor = riskScore ? (riskScore > 75 ? 'red' : riskScore > 40 ? 'gray' : 'green') : undefined;

    consultBatch.push({
      patientId: pat._id,
      practitionerId: doc._id,
      facilityId: fac._id,
      type: pickOne(['video', 'video', 'chat', 'in_person', 'in_person']),
      status,
      scheduledStartTime: date,
      scheduledEndTime: new Date(date.getTime() + randInt(20, 60) * 60000),
      chiefComplaint: pickOne(COMPLAINT_TEMPLATES),
      clinicalRisk: riskScore ? {
        score: riskScore,
        color: riskColor as any,
        factors: pickSome(["High Blood Pressure", "Irregular Pulse", "Elevated Glucose", "Respiratory Distress", "Family History", "Smoking", "Obesity", "Sedentary Lifestyle"], 1, 3)
      } : undefined,
      soapNotes: status === 'completed' ? {
        subjective: faker.lorem.paragraph(),
        objective: pickOne([
          "Vitals stable. BP 130/85 mmHg, HR 76 bpm, SpO2 98%. Chest clear on auscultation.",
          "BMI 28.4. Mild pedal oedema present. Heart sounds normal, no murmurs.",
          "Alert and oriented. No acute distress. Abdomen soft, non-tender.",
          "Temperature 36.8°C. Throat mildly erythematous. Lymph nodes non-palpable."
        ]),
        assessment: faker.lorem.sentences(2),
        plan: pickOne([
          "Continue current medications. Follow up in 4 weeks. Lifestyle modifications advised.",
          "Increase Metformin dose to 1000mg BD. Repeat HbA1c in 3 months.",
          "Refer to specialist. Chest X-ray requested. Avoid strenuous activity.",
          "Start physiotherapy. NSAIDs as needed. Return if symptoms worsen."
        ]),
        signedAt: new Date(date.getTime() + randInt(30, 90) * 60000)
      } : undefined
    });
  }
  for (let i = 0; i < consultBatch.length; i += CHUNK) {
    await Consultation.insertMany(consultBatch.slice(i, i + CHUNK));
  }
  const allConsultations = await Consultation.find({}, '_id patientId practitionerId').lean();

  // ============================================================
  // 8. SECURE MESSAGING (60 conversation threads)
  // ============================================================
  console.log("💬 Seeding Conversations & Messages...");
  for (let i = 0; i < 60; i++) {
    const pat = pickOne(patientUsers);
    const doc = pickOne(practitionerUsers);
    const conv = await Conversation.create({
      patientId: pat._id,
      practitionerId: doc._id,
      status: pickOne(['active', 'active', 'closed']),
      startedAt: subDays(new Date(), randInt(1, 90)),
      minutesAllocated: pickOne([15, 30, 45, 60])
    });
    const msgCount = randInt(4, 15);
    const msgBatch: any[] = [];
    for (let k = 0; k < msgCount; k++) {
      const fromPatient = k % 2 === 0;
      msgBatch.push({
        conversationId: conv._id,
        senderId: fromPatient ? pat._id : doc._id,
        receiverId: fromPatient ? doc._id : pat._id,
        content: fromPatient
          ? pickOne([
              "Doctor, I've been experiencing some chest discomfort since yesterday.",
              "My blood pressure readings have been high this week — should I be worried?",
              "Can I get a repeat prescription for my Metformin?",
              "I noticed some swelling in my ankles, is that normal?",
              "Thank you for the advice last time, I'm feeling much better.",
              "Do I need to come in for the blood test results or can you send them digitally?",
              "I've been having trouble sleeping — could it be related to my medication?"
            ])
          : pickOne([
              "Please monitor your blood pressure twice daily and log the results in the app.",
              "The test results show your HbA1c is slightly elevated. Let's discuss adjustments.",
              "You can collect the prescription from any pharmacy. I'll send it digitally.",
              "The swelling should resolve with rest and elevation. If it persists, come in.",
              "That's great progress! Keep up the lifestyle changes.",
              "I've reviewed your results — all values are within acceptable range. Well done.",
              "Please ensure you take the medication consistently at the same time each day."
            ]),
        isRead: Math.random() > 0.2,
        createdAt: subDays(new Date(), msgCount - k)
      });
    }
    await Message.insertMany(msgBatch);
  }

  // ============================================================
  // 9. HOSPITAL APPOINTMENTS (200 appointments)
  // ============================================================
  console.log("🏥 Seeding Hospital Appointments...");
  const apptBatch: any[] = [];
  for (let i = 0; i < 200; i++) {
    const pat = pickOne(patientUsers);
    const doc = pickOne(practitionerUsers);
    const fac = pickOne(facilities);
    const isPast = Math.random() > 0.3;
    const date = isPast ? subDays(new Date(), randInt(1, 120)) : addDays(new Date(), randInt(1, 45));
    apptBatch.push({
      facilityId: fac._id,
      patientId: pat._id,
      practitionerId: doc._id,
      type: pickOne(['consultation', 'procedure', 'lab']),
      scheduledStart: date,
      scheduledEnd: new Date(date.getTime() + randInt(30, 90) * 60000),
      status: isPast ? pickOne(['completed', 'completed', 'cancelled']) : pickOne(['scheduled', 'in_progress']),
      room: `Room ${randInt(1, 50)}`
    });
  }
  await HospitalAppointment.insertMany(apptBatch);

  // ============================================================
  // 10. PRACTITIONER SCHEDULES
  // ============================================================
  console.log("📅 Seeding Practitioner Schedules...");
  const scheduleBatch: any[] = [];
  for (const doc of practitionerUsers) {
    // Next 14 days of schedules
    for (let d = 0; d < 14; d++) {
      const schedDate = addDays(new Date(), d);
      const dayOfWeek = schedDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // skip weekends for most
      if (faker.datatype.boolean() && d > 0) continue; // random off days

      const slots: any[] = [];
      const startHour = pickOne([8, 9]);
      for (let h = startHour; h < 17; h++) {
        const slotDate = new Date(schedDate);
        slotDate.setHours(h, 0, 0, 0);
        slots.push({
          startTime: `${h.toString().padStart(2, '0')}:00`,
          endTime: `${(h + 1).toString().padStart(2, '0')}:00`,
          status: pickOne(['available', 'available', 'booked', 'booked', 'available'])
        });
      }
      scheduleBatch.push({
        practitionerId: doc._id,
        date: schedDate,
        slots
      });
    }
  }
  for (let i = 0; i < scheduleBatch.length; i += CHUNK) {
    await PractitionerSchedule.insertMany(scheduleBatch.slice(i, i + CHUNK));
  }

  // ============================================================
  // 11. PATIENT EVENTS (calendar events)
  // ============================================================
  console.log("📆 Seeding Patient Events...");
  const eventBatch: any[] = [];
  for (const pat of patientUsers.slice(0, 100)) { // top 100 patients get events
    const numEvents = randInt(2, 6);
    for (let e = 0; e < numEvents; e++) {
      const eventDate = Math.random() > 0.5
        ? subDays(new Date(), randInt(1, 30))
        : addDays(new Date(), randInt(1, 60));
      eventBatch.push({
        patientId: pat._id,
        title: pickOne([
          "GP Follow-up Appointment",
          "Blood Pressure Medication Reminder",
          "Lab Test at Pathcare",
          "Specialist Consultation",
          "Take Morning Medication",
          "Blood Sugar Check",
          "Physiotherapy Session",
          "Dentist Appointment",
          "Eye Test",
          "Annual Wellness Check"
        ]),
        date: eventDate.toDateString(),
        time: pickOne(["07:00", "08:30", "09:00", "10:00", "11:00", "14:00", "15:30", "16:00"]),
        type: pickOne(['appointment', 'reminder', 'note']),
        notes: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
        color: pickOne(['primary', 'success', 'warning', 'danger', 'info'])
      });
    }
  }
  for (let i = 0; i < eventBatch.length; i += CHUNK) {
    await PatientEvent.insertMany(eventBatch.slice(i, i + CHUNK));
  }

  // ============================================================
  // 12. REVIEWS (for completed consultations)
  // ============================================================
  console.log("⭐ Seeding Reviews...");
  const completedConsults = allConsultations.filter((_: any, idx: number) => idx % 3 === 0).slice(0, 200);
  const reviewBatch: any[] = [];
  const reviewComments = [
    "Excellent consultation. The doctor was thorough and explained everything clearly.",
    "Very professional and caring. Felt reassured after the appointment.",
    "Waited a bit but the quality of care was outstanding.",
    "The doctor took time to listen to all my concerns. Highly recommended.",
    "Very knowledgeable and explained my treatment plan in simple terms.",
    "Good experience overall. Will definitely return.",
    "The telehealth appointment was seamless and just as good as in-person.",
    "Doctor was friendly and professional. Answered all my questions.",
    "Quick, efficient, and effective. Got the help I needed.",
    "Average experience. Nothing exceptional but nothing bad either."
  ];
  for (const consult of completedConsults) {
    const rating = faker.number.float({ min: 3.0, max: 5.0, fractionDigits: 1 });
    reviewBatch.push({
      consultationId: (consult as any)._id,
      patientId: (consult as any).patientId,
      practitionerId: (consult as any).practitionerId,
      rating,
      comment: pickOne(reviewComments),
      categories: {
        communication: faker.number.float({ min: 3.0, max: 5.0, fractionDigits: 1 }),
        professionalism: faker.number.float({ min: 3.5, max: 5.0, fractionDigits: 1 }),
        waitTime: faker.number.float({ min: 2.5, max: 5.0, fractionDigits: 1 })
      },
      isVerified: true
    });
  }
  for (let i = 0; i < reviewBatch.length; i += CHUNK) {
    await Review.insertMany(reviewBatch.slice(i, i + CHUNK));
  }

  // ============================================================
  // 13. BILLING DATA
  // ============================================================
  console.log("💳 Seeding Billing Data...");
  const subBatch: any[] = [];
  const pmBatch: any[] = [];
  const txnBatch: any[] = [];

  const prices: Record<string, number> = { free: 0, pro: 299, family: 499 };
  const txnTypes = ['service_booking', 'subscription', 'pharmacy', 'lab', 'procedure'] as const;

  for (const pat of patientUsers) {
    const tier = pickOne(['free', 'free', 'pro', 'pro', 'family']);
    subBatch.push({
      patientId: pat._id,
      tier,
      status: pickOne(['active', 'active', 'active', 'trial', 'cancelled']),
      startDate: subDays(new Date(), randInt(30, 365)),
      nextBillingDate: addDays(new Date(), randInt(1, 30)),
      autoRenew: Math.random() > 0.2,
      price: prices[tier]
    });

    pmBatch.push({
      patientId: pat._id,
      type: 'card',
      isDefault: true,
      cardBrand: pickOne(['Visa', 'Mastercard']),
      last4: faker.string.numeric(4),
      expiryMonth: randInt(1, 12),
      expiryYear: randInt(2025, 2029)
    });

    if (Math.random() > 0.5) {
      pmBatch.push({
        patientId: pat._id,
        type: 'medical_aid',
        isDefault: false,
        medicalAidProvider: pickOne(MEDAIDS),
        medicalAidNumber: faker.string.alphanumeric(10).toUpperCase()
      });
    }

    // 3–8 transactions per patient
    const txCount = randInt(3, 8);
    for (let j = 0; j < txCount; j++) {
      const amount = randInt(150, 3500);
      const cat = pickOne(txnTypes);
      txnBatch.push({
        patientId: pat._id,
        practitionerId: pickOne(practitionerUsers)._id,
        amount,
        currency: 'ZAR',
        provider: pickOne(['card', 'medical_aid', 'eft']),
        status: pickOne(['completed', 'completed', 'completed', 'pending', 'failed']),
        description: `${cat.replace('_', ' ')} charge`,
        category: cat,
        timestamp: subDays(new Date(), randInt(1, 180)),
        platformFeeAmount: parseFloat((amount * 0.15).toFixed(2)),
        practitionerEarnings: parseFloat((amount * 0.85).toFixed(2))
      });
    }
  }

  // Chunked inserts for large billing batches
  for (let i = 0; i < subBatch.length; i += CHUNK) await Subscription.insertMany(subBatch.slice(i, i + CHUNK));
  for (let i = 0; i < pmBatch.length; i += CHUNK) await PaymentMethod.insertMany(pmBatch.slice(i, i + CHUNK));
  for (let i = 0; i < txnBatch.length; i += CHUNK) await PaymentTransaction.insertMany(txnBatch.slice(i, i + CHUNK));

  // Payout requests for practitioners
  const payoutBatch: any[] = [];
  for (const doc of practitionerUsers) {
    if (Math.random() > 0.25) {
      const amount = randInt(5000, 40000);
      payoutBatch.push({
        practitionerId: doc._id,
        amount,
        currency: 'ZAR',
        status: pickOne(['paid', 'paid', 'pending', 'approved']),
        requestedAt: subDays(new Date(), randInt(1, 60)),
        processedAt: Math.random() > 0.3 ? subDays(new Date(), randInt(1, 30)) : undefined,
        bankAccount: {
          accountHolder: `Dr. ${doc.firstName} ${doc.lastName}`,
          bankName: pickOne(BANKS),
          accountNumber: faker.string.numeric(10),
          branchCode: faker.string.numeric(6)
        },
        periodFrom: subDays(new Date(), 60),
        periodTo: subDays(new Date(), 30),
        consultationCount: randInt(10, 80),
        platformFeeDeducted: randInt(500, 3000)
      });
    }
  }
  await PayoutRequest.insertMany(payoutBatch);

  // Hospital Revenue records (monthly for each facility)
  const revBatch: any[] = [];
  for (const fac of facilities) {
    for (let m = 5; m >= 0; m--) {
      const totalRev = randInt(500000, 3000000);
      revBatch.push({
        facilityId: fac._id,
        period: 'monthly',
        date: subDays(new Date(), m * 30),
        totalRevenue: totalRev,
        byDepartment: [
          { department: "Emergency", revenue: Math.floor(totalRev * 0.25), transactionCount: randInt(50, 200) },
          { department: "Pharmacy", revenue: Math.floor(totalRev * 0.15), transactionCount: randInt(100, 500) },
          { department: "Radiology", revenue: Math.floor(totalRev * 0.20), transactionCount: randInt(30, 150) },
          { department: "Surgical", revenue: Math.floor(totalRev * 0.40), transactionCount: randInt(20, 80) }
        ],
        pendingPayouts: randInt(50000, 200000),
        completedPayouts: randInt(200000, 800000),
        netRevenue: Math.floor(totalRev * 0.85)
      });
    }
  }
  await HospitalRevenue.insertMany(revBatch);

  // ============================================================
  // 14. HEALTH ARTICLES & TIPS
  // ============================================================
  console.log("✍️ Seeding Health Articles & Tips...");
  await Article.insertMany([
    {
      title: "Understanding Cardiovascular Health in the Modern Era",
      slug: "understanding-cardiovascular-health-modern-era",
      excerpt: "Heart disease remains a global challenge, but modern proactive measures and digital monitoring can dramatically improve lifespan and quality of life.",
      content: `<h2>The Heart of the Matter</h2><p>Cardiovascular diseases (CVDs) remain the leading cause of death globally. Modern lifestyles, characterized by sedentary jobs, processed foods, and high stress, contribute significantly to these risks. However, the paradigm is shifting from reactive treatment to proactive prevention.</p><h3>Digital Health & Vitals</h3><p>Through consistent monitoring of blood pressure, heart rate variability, and BMI, patients can now prevent major cardiac events. Platforms like 24/7 DigiHealth allow patients and practitioners to spot trends early, adjusting lifestyle or medications before an emergency arises.</p><h3>Key Takeaways</h3><ul><li>Incorporate 30 minutes of moderate aerobic activity daily.</li><li>Monitor your sodium intake, prioritizing natural foods.</li><li>Log your vitals consistently if you have a family history of CVD.</li></ul>`,
      coverImage: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&q=80&w=800",
      author: "Dr. Anke van Wyk", tags: ["Cardiology", "Wellness", "Preventative Care"],
      likes: 342, isPublished: true, publishedAt: subDays(new Date(), 10)
    },
    {
      title: "Managing Type 2 Diabetes: A Holistic Approach",
      slug: "managing-type-2-diabetes-holistic",
      excerpt: "Diabetes management is not just about insulin; it's about a complete lifestyle recalibration encompassing diet, mental health, and physical activity.",
      content: `<h2>Beyond the Numbers</h2><p>While monitoring HbA1c is critical, true management of Type 2 Diabetes requires a comprehensive overhaul of habits. It's an interplay of nutrition, daily routine, and clinical guidance.</p><p>Regular check-ins via video call ensure tight adherence to dietary plans and rapid adjustment of medication regimes. Continuous glucose monitors (CGMs) have revolutionized patient self-management.</p>`,
      coverImage: "https://images.unsplash.com/photo-1584308666744-24d5e44299ec?auto=format&fit=crop&q=80&w=800",
      author: "Dr. Oliver Mitchell", tags: ["Endocrinology", "Diabetes", "Diet"],
      likes: 228, isPublished: true, publishedAt: subDays(new Date(), 5)
    },
    {
      title: "Mental Health in Post-Pandemic South Africa",
      slug: "mental-health-post-pandemic-south-africa",
      excerpt: "The psychological toll of COVID-19 continues to affect millions of South Africans. Here's how telehealth is bridging the gap in mental healthcare access.",
      content: `<h2>A Silent Crisis</h2><p>South Africa faces a significant mental health crisis, with anxiety and depression rates surging in the post-pandemic era. Limited access to psychiatrists and psychologists in public health facilities exacerbates the problem.</p><h3>Telehealth as a Solution</h3><p>Digital health platforms are democratizing access to mental healthcare. Virtual consultations remove the stigma of visiting a psychiatrist's office and bring care to patients in remote areas.</p>`,
      coverImage: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800",
      author: "Dr. Sipho Nkosi", tags: ["Mental Health", "Telehealth", "South Africa"],
      likes: 415, isPublished: true, publishedAt: subDays(new Date(), 20)
    },
    {
      title: "The Rise of Telehealth: Revolutionizing Patient Care in Africa",
      slug: "rise-of-telehealth-revolutionizing-patient-care-africa",
      excerpt: "From rural villages to urban centers, telehealth is transforming how Africans access quality healthcare.",
      content: `<h2>Breaking Barriers</h2><p>Geographic distance has long been a barrier to healthcare access across Africa. Telehealth technology is dismantling these barriers, enabling real-time consultations with specialists thousands of kilometers away.</p><h3>24/7 DigiHealth's Role</h3><p>Our platform connects patients across Southern Africa with accredited practitioners, enabling video consultations, secure messaging, and digital prescription management — all from a smartphone.</p>`,
      coverImage: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800",
      author: "Dr. Zanele Khumalo", tags: ["Telehealth", "Innovation", "Africa"],
      likes: 567, isPublished: true, publishedAt: subDays(new Date(), 15)
    },
    {
      title: "Nutrition and Chronic Disease Prevention",
      slug: "nutrition-chronic-disease-prevention",
      excerpt: "Scientific evidence increasingly shows that dietary choices are the single most powerful tool in preventing chronic diseases.",
      content: `<h2>Food as Medicine</h2><p>The adage "you are what you eat" has never been more scientifically validated. Chronic diseases such as Type 2 Diabetes, hypertension, and certain cancers are heavily influenced by dietary patterns.</p><h3>South African Dietary Landscape</h3><p>South Africans face unique nutritional challenges, from the prevalence of high-sugar beverages to reliance on processed grains. The traditional African diet, rich in legumes, vegetables, and lean proteins, offers a healthier alternative.</p>`,
      coverImage: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=800",
      author: "Dr. Priya Naidoo", tags: ["Nutrition", "Chronic Disease", "Prevention"],
      likes: 198, isPublished: true, publishedAt: subDays(new Date(), 30)
    }
  ]);

  const tipTitles = [
    "Drink 8 Glasses of Water Daily", "Walk for 20 Minutes Every Day",
    "Limit Screen Time Before Bed", "Practice Deep Breathing for Stress",
    "Eat More Vegetables at Every Meal", "Check Your Blood Pressure Weekly",
    "Stretch for 10 Minutes Each Morning", "Take Your Medication on Time",
    "Sleep 7–8 Hours Every Night", "Get an Annual Physical Check-Up",
    "Reduce Salt in Your Diet", "Log Your Symptoms in the App",
    "Schedule a Dental Check-Up", "Stand Up and Move Every Hour",
    "Keep an Eye on Your BMI", "Maintain a Healthy Weight",
    "Quit Smoking – It's Never Too Late", "Limit Alcohol Consumption",
    "Monitor Your Blood Sugar Regularly", "Wash Your Hands Frequently"
  ];
  const tipBatch = tipTitles.map((title, idx) => ({
    title,
    excerpt: faker.lorem.sentence(),
    content: faker.lorem.paragraphs(2),
    author: pickOne(["Dr. Oliver Mitchell", "Dr. Anke van Wyk", "Dr. Sipho Nkosi", "Dr. Priya Naidoo", "Dr. Zanele Khumalo"]),
    date: subDays(new Date(), idx).toISOString().split('T')[0],
    readTime: pickOne(["1 min", "2 min", "3 min"]),
    tag: "Daily Tip",
    category: 'tip'
  }));
  await HealthTip.insertMany(tipBatch);

  // ============================================================
  // SUMMARY
  // ============================================================
  const [userCount, patCount, practCount, consultCount, msgCount, txnCount] = await Promise.all([
    User.countDocuments(),
    PatientProfile.countDocuments(),
    PractitionerProfile.countDocuments(),
    Consultation.countDocuments(),
    Message.countDocuments(),
    PaymentTransaction.countDocuments()
  ]);

  console.log("\n✅ ====== SEEDING COMPLETE ======");
  console.log(`👤 Total Users:          ${userCount}`);
  console.log(`🤒 Patient Profiles:     ${patCount}`);
  console.log(`🩺 Practitioner Profiles: ${practCount}`);
  console.log(`📞 Consultations:        ${consultCount}`);
  console.log(`💬 Messages:             ${msgCount}`);
  console.log(`💳 Transactions:         ${txnCount}`);
  console.log("================================\n");
  process.exit(0);
}

seed().catch(err => {
  console.error("\n❌ SEED FAILED:");
  console.error(err);
  process.exit(1);
});
