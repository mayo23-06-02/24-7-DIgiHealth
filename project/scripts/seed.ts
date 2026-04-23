import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// --- MODEL IMPORTS ---
import User from '../lib/models/User';
import { PatientProfile, PractitionerProfile, EMTProfile } from '../lib/models/RoleProfiles';
import Facility from '../lib/models/Facility';
import Consultation from '../lib/models/Consultation';
import { Anthropometric, MedicalContext, Prescription, LabResult } from '../lib/models/ClinicalData';
import AttachedRecord from '../lib/models/AttachedRecord';
import RiskScore from '../lib/models/RiskScore';
import Message from '../lib/models/Message';
import Conversation from '../lib/models/Conversation';
import { EmergencyDispatch, AuditLog } from '../lib/models/TelehealthCore';
import Bed from '../lib/models/Bed';
import BedOccupancy from '../lib/models/BedOccupancy';
import Staff from '../lib/models/Staff';
import HospitalAppointment from '../lib/models/HospitalAppointment';
import HospitalTransaction from '../lib/models/HospitalTransaction';
import { PaymentTransaction, Subscription, PaymentMethod, PayoutRequest } from '../lib/models/Billing';
import { Article } from '../lib/models/Article';
import { HealthTip } from '../lib/models/HealthTip';
import { PractitionerSchedule } from '../lib/models/Scheduling';

// --- HELPERS ---
const hash = (pw: string) => bcrypt.hashSync(pw, 10);
const subDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() - n); return r; };
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);
const pickOne = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const generateSAId = (dob: Date, female: boolean) => {
  const y = dob.getFullYear().toString().slice(-2);
  const m = (dob.getMonth() + 1).toString().padStart(2, '0');
  const d = dob.getDate().toString().padStart(2, '0');
  const g = female ? randInt(0, 4999).toString().padStart(4, '0') : randInt(5000, 9999).toString().padStart(4, '0');
  return `${y}${m}${d}${g}081`;
};

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI not found in environment. Please check your .env.local file.");
    process.exit(1);
  }

  console.log("🚀 Connecting to MongoDB...");
  await mongoose.connect(uri);

  const collections = Object.values(mongoose.connection.collections);
  console.log("🧹 Clearing existing data...");
  for (const collection of collections) {
    await collection.deleteMany({});
  }

  const pw = hash("Password123!");

  // ---------- 1. FACILITIES ----------
  console.log("🏥 Seeding Facilities (Hospitals)...");
  
  const coreHospital = await Facility.create({
    name: "Netcare Milpark Hospital",
    facilityType: 'Private',
    address: { street: "9 Guild Rd, Parktown", city: "Johannesburg", province: "Gauteng", coordinates: [28.0315, -26.1802] },
    contactInfo: { phone: "+27 11 480 0000", emergencyPhone: "+27 11 480 0111", email: "info@netcare.co.za" },
    bedCapacity: { total: 300, generalAvailable: 240, icuAvailable: 40 },
    currentWaitTimeMins: 15, isOpen: true,
    specialties: ["Cardiology", "Trauma", "Neurology", "Burn Unit", "Radiology", "Pharmacy"], emergencyServices: true
  });

  const extraHospitals = await Facility.create([
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
    }
  ]);

  const allHospitals = [coreHospital, ...extraHospitals];

  // ---------- 2. USERS & PROFILES ----------
  console.log("👥 Seeding Core Users...");

  // -- Core Patients --
  const thandiweUser = await User.create({ email: "thandiwe.mokoena@example.com", passwordHash: pw, role: 'patient', firstName: "Thandiwe", lastName: "Mokoena", saId: "9005125123081", mobile: "+27 82 111 2222", status: 'active' });
  const johnDUser = await User.create({ email: "john.dlamini@example.com", passwordHash: pw, role: 'patient', firstName: "John", lastName: "Dlamini", saId: "8301155012084", mobile: "+27 71 333 4444", status: 'active' });

  // -- Core Doctors --
  const drMitchellUser = await User.create({ email: "mitchell@247digihealth.com", passwordHash: pw, role: 'practitioner', firstName: "Oliver", lastName: "Mitchell", status: 'active' });
  const drAnkeUser = await User.create({ email: "vwyk@247digihealth.com", passwordHash: pw, role: 'practitioner', firstName: "Anke", lastName: "van Wyk", status: 'active' });

  await PatientProfile.create({ userId: thandiweUser._id, dateOfBirth: new Date(1990, 4, 12), gender: 'female', emergencyContact: { name: "Samuel Mokoena", phone: "+27 82 111 0000", relationship: "Husband" }, medicalAid: { provider: "Discovery Health", planName: "Classic Smart", memberNumber: "DSC123456789" }, subscriptionTier: 'pro', popiaConsentDate: subDays(new Date(), 100), myDoctorIds: [drMitchellUser._id, drAnkeUser._id] });

  await PatientProfile.create({ userId: johnDUser._id, dateOfBirth: new Date(1983, 0, 15), gender: 'male', emergencyContact: { name: "Busi Dlamini", phone: "+27 71 333 0000", relationship: "Sister" }, subscriptionTier: 'pro', popiaConsentDate: subDays(new Date(), 200), myDoctorIds: [drMitchellUser._id] });

  await PractitionerProfile.create({ userId: drMitchellUser._id, specialisation: "General Practitioner", hpcsaNumber: "MP0123456", experienceYears: 12, bio: "Experienced family physician committed to holistic patient care.", languages: ["English", "Afrikaans", "isiZulu"], acceptedMedicalAids: ["Discovery", "Bonitas", "Momentum"], rating: 4.8, reviewCount: 156, isOnline: true, bankAccount: { accountHolder: "Dr O Mitchell", bankName: "FNB", accountNumber: "62822113344", branchCode: "250655", taxNumber: "9123456789" }, affiliatedFacilityIds: [coreHospital._id], assignedPatientIds: [thandiweUser._id, johnDUser._id] });

  await PractitionerProfile.create({ userId: drAnkeUser._id, specialisation: "Cardiologist", hpcsaNumber: "MP0654321", experienceYears: 15, bio: "Specializing in interventional cardiology.", languages: ["English", "Afrikaans", "German"], acceptedMedicalAids: ["Discovery", "Bestmed", "GEMS"], rating: 4.9, reviewCount: 92, isOnline: true, bankAccount: { accountHolder: "Dr A van Wyk Inc", bankName: "Nedbank", accountNumber: "1234567890", branchCode: "198765", taxNumber: "9876543210" }, affiliatedFacilityIds: [coreHospital._id], assignedPatientIds: [thandiweUser._id] });

  // -- Core EMT --
  const emtUser = await User.create({ email: "john.rescuer@247digihealth.com", passwordHash: pw, role: 'emt', firstName: "John", lastName: "Rescuer", status: 'active' });
  await EMTProfile.create({ userId: emtUser._id, licenseLevel: 'ALS', hpcsaNumber: "ANT998877", assignedVehicle: "AMB-101", assignedFacilityId: coreHospital._id, currentStatus: 'available' });

  // -- Core Hospital Admin --
  await User.create({ 
    email: "admin@netcare.co.za", 
    passwordHash: pw, 
    role: 'hospital_admin', 
    firstName: "Sarah", 
    lastName: "Jenkins", 
    status: 'active' 
  });

  // ---------- GENERATE 20 EXTRA PATIENTS ----------
  console.log("👥 Generating 20 Additional Patients...");
  const extraPatUsers = [];
  for (let i = 0; i < 20; i++) {
    const isFemale = faker.datatype.boolean();
    const dob = faker.date.birthdate({ min: 18, max: 75, mode: 'age' });
    const fn = faker.person.firstName(isFemale ? 'female' : 'male');
    const ln = faker.person.lastName();
    
    const user = await User.create({
      email: faker.internet.email({ firstName: fn, lastName: ln }).toLowerCase(),
      passwordHash: pw,
      role: 'patient',
      firstName: fn,
      lastName: ln,
      saId: generateSAId(dob, isFemale),
      mobile: faker.phone.number({ style: 'international' }),
      status: 'active'
    });
    extraPatUsers.push(user);

    await PatientProfile.create({
      userId: user._id,
      dateOfBirth: dob,
      gender: isFemale ? 'female' : 'male',
      emergencyContact: {
        name: faker.person.fullName(),
        phone: faker.phone.number({ style: 'international' }),
        relationship: pickOne(["Spouse", "Parent", "Child", "Sibling"])
      },
      medicalAid: faker.datatype.boolean() ? { provider: pickOne(["Discovery Health", "Bonitas", "GEMS", "Bestmed"]), planName: pickOne(["Classic", "Smart", "Comprehensive"]), memberNumber: faker.string.alphanumeric(10).to() } : undefined,
      subscriptionTier: pickOne(['free', 'pro']),
      popiaConsentDate: subDays(new Date(), randInt(1, 365))
    });
  }

  // ---------- GENERATE 20 EXTRA DOCTORS ----------
  console.log("🩺 Generating 20 Additional Doctors...");
  const extraDocUsers = [];
  const specialisations = ["Pediatrician", "Dermatologist", "Psychiatrist", "Neurologist", "Orthopedic Surgeon", "General Practitioner", "Oncologist", "Endocrinologist", "Gastroenterologist", "Pulmonologist"];
  
  for (let i = 0; i < 20; i++) {
    const fn = faker.person.firstName();
    const ln = faker.person.lastName();
    const spec = pickOne(specialisations);
    
    const user = await User.create({
      email: faker.internet.email({ firstName: fn, lastName: ln, provider: '247digihealth.com' }).toLowerCase(),
      passwordHash: pw,
      role: 'practitioner',
      firstName: fn,
      lastName: ln,
      status: 'active'
    });
    extraDocUsers.push(user);

    await PractitionerProfile.create({
      userId: user._id,
      specialisation: spec,
      hpcsaNumber: "MP" + faker.string.numeric(7),
      experienceYears: randInt(2, 35),
      bio: faker.lorem.paragraph(),
      languages: ["English", pickOne(["Afrikaans", "isiZulu", "Xhosa", "Sotho"])],
      acceptedMedicalAids: ["Discovery", "Bonitas", "Momentum"],
      rating: faker.number.float({ min: 3.5, max: 5.0, fractionDigits: 1 }),
      reviewCount: randInt(5, 500),
      isOnline: faker.datatype.boolean(),
      affiliatedFacilityIds: [pickOne(allHospitals)._id]
    });
  }

  // ---------- GENERATE 5 EXTRA EMTs ----------
  console.log("🚑 Generating 5 Additional EMTs...");
  const extraEmtUsers = [];
  for (let i = 0; i < 5; i++) {
    const fn = faker.person.firstName();
    const ln = faker.person.lastName();
    const user = await User.create({
      email: faker.internet.email({ firstName: fn, lastName: ln, provider: 'rescue.com' }).toLowerCase(),
      passwordHash: pw,
      role: 'emt',
      firstName: fn,
      lastName: ln,
      status: 'active'
    });
    extraEmtUsers.push(user);
    
    await EMTProfile.create({
      userId: user._id,
      licenseLevel: pickOne(['BLS', 'ILS', 'ALS']),
      hpcsaNumber: "ANT" + faker.string.numeric(6),
      assignedVehicle: `AMB-${randInt(100, 999)}`,
      assignedFacilityId: pickOne(allHospitals)._id,
      currentStatus: pickOne(['available', 'offline'])
    });
  }

  const allPatients = [thandiweUser, johnDUser, ...extraPatUsers];
  const allDoctors = [drMitchellUser, drAnkeUser, ...extraDocUsers];
  const allEMTs = [emtUser, ...extraEmtUsers];

  // Randomly assign patients and doctors
  for (const doc of extraDocUsers) {
    const assigned = [];
    for (let j=0; j<5; j++) assigned.push(pickOne(allPatients)._id);
    await PractitionerProfile.updateOne({ userId: doc._id }, { $set: { assignedPatientIds: assigned } });
  }

  for (const pat of extraPatUsers) {
    const assignedDocs = [];
    for (let j=0; j<3; j++) assignedDocs.push(pickOne(allDoctors)._id);
    await PatientProfile.updateOne({ userId: pat._id }, { $set: { myDoctorIds: assignedDocs } });
  }

  // ---------- CLINICAL DATA FOR CORE PATIENTS ----------
  console.log("📋 Seeding Core Clinical Data...");
  await MedicalContext.create({ patientId: thandiweUser._id, chronicConditions: ["Hypertension", "Mild Asthma"], allergies: [{ allergen: "Penicillin", severity: "severe", reaction: "Anaphylaxis", source: "clinician" }], currentMedications: ["Amlodipine 5mg", "Salbutamol Inhaler"] });
  await MedicalContext.create({ patientId: johnDUser._id, chronicConditions: ["Type 2 Diabetes"], allergies: [{ allergen: "Peanuts", severity: "mild", reaction: "Rash", source: "patient" }], currentMedications: ["Metformin 500mg"] });

  for (let i = 6; i >= 0; i--) {
    await Anthropometric.create({ patientId: thandiweUser._id, dateRecorded: subDays(new Date(), i * 30), heightCm: 165, weightKg: 72 - (i * 0.5), bmi: 26.4, vitalSigns: { systolicBP: 130 + randInt(-5, 5), diastolicBP: 85 + randInt(-3, 3), heartRateBpm: 72 + randInt(-4, 4), spO2: 98 + randInt(-1, 1), temperatureCelsius: 36.6 } });
    await Anthropometric.create({ patientId: johnDUser._id, dateRecorded: subDays(new Date(), i * 30), heightCm: 180, weightKg: 88 + (i * 0.2), bmi: 27.2, vitalSigns: { systolicBP: 135 + randInt(-4, 4), diastolicBP: 88 + randInt(-3, 3), heartRateBpm: 78 + randInt(-5, 5), spO2: 97 + randInt(-1, 1), temperatureCelsius: 36.7 } });
  }

  // Give extra patients baseline clinical data
  for (const pat of extraPatUsers) {
    if (Math.random() > 0.5) {
      await MedicalContext.create({ patientId: pat._id, chronicConditions: [pickOne(["Asthma", "Hypertension", "Arthritis"])] });
    }
  }

  // ---------- CONSULTATIONS (Scale up to 100) ----------
  console.log("📞 Seeding Consultations...");
  const consultsToCreate = [];
  for (let i = 0; i < 100; i++) {
    const isPast = Math.random() > 0.2;
    const pat = pickOne(allPatients);
    const doc = pickOne(allDoctors);
    const fac = pickOne(allHospitals);
    const date = isPast ? subDays(new Date(), randInt(1, 90)) : addDays(new Date(), randInt(1, 30));
    const status = isPast 
      ? (Math.random() > 0.1 ? 'completed' : 'cancelled') 
      : (Math.random() > 0.3 ? 'scheduled' : pickOne(['requested', 'pending']));
    
    // Generate realistic Clinical Risk for 30% of consultations
    const hasRisk = Math.random() > 0.7;
    const riskScore = hasRisk ? randInt(20, 95) : undefined;
    const riskColor = riskScore ? (riskScore > 75 ? 'red' : riskScore > 40 ? 'amber' : 'green') : undefined;
    const riskFactors = riskScore ? [
      pickOne(["High Blood Pressure", "Irregular Pulse", "Elevated Glucose", "Respiratory Distress"]),
      pickOne(["Family History", "Smoking", "Sedentary Lifestyle"])
    ] : [];

    consultsToCreate.push({
      patientId: pat._id,
      practitionerId: doc._id,
      facilityId: fac._id,
      type: pickOne(['video', 'chat', 'in_person']),
      status,
      scheduledStartTime: date,
      scheduledEndTime: new Date(date.getTime() + 30 * 60000),
      chiefComplaint: faker.lorem.sentence(),
      clinicalRisk: riskScore ? { score: riskScore, color: riskColor as any, factors: riskFactors } : undefined,
      soapNotes: status === 'completed' ? { 
        subjective: faker.lorem.paragraph(), 
        objective: "Vitals stable, normal heart sounds.", 
        assessment: "Patient showing signs of improvement.", 
        plan: "Continue current meds, follow up in 2 weeks.",
        signedAt: new Date(date.getTime() + 45 * 60000)
      } : undefined
    });
  }
  await Consultation.insertMany(consultsToCreate);

  // ---------- SECURE MESSAGING ----------
  console.log("💬 Seeding Messages...");
  for (let i=0; i<10; i++) {
    const pat = pickOne(allPatients);
    const doc = pickOne(allDoctors);
    const conv = await Conversation.create({ patientId: pat._id, practitionerId: doc._id, status: 'active', startedAt: subDays(new Date(), randInt(1,30)), minutesAllocated: 30 });
    for(let k=0; k<5; k++) {
        await Message.create({
            conversationId: conv._id, senderId: k%2===0 ? pat._id : doc._id, receiverId: k%2===0 ? doc._id : pat._id, content: faker.lorem.sentence(), isRead: true, createdAt: subDays(new Date(), 5-k)
        });
    }
  }

  // ---------- REALISTIC ENGLISH HEALTH ARTICLES ----------
  console.log("✍️ Seeding Health Articles & Tips...");
  await Article.create([
    {
      title: "Understanding Cardiovascular Health in the Modern Era",
      slug: "understanding-cardiovascular-health-modern-era",
      excerpt: "Heart disease remains a global challenge, but modern proactive measures and digital monitoring can dramatically improve lifespan and quality of life.",
      content: `<h2>The Heart of the Matter</h2>
      <p>Cardiovascular diseases (CVDs) remain the leading cause of death globally. Modern lifestyles, characterized by sedentary jobs, processed foods, and high stress, contribute significantly to these risks. However, the paradigm is shifting from reactive treatment to proactive prevention.</p>
      <h3>Digital Health & Vitals</h3>
      <p>Through consistent monitoring of blood pressure, heart rate variability, and BMI, patients can now prevent major cardiac events. Platforms like 24/7 DigiHealth allow patients and practitioners to spot trends early, adjusting lifestyle or medications before an emergency arises.</p>
      <h3>Key Takeaways for Daily Life</h3>
      <ul>
        <li>Incorporate 30 minutes of moderate aerobic activity daily.</li>
        <li>Monitor your sodium intake, prioritizing natural foods.</li>
        <li>Log your vitals consistently if you have a family history of CVD.</li>
      </ul>
      <p>Remember, your heart is a muscle, and treating it with care is a daily commitment.</p>`,
      coverImage: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&q=80&w=800",
      author: "Dr. Anke van Wyk",
      tags: ["Cardiology", "Wellness", "Preventative Care"],
      likes: 342,
      isPublished: true,
      publishedAt: subDays(new Date(), 10)
    },
    {
      title: "Managing Type 2 Diabetes: A Holistic Approach",
      slug: "managing-type-2-diabetes-holistic",
      excerpt: "Diabetes management is not just about insulin; it's about a complete lifestyle recalibration encompassing diet, mental health, and physical activity.",
      content: `<h2>Beyond the Numbers</h2>
      <p>While monitoring HbA1c is critical, true management of Type 2 Diabetes requires a comprehensive overhaul of habits. It's an interplay of nutrition, daily routine, and clinical guidance.</p>
      <p>Consultations, continuous glucose monitors (CGMs), and prompt telehealth reporting have changed the landscape. You are no longer alone in this journey. Regular check-ins via video call ensure tight adherence to dietary plans and rapid adjustment of metadata.</p>`,
      coverImage: "https://images.unsplash.com/photo-1584308666744-24d5e44299ec?auto=format&fit=crop&q=80&w=800",
      author: "Dr. Oliver Mitchell",
      tags: ["Endocrinology", "Diabetes", "Diet"],
      likes: 128,
      isPublished: true,
      publishedAt: subDays(new Date(), 5)
    }
  ]);

  for (let i = 0; i < 15; i++) {
    await HealthTip.create({
      title: pickOne(["Drink More Water", "Stretch Daily", "Limit Screen Time", "Walk for 20 Mins", "Prioritize Sleep", "Check Your Posture", "Eat More Greens"]),
      excerpt: faker.lorem.sentence(),
      content: faker.lorem.paragraph(),
      author: pickOne(["Dr. Mitchell", "Dr. van Wyk", "Dr. Dlamini", "Dr. Botha"]),
      date: subDays(new Date(), i).toISOString().split('T')[0],
      readTime: "1 min", tag: "Daily Tip", category: 'tip'
    });
  }

  // ---------- 10. BILLING DATA (Transactions & Subs) ----------
  console.log("💳 Seeding Billing Data...");
  for (const pat of allPatients) {
    const tier = pickOne(['free', 'pro', 'family']);
    const prices: any = { free: 0, pro: 299, family: 499 };
    
    // 10a. Subscription
    await Subscription.create({
      patientId: pat._id,
      tier,
      status: 'active',
      startDate: subDays(new Date(), randInt(30, 200)),
      nextBillingDate: addDays(new Date(), randInt(5, 25)),
      autoRenew: true,
      price: prices[tier]
    });

    // 10b. Payment Methods
    await PaymentMethod.create({
      patientId: pat._id,
      type: 'card',
      isDefault: true,
      cardBrand: pickOne(['Visa', 'Mastercard']),
      last4: faker.string.numeric(4),
      expiryMonth: randInt(1, 12),
      expiryYear: 2027
    });

    if (Math.random() > 0.6) {
      await PaymentMethod.create({
        patientId: pat._id,
        type: 'medical_aid',
        isDefault: false,
        medicalAidProvider: pickOne(['Discovery Health', 'Bonitas', 'GEMS']),
        medicalAidNumber: faker.string.alphanumeric(10).to()
      });
    }

    // 10c. Transactions
    const txnTypes: Array<'service_booking' | 'subscription' | 'procedure' | 'pharmacy' | 'lab'> = ['service_booking', 'subscription', 'pharmacy'];
    const count = randInt(3, 8);
    for (let j = 0; j < count; j++) {
      const amount = randInt(150, 2500);
      const cat = pickOne(txnTypes);
      await PaymentTransaction.create({
        patientId: pat._id,
        practitionerId: pickOne(allDoctors)._id,
        amount,
        currency: 'ZAR',
        provider: pickOne(['card', 'medical_aid', 'eft']),
        status: pickOne(['completed', 'completed', 'completed', 'pending', 'failed']),
        description: `${cat.replace('_', ' ')} payment`,
        category: cat,
        timestamp: subDays(new Date(), randInt(1, 120)),
        platformFeeAmount: amount * 0.15,
        practitionerEarnings: amount * 0.85
      });
    }
  }

  // 10d. Payout Requests for Doctors
  for (const doc of allDoctors) {
    if (Math.random() > 0.3) {
      await PayoutRequest.create({
        practitionerId: doc._id,
        amount: randInt(5000, 25000),
        status: pickOne(['paid', 'pending', 'approved']),
        requestedAt: subDays(new Date(), randInt(1, 30)),
        bankAccount: {
          accountHolder: `Dr. ${doc.lastName}`,
          bankName: pickOne(['FNB', 'Standard Bank', 'Nedbank', 'Absa']),
          accountNumber: faker.string.numeric(10),
          branchCode: faker.string.numeric(6)
        },
        periodFrom: subDays(new Date(), 60),
        periodTo: subDays(new Date(), 30),
        consultationCount: randInt(10, 50),
        platformFeeDeducted: randInt(500, 2000)
      });
    }
  }

  console.log("✅ Custom Dense Seeding Completed Successfully!");
  process.exit(0);
}

seed().catch(err => {
  console.error("\n❌ SEED FAILED:");
  console.error(err);
  process.exit(1);
});
