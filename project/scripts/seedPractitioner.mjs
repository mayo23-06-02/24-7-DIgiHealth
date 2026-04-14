/**
 * seedPractitioner.mjs — Practitioner dashboard seed script
 * 
 * Uses the LIVE schema from seed.ts (User, PatientProfile, PractitionerProfile, Consultation, Billing, etc.)
 * Links to ALL existing data seeded by seed.ts (patients, facilities, prescriptions, labs)
 * 
 * Run: node --env-file=.env.local scripts/seedPractitioner.mjs
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not set. Run with: node --env-file=.env.local scripts/seedPractitioner.mjs');
  process.exit(1);
}

// ─── Schemas matching seed.ts & lib/models ─────────────────────────────────

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: String,
  role: String,
  status: { type: String, default: 'active' },
  firstName: String,
  lastName: String,
  saId: { type: String, sparse: true },
  mobile: String,
  mfaEnabled: { type: Boolean, default: false },
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
}, { timestamps: true });

const PatientProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dateOfBirth: Date,
  gender: String,
  emergencyContact: { name: String, phone: String, relationship: String },
  medicalAid: { provider: String, planName: String, memberNumber: String },
  subscriptionTier: String,
  popiaConsentDate: Date,
}, { timestamps: true });

const PractitionerProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  specialisation: String,
  hpcsaNumber: String,
  experienceYears: Number,
  consultationFee: Number,
  bio: String,
  languages: [String],
  acceptedMedicalAids: [String],
  affiliatedFacilityIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Facility' }],
  isOnline: Boolean,
  bankAccount: {
    accountHolder: String,
    bankName: String,
    accountNumber: String,
    branchCode: String,
    taxNumber: String,
  },
}, { timestamps: true });

const ConsultationSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  practitionerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  type: { type: String, enum: ['video', 'chat', 'in_person'], required: true },
  status: { type: String, enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'pending'], default: 'scheduled' },
  scheduledStartTime: { type: Date, required: true },
  scheduledEndTime: { type: Date, required: true },
  chiefComplaint: String,
  clinicalRisk: {
    score: Number,
    color: { type: String, enum: ['green', 'amber', 'red'] },
    factors: [String],
  },
  soapNotes: {
    subjective: String,
    objective: String,
    assessment: String,
    plan: String,
    signedAt: Date,
  },
}, { timestamps: true });

const BillingSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  practitionerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  consultationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation' },
  amount: Number,
  type: String,
  status: String,
  paymentMethod: String,
  date: { type: Date, default: Date.now },
  invoiceNumber: String,
}, { timestamps: true });

const MedicalContextSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  chronicConditions: [String],
  allergies: [{ allergen: String, severity: String, reaction: String, source: String }],
  familyHistory: [String],
}, { timestamps: true });

const FacilitySchema = new mongoose.Schema({
  name: String,
  facilityType: String,
  address: { street: String, city: String, province: String },
  specialties: [String],
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const PatientProfile = mongoose.models.PatientProfile || mongoose.model('PatientProfile', PatientProfileSchema);
const PractitionerProfile = mongoose.models.PractitionerProfile || mongoose.model('PractitionerProfile', PractitionerProfileSchema);
const Consultation = mongoose.models.Consultation || mongoose.model('Consultation', ConsultationSchema);
const Billing = mongoose.models.Billing || mongoose.model('Billing', BillingSchema);
const MedicalContext = mongoose.models.MedicalContext || mongoose.model('MedicalContext', MedicalContextSchema);
const Facility = mongoose.models.Facility || mongoose.model('Facility', FacilitySchema);

// ─── Seed Data Arrays ──────────────────────────────────────────────────────

const CONDITIONS = ['Hypertension', 'Type 2 Diabetes', 'Asthma', 'Coronary Artery Disease', 'Anxiety', 'Depression', 'HIV (controlled)', 'COPD', 'CKD Stage 3'];
const COMPLAINTS = [
  'Persistent headache and dizziness',
  'Chest pain and shortness of breath',
  'Asthma follow-up and medication review',
  'Blood pressure management',
  'Anxiety and sleep disturbance',
  'Diabetes glucose monitoring review',
  'HIV viral load check',
  'Chronic kidney disease follow-up',
  'COPD exacerbation – breathing difficulty',
  'General wellness check',
  'Medication side effects review',
  'Cardiac risk assessment',
];

const AI_RECS = {
  green: ['Continue current regimen', 'Follow up in 4 weeks', 'Monitor blood pressure daily'],
  amber: ['Review medication adherence', 'Order HbA1c test', 'Schedule specialist referral'],
  red: ['Urgent cardiology referral', 'Immediate ECG review', 'Troponin levels', 'Emergency admission may be required'],
};

const SOAP = [
  {
    subjective: 'Patient reports persistent chest tightness for 2 days, worse on exertion.',
    objective: 'BP 158/96mmHg, HR 92bpm, SpO2 97%, ECG shows sinus tachycardia.',
    assessment: 'Hypertensive urgency with possible angina. Risk score 84/100.',
    plan: 'Increase Amlodipine to 10mg. Rest. Cardiology referral. Follow up in 48hrs.',
  },
  {
    subjective: 'Patient reports worsening shortness of breath on minimal exertion over 3 days.',
    objective: 'SpO2 91% on room air, HR 110bpm, bilateral crackles on auscultation.',
    assessment: 'COPD exacerbation with possible early heart failure.',
    plan: 'Nebulised Salbutamol. Prednisolone 5-day course. Chest X-ray. Hospital admission if SpO2 < 90%.',
  },
  {
    subjective: 'Patient presents with high fasting glucose readings averaging 14–17 mmol/L over past week.',
    objective: 'Weight 88kg, HbA1c 9.2% (latest), BP 130/82mmHg.',
    assessment: 'Poorly controlled Type 2 Diabetes. Risk score 62/100.',
    plan: 'Increase Metformin to 1000mg BD. Add Empagliflozin 10mg OD. Dietary counselling. Review in 4 weeks.',
  },
];

const randItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const subtractDays = (d) => new Date(Date.now() - d * 86400000);
const addDays = (d) => new Date(Date.now() + d * 86400000);
const addHours = (h) => new Date(Date.now() + h * 3600000);
function riskColor(score) {
  if (score < 30) return 'green';
  if (score <= 70) return 'amber';
  return 'red';
}

// ─── Main Seed ─────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // ── 1. Get existing data from seed.ts ──────────────────────────────────

  const existingPatients = await User.find({ role: 'patient' }).lean();
  const existingFacilities = await Facility.find().lean();

  if (existingPatients.length === 0) {
    console.error('❌ No patients found! Please run `npx ts-node --env-file=.env.local scripts/seed.ts` first.');
    process.exit(1);
  }
  console.log(`📋 Found ${existingPatients.length} existing patients`);
  console.log(`🏥 Found ${existingFacilities.length} existing facilities`);

  const facility0 = existingFacilities[0];

  // ── 2. Ensure Primary Practitioner exists ──────────────────────────────

  let primaryPractitioner = await User.findOne({ email: 'practitioner@24-7.co.za' }).lean();
  if (!primaryPractitioner) {
    primaryPractitioner = await User.create({
      email: 'practitioner@24-7.co.za',
      passwordHash: '$2b$10$examplehash1',
      role: 'practitioner',
      status: 'active',
      firstName: 'Oliver',
      lastName: 'Mitchell',
      mobile: '+27821234567',
      mfaEnabled: false,
    });
    console.log(`👨‍⚕️ Created primary practitioner: practitioner@24-7.co.za`);
  } else {
    console.log(`👨‍⚕️ Found existing practitioner: practitioner@24-7.co.za (${primaryPractitioner._id})`);
  }

  const practId = primaryPractitioner._id;

  // ── 3. Ensure PractitionerProfile exists ───────────────────────────────

  let pratProfile = await PractitionerProfile.findOne({ userId: practId }).lean();
  if (!pratProfile) {
    pratProfile = await PractitionerProfile.create({
      userId: practId,
      specialisation: 'General Practitioner',
      hpcsaNumber: 'MP0123456',
      experienceYears: 12,
      consultationFee: 650,
      bio: 'Experienced GP specialising in chronic disease management and preventive care in telehealth environments.',
      languages: ['English', 'Afrikaans'],
      acceptedMedicalAids: ['Discovery', 'Momentum'],
      affiliatedFacilityIds: facility0 ? [facility0._id] : [],
      isOnline: true,
      bankAccount: {
        accountHolder: 'Oliver Mitchell',
        bankName: 'FNB',
        accountNumber: '62000123456',
        branchCode: '250655',
        taxNumber: '1234567890',
      },
    });
    console.log('📋 Created PractitionerProfile for Oliver Mitchell');
  }

  // ── 4. Clear existing consultations for this practitioner & billing ─────

  const deletedConsults = await Consultation.deleteMany({ practitionerId: practId });
  const deletedBilling = await Billing.deleteMany({ practitionerId: practId });
  console.log(`🗑️  Cleared ${deletedConsults.deletedCount} old consultations, ${deletedBilling.deletedCount} billing records`);

  // ── 5. Create Consultations: 15 Upcoming + 5 Pending + 80 Historical ───

  const createdConsults = [];
  const patientIds = existingPatients.map(p => p._id);
  const facilityId = facility0?._id || null;

  // 5a. Upcoming (next 14 days)
  for (let i = 0; i < 15; i++) {
    const daysAhead = randInt(1, 14);
    const hour = randInt(8, 17);
    const min = randItem([0, 30]);
    const start = new Date(addDays(daysAhead));
    start.setHours(hour, min, 0, 0);
    const end = new Date(start.getTime() + 30 * 60000);
    const score = randInt(10, 90);

    const c = await Consultation.create({
      patientId: randItem(patientIds),
      practitionerId: practId,
      facilityId,
      type: randItem(['video', 'chat', 'in_person']),
      status: 'scheduled',
      scheduledStartTime: start,
      scheduledEndTime: end,
      chiefComplaint: randItem(COMPLAINTS),
      clinicalRisk: { score, color: riskColor(score), factors: ['Symptom monitoring', 'Follow-up care'] },
    });
    createdConsults.push(c);
  }
  console.log('📅 Created 15 upcoming consultations');

  // 5b. Pending requests
  for (let i = 0; i < 5; i++) {
    const start = addDays(randInt(1, 7));
    const end = new Date(start.getTime() + 30 * 60000);

    await Consultation.create({
      patientId: randItem(patientIds),
      practitionerId: practId,
      facilityId,
      type: randItem(['video', 'in_person']),
      status: 'pending',
      scheduledStartTime: start,
      scheduledEndTime: end,
      chiefComplaint: randItem(['New patient follow-up', 'Urgent consultation request', 'Prescription renewal']),
    });
  }
  console.log('📨 Created 5 pending appointment requests');

  // 5c. Historical (last 365 days) — 80 completed + 15 cancelled
  const historicalData = [
    ...Array.from({ length: 80 }, () => ({ status: 'completed', daysAgo: randInt(1, 365), hasSoap: Math.random() > 0.3 })),
    ...Array.from({ length: 15 }, () => ({ status: 'cancelled', daysAgo: randInt(1, 180), hasSoap: false })),
  ];

  for (const h of historicalData) {
    const start = subtractDays(h.daysAgo);
    start.setHours(randInt(8, 17), randItem([0, 30]), 0, 0);
    const end = new Date(start.getTime() + 30 * 60000);
    const score = randInt(5, 98);

    const soap = h.hasSoap ? randItem(SOAP) : undefined;
    const patId = randItem(patientIds);

    const c = await Consultation.create({
      patientId: patId,
      practitionerId: practId,
      facilityId,
      type: randItem(['video', 'chat', 'in_person']),
      status: h.status,
      scheduledStartTime: start,
      scheduledEndTime: end,
      chiefComplaint: randItem(COMPLAINTS),
      clinicalRisk: { score, color: riskColor(score), factors: AI_RECS[riskColor(score)] },
      ...(soap ? {
        soapNotes: {
          subjective: soap.subjective,
          objective: soap.objective,
          assessment: soap.assessment,
          plan: soap.plan,
          signedAt: end,
        }
      } : {}),
    });
    createdConsults.push(c);

    // Create billing record for completed consultations
    if (h.status === 'completed') {
      await Billing.create({
        patientId: patId,
        practitionerId: practId,
        consultationId: c._id,
        amount: randInt(350, 950),
        type: randItem(['video', 'chat', 'in_person']),
        status: Math.random() > 0.15 ? 'paid' : 'pending',
        paymentMethod: randItem(['medical_aid', 'card', 'cash']),
        date: start,
        invoiceNumber: `INV-${Date.now()}-${randInt(1000, 9999)}`,
      });
    }
  }
  console.log('📊 Created 95 historical consultations (80 completed + 15 cancelled)');

  // ── 6. Enrich MedicalContext for patients that don't have it ───────────

  for (const p of existingPatients.slice(0, 10)) {
    const existing = await MedicalContext.findOne({ patientId: p._id });
    if (!existing) {
      await MedicalContext.create({
        patientId: p._id,
        chronicConditions: randItem([[CONDITIONS[0], CONDITIONS[1]], [CONDITIONS[2]], [CONDITIONS[4]], []]),
        allergies: [
          { allergen: randItem(['Penicillin', 'Aspirin', 'Ibuprofen', 'Latex']), severity: randItem(['mild', 'moderate', 'severe']), reaction: 'Rash', source: 'clinician' }
        ],
        familyHistory: randItem([['Heart Disease', 'Diabetes'], ['Stroke'], ['Cancer', 'Hypertension'], []]),
      });
    }
  }
  console.log('🩺 Enriched MedicalContext for patients');

  // ── 7. Print summary ───────────────────────────────────────────────────

  console.log('\n✅ Practitioner Seeding Complete!\n');
  console.log('📋 Primary Practitioner Login:');
  console.log(`   Email    : practitioner@24-7.co.za`);
  console.log(`   Password : Password123!`);
  console.log(`   ID       : ${practId}`);
  console.log('\n💡 Add to .env.local:');
  console.log(`   MOCK_PRACTITIONER_ID=${practId}`);
  console.log(`\n📊 Data created linked to ${existingPatients.length} existing patients across ${existingFacilities.length} facilities`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
