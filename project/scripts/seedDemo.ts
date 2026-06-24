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
import Message from '../lib/models/Message';
import Conversation from '../lib/models/Conversation';
import Staff from '../lib/models/Staff';
import HospitalAppointment from '../lib/models/HospitalAppointment';
import { PaymentTransaction, Subscription, PaymentMethod, PayoutRequest, HospitalRevenue } from '../lib/models/Billing';
import { Article } from '../lib/models/Article';
import { HealthTip } from '../lib/models/HealthTip';
import { PractitionerSchedule } from '../lib/models/Scheduling';
import { Review } from '../lib/models/ReviewsDocs';
import PatientEvent from '../lib/models/PatientEvent';
import Call from '../lib/models/Call';

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
  "Obstetrician", "Rheumatologist", "Urologist", "Ophthalmologist"
];

const SOUTH_AFRICAN_FIRST_NAMES_M = [
  "Sipho", "Thabo", "Bongani", "Lethiwe", "Lungelo", "Mthokozisi", "Siyanda",
  "Nkosinathi", "Mduduzi", "Sibusiso", "Andile", "Lwazi", "Nhlanhla", "Musa",
  "Sandile", "Thandolwethu", "Sakhile", "Mthunzi", "Mpendulo", "Bayanda",
  "James", "Michael", "David", "Robert", "William", "Pieter", "Johan"
];

const SOUTH_AFRICAN_FIRST_NAMES_F = [
  "Thandiwe", "Nokuthula", "Nomvula", "Zanele", "Lungile", "Nomthandazo",
  "Buyisiwe", "Thandi", "Noxolo", "Sifiso", "Ntombifuthi", "Simangele",
  "Hlengiwe", "Nompumelelo", "Zinhle", "Nothando", "Mbali", "Sarah", "Emma"
];

const SOUTH_AFRICAN_LAST_NAMES = [
  "Mokoena", "Dlamini", "Zulu", "Mthembu", "Nkosi", "Khumalo", "Ndlovu",
  "Mhlongo", "Gumede", "Ntanzi", "Sithole", "Mthethwa", "Luthuli", "Bhengu",
  "van Wyk", "van der Merwe", "Botha", "Nel", "du Plessis", "Joubert",
  "Pretorius", "Steyn", "Venter", "Visser", "Coetzer", "Patel", "Naidoo"
];

const CHRONIC_CONDITIONS = [
  "Hypertension", "Type 2 Diabetes", "Asthma", "COPD", "Heart Failure",
  "Hypothyroidism", "Hyperlipidemia", "Depression", "Anxiety Disorder"
];

const MEDICATIONS = [
  "Amlodipine 5mg", "Metformin 500mg", "Atorvastatin 20mg", "Lisinopril 10mg",
  "Losartan 50mg", "Salbutamol Inhaler", "Metoprolol 25mg", "Omeprazole 20mg",
  "Levothyroxine 50mcg", "Aspirin 81mg", "Sertraline 50mg"
];

const ALLERGENS = [
  { allergen: "Penicillin", reaction: "Anaphylaxis", severity: "severe" as const },
  { allergen: "Sulfonamides", reaction: "Rash and urticaria", severity: "moderate" as const },
  { allergen: "NSAIDs", reaction: "Bronchospasm", severity: "severe" as const },
  { allergen: "Peanuts", reaction: "Hives", severity: "mild" as const }
];

const COMPLAINT_TEMPLATES = [
  "Patient presents with persistent headache for the past 3 days",
  "Chief complaint of shortness of breath on exertion",
  "Follow-up for hypertension management and medication review",
  "Routine diabetes check-up and HbA1c review",
  "Patient reports chest palpitations and mild dizziness",
  "Skin rash on forearms, pruritic, appeared 5 days ago",
  "Chronic lower back pain, worsening with prolonged sitting",
  "Annual wellness check-up with blood pressure monitoring",
  "Complaint of fatigue and unexplained weight loss"
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
      { name: "LDL Cholesterol", unit: "mmol/L", referenceRange: "<3.4", baseValue: 3.2 }
    ]
  }
];

const VACCINES = [
  { name: "COVID-19 (Pfizer-BioNTech)", dosage: "0.3 mL IM" },
  { name: "Influenza (Annual)", dosage: "0.5 mL IM" },
  { name: "Hepatitis B", dosage: "1.0 mL IM" }
];

const SA_PROVINCES = ["Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape", "Free State"];
const SA_CITIES = ["Johannesburg", "Cape Town", "Durban", "Port Elizabeth", "Bloemfontein"];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI not found in environment. Please check your .env.local file.");
    process.exit(1);
  }

  console.log("🚀 Connecting to MongoDB...");
  await mongoose.connect(uri);

  console.log("🧹 Clearing existing data...");
  const collections = [
    User, PatientProfile, PractitionerProfile, HospitalAdminProfile,
    Facility, Consultation, Anthropometric, MedicalContext, Prescription,
    LabResult, Immunization, Message, Conversation, Staff, HospitalAppointment,
    PaymentTransaction, Subscription, PaymentMethod, PayoutRequest, HospitalRevenue,
    Article, HealthTip, PractitionerSchedule, Review, PatientEvent, Call
  ];

  for (const col of collections) {
    await col.deleteMany({});
  }

  const pw = hash("Password123!");

  // ============================================================
  // 1. 5 FACILITIES
  // ============================================================
  console.log("🏥 Seeding exactly 5 Facilities...");
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
    }
  ]);

  // ============================================================
  // 1.5 ADMINS & INSPECTOR
  // ============================================================
  console.log("🔑 Seeding Admin, Super Admin, Mega Admin, and Inspector users...");
  const adminData = [
    { email: "admin@milpark.netcare.co.za", firstName: "Sarah", lastName: "Jenkins", facilityIdx: 0 },
    { email: "admin@brenthurst.co.za", firstName: "Deon", lastName: "Pretorius", facilityIdx: 1 },
    { email: "admin@mediclinic-sandton.co.za", firstName: "Priya", lastName: "Naidoo", facilityIdx: 2 },
    { email: "admin@helenjoseph.co.za", firstName: "Thabo", lastName: "Mokoena", facilityIdx: 3 },
    { email: "admin@gsh.co.za", firstName: "Zanele", lastName: "Khumalo", facilityIdx: 4 }
  ];

  for (const a of adminData) {
    const u = await User.create({
      email: a.email, passwordHash: pw, role: 'hospital_admin',
      firstName: a.firstName, lastName: a.lastName, status: 'active'
    });
    await HospitalAdminProfile.create({
      userId: u._id,
      hospitalId: facilities[a.facilityIdx]._id,
      department: "Administration",
      permissions: ["bed_management", "staff_management", "reports", "billing"]
    });
  }

  await User.create({
    email: "super@247digihealth.com", passwordHash: pw, role: 'super_admin',
    firstName: "Alex", lastName: "Thornton", status: 'active'
  });
  
  await User.create({
    email: "mega@247digihealth.com", passwordHash: pw, role: 'mega_admin',
    firstName: "Victoria", lastName: "Harrington", status: 'active'
  });

  await User.create({
    email: "lebo@doh.gov.za", passwordHash: pw, role: 'inspector',
    firstName: "Lebo", lastName: "Sithole", status: 'active'
  });

  // ============================================================
  // 2. 20 PRACTITIONERS
  // ============================================================
  console.log("🩺 Seeding exactly 20 Practitioners (past, present, and future data)...");
  const BANKS = ["FNB", "Standard Bank", "Nedbank", "Absa", "Capitec"];
  const MEDAIDS = ["Discovery Health", "Bonitas", "Momentum Health", "GEMS", "Bestmed", "Fedhealth", "Medihelp"];

  const practitionerUsers: any[] = [];
  // Seeding 20 practitioners (all roles user mapping)
  for (let i = 0; i < 20; i++) {
    let fn = "";
    let ln = "";
    let spec = "";
    let uniqueEmail = "";
    let isFemale = i % 2 === 0;

    // Anchor core practitioners to keep credentials stable
    if (i === 0) {
      fn = "Zinhle";
      ln = "Ndlovu";
      spec = "General Practitioner";
      uniqueEmail = "dr.zinhle.ndlovu0@247digihealth.com";
      isFemale = true;
    } else if (i === 1) {
      fn = "Mthokozisi";
      ln = "Luthuli";
      spec = "Cardiologist";
      uniqueEmail = "dr.mthokozisi.luthuli1@247digihealth.com";
      isFemale = false;
    } else if (i === 2) {
      fn = "Nomvula";
      ln = "Khumalo";
      spec = "Rheumatologist";
      uniqueEmail = "dr.nomvula.khumalo2@247digihealth.com";
      isFemale = true;
    } else if (i === 3) {
      fn = "Sakhile";
      ln = "Zulu";
      spec = "Obstetrician";
      uniqueEmail = "dr.sakhile.zulu3@247digihealth.com";
      isFemale = false;
    } else if (i === 4) {
      fn = "Nomvula";
      ln = "Ndlovu";
      spec = "Neurologist";
      uniqueEmail = "dr.nomvula.ndlovu4@247digihealth.com";
      isFemale = true;
    } else if (i === 5) {
      fn = "Lungelo";
      ln = "Khumalo";
      spec = "Urologist";
      uniqueEmail = "dr.lungelo.khumalo5@247digihealth.com";
      isFemale = false;
    } else {
      fn = isFemale ? pickOne(SOUTH_AFRICAN_FIRST_NAMES_F) : pickOne(SOUTH_AFRICAN_FIRST_NAMES_M);
      ln = pickOne(SOUTH_AFRICAN_LAST_NAMES);
      spec = pickOne(SPECIALISATIONS);
      uniqueEmail = `dr.${fn.toLowerCase().replace(/\s/g, '')}.${ln.toLowerCase().replace(/\s/g, '')}${i}@247digihealth.com`;
    }

    const expYears = randInt(5, 30);
    const bank = pickOne(BANKS);
    const city = pickOne(SA_CITIES);
    const province = pickOne(SA_PROVINCES);
    const affiliatedFacilities = [facilities[i % 5]._id];

    const u = await User.create({
      email: uniqueEmail, passwordHash: pw, role: 'practitioner',
      firstName: fn, lastName: ln, status: 'active'
    });
    practitionerUsers.push(u);

    await PractitionerProfile.create({
      userId: u._id,
      specialisation: spec,
      hpcsaNumber: "MP" + (1000000 + i),
      experienceYears: expYears,
      bio: `Dr. ${fn} ${ln} is a highly skilled ${spec} based in ${city}, specializing in diagnostic and patient-centric healthcare for over ${expYears} years.`,
      languages: pickSome(["English", "Afrikaans", "isiZulu", "Xhosa"], 1, 3),
      acceptedMedicalAids: pickSome(MEDAIDS, 2, 4),
      rating: faker.number.float({ min: 4.0, max: 5.0, fractionDigits: 1 }),
      reviewCount: randInt(10, 100),
      isOnline: i % 3 === 0, // Present data: online status mix
      affiliatedFacilityIds: affiliatedFacilities,
      achievements: [`Excellence Award in ${spec}`],
      bankAccount: {
        accountHolder: `Dr ${fn} ${ln}`,
        bankName: bank,
        accountNumber: faker.string.numeric(10),
        branchCode: faker.string.numeric(6),
        taxNumber: faker.string.numeric(10)
      },
      address: { street: `${randInt(1, 100)} Medical Suite, ${city}`, city, province }
    });
  }

  // ============================================================
  // 3. 50 PATIENTS (include medical data and anthropometrics)
  // ============================================================
  console.log("👥 Seeding exactly 50 Patients with medical logs & vitals...");
  const patientUsers: any[] = [];
  const patientProfiles: any[] = [];

  for (let i = 0; i < 50; i++) {
    let fn = "";
    let ln = "";
    let email = "";
    let isFemale = i % 2 === 0;
    let dob = faker.date.birthdate({ min: 20, max: 75, mode: 'age' });
    let tier: 'free' | 'pro' = i % 3 === 0 ? 'pro' : 'free';

    // Anchor core patients to keep credentials stable
    if (i === 0) {
      fn = "Mbali";
      ln = "Gumede";
      email = "patient.mbali.gumede0@example.com";
      isFemale = true;
      dob = new Date(1990, 4, 12);
      tier = 'pro';
    } else if (i === 1) {
      fn = "Mpendulo";
      ln = "Dlamini";
      email = "patient.mpendulo.dlamini1@example.com";
      isFemale = false;
      dob = new Date(1983, 0, 15);
      tier = 'free';
    } else if (i === 2) {
      fn = "Sifiso";
      ln = "Mhlongo";
      email = "patient.sifiso.mhlongo2@example.com";
      isFemale = true;
      dob = new Date(1995, 6, 20);
      tier = 'free';
    } else if (i === 3) {
      fn = "Sipho";
      ln = "du Plessis";
      email = "patient.sipho.duplessis3@example.com";
      isFemale = false;
      dob = new Date(1988, 10, 5);
      tier = 'pro';
    } else if (i === 4) {
      fn = "Noxolo";
      ln = "Naidoo";
      email = "patient.noxolo.naidoo4@example.com";
      isFemale = true;
      dob = new Date(1991, 2, 28);
      tier = 'free';
    } else if (i === 5) {
      fn = "Lwazi";
      ln = "Sithole";
      email = "patient.lwazi.sithole5@example.com";
      isFemale = false;
      dob = new Date(1989, 8, 14);
      tier = 'free';
    } else {
      fn = isFemale ? pickOne(SOUTH_AFRICAN_FIRST_NAMES_F) : pickOne(SOUTH_AFRICAN_FIRST_NAMES_M);
      ln = pickOne(SOUTH_AFRICAN_LAST_NAMES);
      email = `patient.${fn.toLowerCase().replace(/\s/g, '')}.${ln.toLowerCase().replace(/\s/g, '')}${i}@example.com`;
    }

    const saId = generateSAId(dob, isFemale);

    const u = await User.create({
      email, passwordHash: pw, role: 'patient',
      firstName: fn, lastName: ln, saId,
      mobile: `+27 ${randInt(60, 84)} ${faker.string.numeric(3)} ${faker.string.numeric(4)}`,
      status: 'active'
    });
    patientUsers.push(u);

    const profile = await PatientProfile.create({
      userId: u._id,
      dateOfBirth: dob,
      gender: isFemale ? 'female' : 'male',
      emergencyContact: {
        name: faker.person.fullName(),
        phone: `+27 82 ${faker.string.numeric(7)}`,
        relationship: pickOne(["Spouse", "Parent", "Sibling"])
      },
      medicalAid: {
        provider: pickOne(MEDAIDS),
        planName: pickOne(["Core", "Smart", "Comprehensive"]),
        memberNumber: faker.string.alphanumeric(8).toUpperCase()
      },
      subscriptionTier: tier,
      popiaConsentDate: subDays(new Date(), randInt(30, 365)),
      myDoctorIds: [practitionerUsers[i % 20]._id, practitionerUsers[(i + 1) % 20]._id]
    });
    patientProfiles.push(profile);

    // Update practitioners with assigned patients
    await PractitionerProfile.updateOne(
      { userId: practitionerUsers[i % 20]._id },
      { $addToSet: { assignedPatientIds: u._id } }
    );
    await PractitionerProfile.updateOne(
      { userId: practitionerUsers[(i + 1) % 20]._id },
      { $addToSet: { assignedPatientIds: u._id } }
    );
  }

  // ============================================================
  // 4. CLINICAL DATA & ANTHROPOMETRICS (Vitals history - past 6 months)
  // ============================================================
  console.log("📋 Seeding Clinical data, Vital logs (anthropometrics) for patients...");
  const medContextBatch: any[] = [];
  const anthropoBatch: any[] = [];
  const prescriptionBatch: any[] = [];
  const labResultBatch: any[] = [];
  const immunizationBatch: any[] = [];

  for (let i = 0; i < 50; i++) {
    const patId = patientUsers[i]._id;
    const conds = pickSome(CHRONIC_CONDITIONS, 1, 2);
    const meds = pickSome(MEDICATIONS, 1, 2);
    const allergy = pickOne(ALLERGENS);

    // 4.1 Medical Context
    medContextBatch.push({
      patientId: patId,
      chronicConditions: conds,
      allergies: [{
        allergen: allergy.allergen,
        reaction: allergy.reaction,
        severity: allergy.severity,
        source: 'clinician'
      }],
      currentMedications: meds,
      familyHistory: pickSome(["Hypertension", "Diabetes mellitus", "Ischemic heart disease"], 1, 2)
    });

    // 4.2 Anthropometrics (6 logs per patient, representing monthly records)
    const baseWeight = randInt(55, 95);
    const baseHeight = randInt(160, 185);
    const baseBMI = parseFloat((baseWeight / ((baseHeight / 100) ** 2)).toFixed(1));
    for (let m = 5; m >= 0; m--) {
      anthropoBatch.push({
        patientId: patId,
        dateRecorded: subDays(new Date(), m * 30 + randInt(0, 5)),
        heightCm: baseHeight,
        weightKg: baseWeight + (Math.random() - 0.5) * 3,
        bmi: baseBMI + (Math.random() - 0.5) * 1.0,
        bloodType: pickOne(['A+', 'B+', 'O+', 'AB+']),
        vitalSigns: {
          systolicBP: randInt(115, 140),
          diastolicBP: randInt(75, 90),
          heartRateBpm: randInt(65, 95),
          spO2: randInt(96, 99),
          temperatureCelsius: 36.2 + Math.random() * 0.8
        }
      });
    }

    // 4.3 Prescriptions
    for (const med of meds) {
      prescriptionBatch.push({
        patientId: patId,
        practitionerId: practitionerUsers[i % 20]._id,
        medicationName: med,
        dosage: "Once daily",
        instructions: "Take in the morning with food",
        status: 'active',
        prescribedDate: subDays(new Date(), randInt(5, 60)),
        refillsRemaining: randInt(1, 5)
      });
    }

    // 4.4 Lab Results
    const labTemplate = pickOne(LAB_TESTS);
    labResultBatch.push({
      patientId: patId,
      orderedById: practitionerUsers[i % 20]._id,
      testName: labTemplate.testName,
      dateReported: subDays(new Date(), randInt(10, 45)),
      parameters: labTemplate.parameters.map(p => {
        const value = (p.baseValue + (Math.random() - 0.5) * p.baseValue * 0.1).toFixed(1);
        return {
          name: p.name,
          value,
          unit: p.unit,
          referenceRange: p.referenceRange,
          status: 'normal'
        };
      })
    });

    // 4.5 Immunization
    const vaccine = pickOne(VACCINES);
    immunizationBatch.push({
      patientId: patId,
      vaccineName: vaccine.name,
      dateAdministered: subDays(new Date(), randInt(100, 300)),
      dosage: vaccine.dosage,
      batchNumber: "B" + faker.string.numeric(5),
      administeredBy: `Nurse ${pickOne(SOUTH_AFRICAN_LAST_NAMES)}`,
      nextDueDate: addDays(new Date(), 365)
    });
  }

  await MedicalContext.insertMany(medContextBatch);
  await Anthropometric.insertMany(anthropoBatch);
  await Prescription.insertMany(prescriptionBatch);
  await LabResult.insertMany(labResultBatch);
  await Immunization.insertMany(immunizationBatch);

  // ============================================================
  // 5. BOOKINGS & APPOINTMENTS (Past, Present, and Future)
  // ============================================================
  console.log("📞 Seeding Consultations & Appointments (past, present, and future)...");
  
  const consultBatch: any[] = [];
  const reviewBatch: any[] = [];
  const apptBatch: any[] = [];

  // Seed schedules for the 20 practitioners (past 7 days & future 7 days)
  const scheduleBatch: any[] = [];
  for (const doc of practitionerUsers) {
    for (let d = -7; d <= 7; d++) {
      const schedDate = addDays(new Date(), d);
      const slots = [];
      for (let h = 8; h <= 16; h++) {
        slots.push({
          startTime: `${h.toString().padStart(2, '0')}:00`,
          endTime: `${(h + 1).toString().padStart(2, '0')}:00`,
          status: d < 0 ? 'booked' : (d === 0 && h < 12 ? 'booked' : 'available')
        });
      }
      scheduleBatch.push({
        practitionerId: doc._id,
        date: schedDate,
        slots
      });
    }
  }
  await PractitionerSchedule.insertMany(scheduleBatch);

  // Consultations & Reviews (Telehealth Bookings)
  for (let i = 0; i < 150; i++) {
    const pat = patientUsers[i % 50];
    const doc = practitionerUsers[i % 20];
    const fac = facilities[i % 5];
    
    // Distribute times: past, present (today), future
    let scheduledStartTime: Date;
    let status: 'requested' | 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    let type: 'video' | 'chat' | 'in_person' = i % 3 === 0 ? 'video' : i % 3 === 1 ? 'chat' : 'in_person';

    if (i < 90) {
      // Past bookings
      scheduledStartTime = subDays(new Date(), randInt(1, 30));
      status = i % 10 === 0 ? 'cancelled' : 'completed';
    } else if (i < 110) {
      // Present bookings (today)
      scheduledStartTime = new Date();
      scheduledStartTime.setHours(randInt(8, 16), 0, 0, 0);
      status = i % 2 === 0 ? 'in_progress' : 'scheduled';
    } else {
      // Future bookings
      scheduledStartTime = addDays(new Date(), randInt(1, 10));
      status = i % 5 === 0 ? 'requested' : 'scheduled';
    }

    const scheduledEndTime = new Date(scheduledStartTime.getTime() + 30 * 60000);

    const consult = await Consultation.create({
      patientId: pat._id,
      practitionerId: doc._id,
      facilityId: fac._id,
      type,
      status,
      scheduledStartTime,
      scheduledEndTime,
      chiefComplaint: pickOne(COMPLAINT_TEMPLATES),
      clinicalRisk: i % 4 === 0 ? {
        score: randInt(10, 85),
        color: i % 8 === 0 ? 'red' : 'green',
        factors: ["Elevated vital signs"]
      } : undefined,
      soapNotes: status === 'completed' ? {
        subjective: "Patient complains of fatigue and mild head discomfort.",
        objective: "Vitals stable. BP 128/82, HR 72, Temperature 36.5C.",
        assessment: "Minor viral syndrome or tension headache.",
        plan: "Rest, hydration, and paracetamol as needed. Review if symptoms worsen.",
        signedAt: scheduledEndTime
      } : undefined,
      callMinutesUsed: status === 'completed' && type === 'video' ? randInt(10, 25) : 0
    });

    // Generate reviews for completed consultations
    if (status === 'completed' && i % 3 === 0) {
      reviewBatch.push({
        consultationId: consult._id,
        patientId: pat._id,
        practitionerId: doc._id,
        rating: randInt(4, 5),
        comment: pickOne([
          "Great consultation. Extremely professional and reassuring.",
          "Very efficient video consultation, Doctor was great.",
          "Good Family GP. Highly recommended."
        ]),
        categories: { communication: 5, professionalism: 5, waitTime: 4 },
        isVerified: true
      });
    }
  }
  await Review.insertMany(reviewBatch);

  // Hospital Appointments (Physical Facilities)
  for (let i = 0; i < 80; i++) {
    const pat = patientUsers[i % 50];
    const doc = practitionerUsers[i % 20];
    const fac = facilities[i % 5];
    
    let scheduledStart: Date;
    let status: 'scheduled' | 'completed' | 'cancelled' | 'in_progress';

    if (i < 50) {
      scheduledStart = subDays(new Date(), randInt(1, 20));
      status = 'completed';
    } else if (i < 60) {
      scheduledStart = new Date();
      scheduledStart.setHours(randInt(8, 16), 0, 0, 0);
      status = 'scheduled';
    } else {
      scheduledStart = addDays(new Date(), randInt(1, 15));
      status = 'scheduled';
    }

    apptBatch.push({
      facilityId: fac._id,
      patientId: pat._id,
      practitionerId: doc._id,
      type: pickOne(['consultation', 'procedure', 'lab']),
      scheduledStart,
      scheduledEnd: new Date(scheduledStart.getTime() + 60 * 60000),
      status,
      room: `Consultation Room ${randInt(1, 10)}`
    });
  }
  await HospitalAppointment.insertMany(apptBatch);

  // ============================================================
  // 6. MESSAGING & VIDEOCALL LOGS
  // ============================================================
  console.log("💬 Seeding conversations, secure chat messages, and video calls...");
  
  for (let i = 0; i < 20; i++) {
    const pat = patientUsers[i];
    const doc = practitionerUsers[i];
    
    // Conversation
    const conv = await Conversation.create({
      patientId: pat._id,
      practitionerId: doc._id,
      status: i % 4 === 0 ? 'ended' : 'active',
      minutesAllocated: 30,
      minutesUsed: randInt(5, 20),
      startedAt: subDays(new Date(), randInt(2, 10)),
      lastActivityAt: new Date()
    });

    // Chat messages
    const msgs = [
      { sender: pat, receiver: doc, text: "Hello Doctor, I wanted to follow up on my blood test results." },
      { sender: doc, receiver: pat, text: "Hi! Your results show slightly elevated cholesterol. We should adjust your diet." },
      { sender: pat, receiver: doc, text: "Should I book a consultation?" },
      { sender: doc, receiver: pat, text: "Yes, please schedule a 15-minute slot for next week." }
    ];

    const messageObjects = msgs.map((m, idx) => ({
      conversationId: conv._id,
      senderId: m.sender._id,
      receiverId: m.receiver._id,
      content: m.text,
      type: 'text',
      isRead: true,
      deliveredAt: subDays(new Date(), 1),
      createdAt: subDays(new Date(), 1)
    }));
    await Message.insertMany(messageObjects);

    // Call Records (Past & Present)
    await Call.create({
      conversationId: conv._id,
      initiatedBy: doc._id,
      startedAt: subDays(new Date(), randInt(1, 5)),
      endedAt: subDays(new Date(), 1),
      durationSeconds: randInt(300, 1200),
      type: 'video',
      status: 'ended',
      livekitRoomName: `room-${conv._id}`
    });

    if (i % 5 === 0) {
      // Current present active/requested call
      await Call.create({
        conversationId: conv._id,
        initiatedBy: pat._id,
        startedAt: new Date(),
        type: 'video',
        status: 'active',
        livekitRoomName: `room-active-${conv._id}`
      });
    }
  }

  // ============================================================
  // 7. PAYMENTS & CASHOUTS (Billing data)
  // ============================================================
  console.log("💳 Seeding billing history: payments, subscription transactions, cashouts...");
  
  const subBatch: any[] = [];
  const pmBatch: any[] = [];
  const txnBatch: any[] = [];
  const payoutBatch: any[] = [];

  const prices: Record<string, number> = { free: 0, pro: 299, family: 499 };

  for (let i = 0; i < 50; i++) {
    const pat = patientUsers[i];
    const tier = i % 3 === 0 ? 'pro' : 'free';
    
    // Subscription
    subBatch.push({
      patientId: pat._id,
      tier,
      status: 'active',
      startDate: subDays(new Date(), randInt(30, 90)),
      nextBillingDate: addDays(new Date(), randInt(5, 25)),
      autoRenew: true,
      price: prices[tier]
    });

    // Payment Method
    pmBatch.push({
      patientId: pat._id,
      type: 'card',
      isDefault: true,
      cardBrand: i % 2 === 0 ? 'Visa' : 'Mastercard',
      last4: faker.string.numeric(4),
      expiryMonth: randInt(1, 12),
      expiryYear: randInt(2027, 2030)
    });

    // Payments for bookings, pharmacy, or subscriptions
    const amount = i % 3 === 0 ? 299 : randInt(150, 800);
    txnBatch.push({
      patientId: pat._id,
      practitionerId: practitionerUsers[i % 20]._id,
      facilityId: facilities[i % 5]._id,
      amount,
      currency: 'ZAR',
      provider: 'card',
      status: 'completed',
      description: i % 3 === 0 ? 'Monthly Premium Subscription' : 'Service Booking consultation fee',
      category: i % 3 === 0 ? 'subscription' : 'service_booking',
      timestamp: subDays(new Date(), randInt(2, 60)),
      platformFeeAmount: parseFloat((amount * 0.15).toFixed(2)),
      practitionerEarnings: parseFloat((amount * 0.85).toFixed(2))
    });
  }

  await Subscription.insertMany(subBatch);
  await PaymentMethod.insertMany(pmBatch);
  await PaymentTransaction.insertMany(txnBatch);

  // Cashouts (Payout requests by practitioners)
  for (let i = 0; i < 20; i++) {
    const doc = practitionerUsers[i];
    
    // Completed Payouts
    payoutBatch.push({
      practitionerId: doc._id,
      amount: randInt(3000, 15000),
      currency: 'ZAR',
      status: 'paid',
      requestedAt: subDays(new Date(), 20),
      processedAt: subDays(new Date(), 18),
      bankAccount: {
        accountHolder: `Dr ${doc.firstName} ${doc.lastName}`,
        bankName: pickOne(BANKS),
        accountNumber: faker.string.numeric(10),
        branchCode: faker.string.numeric(6)
      },
      periodFrom: subDays(new Date(), 50),
      periodTo: subDays(new Date(), 21),
      consultationCount: randInt(10, 25),
      platformFeeDeducted: randInt(450, 2250)
    });

    // Current Pending Payout (Cashout)
    if (i % 2 === 0) {
      payoutBatch.push({
        practitionerId: doc._id,
        amount: randInt(2500, 8000),
        currency: 'ZAR',
        status: 'pending',
        requestedAt: subDays(new Date(), 2),
        bankAccount: {
          accountHolder: `Dr ${doc.firstName} ${doc.lastName}`,
          bankName: pickOne(BANKS),
          accountNumber: faker.string.numeric(10),
          branchCode: faker.string.numeric(6)
        },
        periodFrom: subDays(new Date(), 20),
        periodTo: new Date(),
        consultationCount: randInt(5, 12),
        platformFeeDeducted: randInt(300, 1200)
      });
    }
  }
  await PayoutRequest.insertMany(payoutBatch);

  // ============================================================
  // 8. ADMIN REPORTS (Hospital Revenue)
  // ============================================================
  console.log("📊 Seeding Admin Reports: Hospital monthly revenue logs...");
  const revBatch: any[] = [];
  for (const fac of facilities) {
    for (let m = 3; m >= 0; m--) {
      const totalRev = randInt(200000, 800000);
      revBatch.push({
        facilityId: fac._id,
        period: 'monthly',
        date: subDays(new Date(), m * 30),
        totalRevenue: totalRev,
        byDepartment: [
          { department: "Emergency", revenue: Math.floor(totalRev * 0.3), transactionCount: randInt(40, 100) },
          { department: "Pharmacy", revenue: Math.floor(totalRev * 0.2), transactionCount: randInt(80, 200) },
          { department: "Radiology", revenue: Math.floor(totalRev * 0.15), transactionCount: randInt(20, 60) },
          { department: "General Ward", revenue: Math.floor(totalRev * 0.35), transactionCount: randInt(15, 45) }
        ],
        pendingPayouts: randInt(15000, 50000),
        completedPayouts: randInt(80000, 200000),
        netRevenue: Math.floor(totalRev * 0.85)
      });
    }
  }
  await HospitalRevenue.insertMany(revBatch);

  // ============================================================
  // 9. HEALTH TIPS, ARTICLES, & PATIENT CALENDAR EVENTS
  // ============================================================
  console.log("✍️ Seeding Articles, Health Tips, and Calendar Events...");
  
  await Article.insertMany([
    {
      title: "Active Living: A Shield Against Cardiovascular Disease",
      slug: "active-living-shield-cardiovascular-disease",
      excerpt: "Heart disease remains a major healthcare challenge in South Africa, but regular exercise is one of the most effective measures you can take.",
      content: "<h2>Exercise and the Heart</h2><p>Regular physical activity reduces blood pressure and strengthens the heart muscle. Aim for 150 minutes of moderate activity weekly.</p>",
      coverImage: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&q=80&w=800",
      author: "Dr. Anke van Wyk",
      tags: ["Cardiology", "Fitness", "Prevention"],
      likes: 85,
      isPublished: true,
      publishedAt: subDays(new Date(), 5)
    }
  ]);

  const tipTitles = [
    "Stay Hydrated under the African Sun",
    "Monitor Your Daily Sugar Intake",
    "Integrate Mindful Breathing in Stressful Situations"
  ];
  await HealthTip.insertMany(tipTitles.map((title, idx) => ({
    title,
    excerpt: "Quick health recommendation for wellness.",
    content: "Take care of your mind and body daily.",
    author: "DigiHealth Clinician Team",
    date: subDays(new Date(), idx).toISOString().split('T')[0],
    readTime: "1 min",
    tag: "Daily Tip",
    category: 'tip'
  })));

  // Patient Calendar events
  const eventBatch: any[] = [];
  for (let i = 0; i < 30; i++) {
    const pat = patientUsers[i];
    eventBatch.push({
      patientId: pat._id,
      title: "Medication: Take BP pills",
      date: new Date().toDateString(),
      time: "08:00",
      type: 'reminder',
      notes: "Do not take on empty stomach.",
      color: 'warning'
    });
    eventBatch.push({
      patientId: pat._id,
      title: "Telehealth Consultation",
      date: addDays(new Date(), 2).toDateString(),
      time: "10:30",
      type: 'appointment',
      notes: "Video follow-up with Practitioner.",
      color: 'primary'
    });
  }
  await PatientEvent.insertMany(eventBatch);

  // ============================================================
  // SUMMARY
  // ============================================================
  const [
    userCount, patCount, practCount, facCount, consultCount,
    msgCount, callCount, txnCount, payoutCount, revCount
  ] = await Promise.all([
    User.countDocuments(),
    PatientProfile.countDocuments(),
    PractitionerProfile.countDocuments(),
    Facility.countDocuments(),
    Consultation.countDocuments(),
    Message.countDocuments(),
    Call.countDocuments(),
    PaymentTransaction.countDocuments(),
    PayoutRequest.countDocuments(),
    HospitalRevenue.countDocuments()
  ]);

  console.log("\n✅ ====== SEEDING COMPLETE ======");
  console.log(`🏥 Facilities:            ${facCount} (Expected: 5)`);
  console.log(`🩺 Practitioners:         ${practCount} (Expected: 20)`);
  console.log(`🤒 Patients:              ${patCount} (Expected: 50)`);
  console.log(`👤 Total Users:           ${userCount}`);
  console.log(`📞 Consultations:         ${consultCount}`);
  console.log(`💬 Messages:              ${msgCount}`);
  console.log(`📹 Video Calls:           ${callCount}`);
  console.log(`💳 Transactions:          ${txnCount}`);
  console.log(`💰 Payouts/Cashouts:      ${payoutCount}`);
  console.log(`📊 Hospital Revenue Logs: ${revCount}`);
  console.log("================================\n");
  
  process.exit(0);
}

seed().catch(err => {
  console.error("\n❌ SEED FAILED:");
  console.error(err);
  process.exit(1);
});
