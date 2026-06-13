/**
 * seed-personas.mjs
 * Seeds Thandiwe Mokoena (patient) and Dr. Oliver Mitchell (practitioner)
 * with full dashboard-ready data: profiles, vitals history, consultations.
 *
 * Run: node --env-file=.env scripts/seed-personas.mjs
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

// ─── Inline Schemas ────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['patient', 'practitioner', 'hospital_admin', 'inspector', 'super_admin', 'mega_admin'] },
  status: { type: String, default: 'active' },
  firstName: String,
  lastName: String,
  saId: { type: String, sparse: true, unique: true },
  mobile: String,
  mfaEnabled: { type: Boolean, default: false },
}, { timestamps: true });

const PatientProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  emergencyContact: { name: String, phone: String, relationship: String },
  medicalAid: { provider: String, planName: String, memberNumber: String },
  subscriptionTier: { type: String, enum: ['free', 'pro'], default: 'free' },
  popiaConsentDate: Date,
  favoritePractitionerIds: [{ type: mongoose.Schema.Types.ObjectId }],
  myDoctorIds: [{ type: mongoose.Schema.Types.ObjectId }],
  profilePhoto: String,
  medicalDocuments: [String],
});

const PractitionerProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  specialisation: { type: String, required: true },
  hpcsaNumber: { type: String, required: true, unique: true },
  experienceYears: Number,
  bio: String,
  languages: [String],
  acceptedMedicalAids: [String],
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  achievements: [String],
  reviews: [{ reviewer: String, rating: Number, comment: String, date: { type: Date, default: Date.now } }],
  affiliatedFacilityIds: [{ type: mongoose.Schema.Types.ObjectId }],
  assignedPatientIds: [{ type: mongoose.Schema.Types.ObjectId }],
  isOnline: { type: Boolean, default: false },
  profilePhoto: String,
  bankAccount: { accountHolder: String, bankName: String, accountNumber: String, branchCode: String, taxNumber: String },
  address: { street: String, city: String, province: String },
});

const AnthropometricSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dateRecorded: { type: Date, default: Date.now },
  heightCm: Number,
  weightKg: Number,
  bmi: Number,
  bloodType: String,
  vitalSigns: {
    systolicBP: Number,
    diastolicBP: Number,
    heartRateBpm: Number,
    oxygenSaturation: Number,
    temperatureCelsius: Number,
    bloodGlucose: Number,
    bloodPressure: String,
  },
});
AnthropometricSchema.index({ patientId: 1, dateRecorded: -1 });

const MedicalContextSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  chronicConditions: [String],
  allergies: [{ allergen: String, severity: String, reaction: String, source: String }],
  currentMedications: [{ name: String, dosage: String, frequency: String }],
  familyHistory: [{ condition: String, relative: String }],
}, { timestamps: true });

const ConsultationSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  practitionerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  type: { type: String, enum: ['video', 'chat', 'in_person'], required: true },
  status: { type: String, enum: ['requested', 'pending', 'scheduled', 'in_progress', 'completed', 'cancelled'], default: 'requested' },
  scheduledStartTime: { type: Date, required: true },
  scheduledEndTime: { type: Date, required: true },
  chiefComplaint: String,
  clinicalRisk: { score: Number, color: { type: String, enum: ['green', 'gray', 'red'] }, factors: [String] },
  soapNotes: { subjective: String, objective: String, assessment: String, plan: String, signedAt: Date },
  aiRecommendations: [String],
  callMinutesUsed: { type: Number, default: 0 },
}, { timestamps: true });

// ─── Helpers ───────────────────────────────────────────────────────────────────

const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const hoursFromNow = (h) => new Date(Date.now() + h * 3600000);

// ─── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const User              = mongoose.models.User              || mongoose.model('User', UserSchema);
  const PatientProfile    = mongoose.models.PatientProfile    || mongoose.model('PatientProfile', PatientProfileSchema);
  const PractitionerProfile = mongoose.models.PractitionerProfile || mongoose.model('PractitionerProfile', PractitionerProfileSchema);
  const Anthropometric    = mongoose.models.Anthropometric    || mongoose.model('Anthropometric', AnthropometricSchema);
  const MedicalContext    = mongoose.models.MedicalContext    || mongoose.model('MedicalContext', MedicalContextSchema);
  const Consultation      = mongoose.models.Consultation      || mongoose.model('Consultation', ConsultationSchema);

  const NETCARE_FACILITY_ID = new mongoose.Types.ObjectId('69e0ff09e48803eda16eabce');
  const hash = await bcrypt.hash('Password123!', 10);

  // ── 1. Clean up previous bare users we created ──────────────────────────────
  const oldThandiwe = await User.findOneAndDelete({ email: 'thandiwe.mokoena@example.com' });
  const oldOliver   = await User.findOneAndDelete({ email: 'mitchell@247digihealth.com' });
  if (oldThandiwe) {
    await PatientProfile.deleteOne({ userId: oldThandiwe._id });
    await Anthropometric.deleteMany({ patientId: oldThandiwe._id });
    await MedicalContext.deleteOne({ patientId: oldThandiwe._id });
    await Consultation.deleteMany({ patientId: oldThandiwe._id });
    console.log('Cleaned up old Thandiwe records');
  }
  if (oldOliver) {
    await PractitionerProfile.deleteOne({ userId: oldOliver._id });
    console.log('Cleaned up old Oliver user');
  }

  // ── 2. Create Users ──────────────────────────────────────────────────────────
  const thandiwe = await User.create({
    email: 'thandiwe.mokoena@example.com',
    passwordHash: hash,
    role: 'patient',
    status: 'active',
    firstName: 'Thandiwe',
    lastName: 'Mokoena',
    saId: '9003125678087',
    mobile: '+27632342761',
    mfaEnabled: false,
  });
  console.log('Created patient Thandiwe:', thandiwe._id);

  const oliver = await User.create({
    email: 'mitchell@247digihealth.com',
    passwordHash: hash,
    role: 'practitioner',
    status: 'active',
    firstName: 'Oliver',
    lastName: 'Mitchell',
    mobile: '+27110000001',
    mfaEnabled: false,
  });
  console.log('Created practitioner Oliver:', oliver._id);

  // ── 3. Patient Profile ───────────────────────────────────────────────────────
  await PatientProfile.create({
    userId: thandiwe._id,
    dateOfBirth: new Date('1990-03-12'),
    gender: 'female',
    emergencyContact: { name: 'Sipho Mokoena', phone: '+27711358832', relationship: 'Spouse' },
    medicalAid: { provider: 'Discovery Health', planName: 'Classic Smart', memberNumber: 'DH982341' },
    subscriptionTier: 'pro',
    popiaConsentDate: new Date(),
    myDoctorIds: [oliver._id],
  });
  console.log('Created PatientProfile for Thandiwe');

  // ── 4. Practitioner Profile ──────────────────────────────────────────────────
  // Update the existing seeded profile (hpcsaNumber MP0123456) to point to Oliver's new user
  const existingPracProfile = await PractitionerProfile.findOne({ hpcsaNumber: 'MP0123456' });
  if (existingPracProfile) {
    existingPracProfile.userId = oliver._id;
    existingPracProfile.isOnline = true;
    existingPracProfile.assignedPatientIds = [thandiwe._id];
    await existingPracProfile.save();
    console.log('Updated existing PractitionerProfile -> linked to Oliver user');
  } else {
    await PractitionerProfile.create({
      userId: oliver._id,
      specialisation: 'General Practitioner',
      hpcsaNumber: 'MP0123456',
      experienceYears: 12,
      bio: 'Experienced family physician committed to holistic patient care.',
      languages: ['English', 'Afrikaans', 'isiZulu'],
      acceptedMedicalAids: ['Discovery', 'Bonitas', 'Momentum'],
      rating: 4.8,
      reviewCount: 156,
      affiliatedFacilityIds: [NETCARE_FACILITY_ID],
      assignedPatientIds: [thandiwe._id],
      isOnline: true,
      bankAccount: {
        accountHolder: 'Dr O Mitchell',
        bankName: 'FNB',
        accountNumber: '62822113344',
        branchCode: '250655',
        taxNumber: '9123456789',
      },
      address: { street: '9 Guild Rd', city: 'Johannesburg', province: 'Gauteng' },
    });
    console.log('Created new PractitionerProfile for Oliver');
  }

  // ── 5. Vitals history (6 records over ~3 months for trends + charts) ─────────
  const vitalsHistory = [
    { daysBack: 90, weightKg: 78.2, systolic: 138, diastolic: 90, hr: 82, glucose: 8.4, temp: 36.6, o2: 97 },
    { daysBack: 60, weightKg: 77.5, systolic: 135, diastolic: 88, hr: 79, glucose: 7.9, temp: 36.7, o2: 97 },
    { daysBack: 45, weightKg: 76.8, systolic: 132, diastolic: 86, hr: 77, glucose: 7.5, temp: 36.5, o2: 98 },
    { daysBack: 30, weightKg: 76.1, systolic: 130, diastolic: 84, hr: 75, glucose: 7.2, temp: 36.6, o2: 98 },
    { daysBack: 14, weightKg: 75.5, systolic: 128, diastolic: 82, hr: 74, glucose: 6.9, temp: 36.4, o2: 99 },
    { daysBack: 3,  weightKg: 74.9, systolic: 126, diastolic: 80, hr: 72, glucose: 6.6, temp: 36.5, o2: 99 },
  ];

  for (const v of vitalsHistory) {
    const heightCm = 163;
    const bmi = parseFloat((v.weightKg / (heightCm / 100) ** 2).toFixed(1));
    await Anthropometric.create({
      patientId: thandiwe._id,
      dateRecorded: daysAgo(v.daysBack),
      heightCm,
      weightKg: v.weightKg,
      bmi,
      bloodType: 'A+',
      vitalSigns: {
        systolicBP: v.systolic,
        diastolicBP: v.diastolic,
        bloodPressure: `${v.systolic}/${v.diastolic}`,
        heartRateBpm: v.hr,
        bloodGlucose: v.glucose,
        temperatureCelsius: v.temp,
        oxygenSaturation: v.o2,
      },
    });
  }
  console.log('Created 6 vitals records for Thandiwe');

  // ── 6. Medical Context ────────────────────────────────────────────────────────
  await MedicalContext.create({
    patientId: thandiwe._id,
    chronicConditions: ['Hypertension', 'Mild Asthma'],
    allergies: [
      { allergen: 'Penicillin', severity: 'severe', reaction: 'Anaphylaxis', source: 'patient' },
      { allergen: 'Dust mites', severity: 'mild', reaction: 'Rhinitis', source: 'patient' },
    ],
    currentMedications: [
      { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily' },
      { name: 'Salbutamol inhaler', dosage: '100mcg', frequency: 'As needed' },
    ],
    familyHistory: [
      { condition: 'Hypertension', relative: 'Mother' },
      { condition: 'Type 2 Diabetes', relative: 'Father' },
    ],
  });
  console.log('Created MedicalContext for Thandiwe');

  // ── 7. Consultations ──────────────────────────────────────────────────────────
  const consultations = [
    // Completed - past
    {
      type: 'video', status: 'completed',
      scheduledStartTime: daysAgo(45), scheduledEndTime: new Date(daysAgo(45).getTime() + 30 * 60000),
      chiefComplaint: 'Persistent headache and elevated blood pressure',
      clinicalRisk: { score: 65, color: 'red', factors: ['Hypertension', 'Elevated BP readings'] },
      soapNotes: {
        subjective: 'Patient reports persistent headaches for 5 days. BP readings at home averaging 140/90.',
        objective: 'BP 138/90 mmHg, HR 82 bpm. Alert and oriented. No papilloedema.',
        assessment: 'Poorly controlled hypertension. Tension-type headaches secondary to elevated BP.',
        plan: 'Increase Amlodipine to 10mg. Monitor BP twice daily. Follow up in 4 weeks.',
        signedAt: daysAgo(44),
      },
      aiRecommendations: ['Consider ACE inhibitor addition', 'Lifestyle modification: reduce sodium intake'],
      callMinutesUsed: 28,
    },
    {
      type: 'chat', status: 'completed',
      scheduledStartTime: daysAgo(30), scheduledEndTime: new Date(daysAgo(30).getTime() + 20 * 60000),
      chiefComplaint: 'Asthma follow-up – increased inhaler use',
      clinicalRisk: { score: 40, color: 'gray', factors: ['Asthma', 'Increased inhaler frequency'] },
      soapNotes: {
        subjective: 'Using rescue inhaler 3x/week. Triggered by cold air and exercise.',
        objective: 'Chest clear on auscultation. O2 sat 98%. Peak flow within normal range.',
        assessment: 'Mild intermittent asthma, partially controlled.',
        plan: 'Add low-dose ICS (Budesonide 200mcg BD). Avoid cold-air triggers. Review in 6 weeks.',
        signedAt: daysAgo(29),
      },
      aiRecommendations: ['Consider allergy testing', 'Ensure correct inhaler technique'],
      callMinutesUsed: 18,
    },
    {
      type: 'video', status: 'completed',
      scheduledStartTime: daysAgo(14), scheduledEndTime: new Date(daysAgo(14).getTime() + 30 * 60000),
      chiefComplaint: 'Routine BP and asthma review',
      clinicalRisk: { score: 30, color: 'green', factors: [] },
      soapNotes: {
        subjective: 'BP much better. No headaches. Inhaler use reduced to once/week.',
        objective: 'BP 126/80 mmHg, HR 72 bpm. Lungs clear. O2 sat 99%.',
        assessment: 'Hypertension well-controlled. Asthma improving.',
        plan: 'Continue current medications. Next review in 6 weeks.',
        signedAt: daysAgo(13),
      },
      aiRecommendations: ['Maintain current management', 'Continue lifestyle modifications'],
      callMinutesUsed: 22,
    },
    // Cancelled
    {
      type: 'video', status: 'cancelled',
      scheduledStartTime: daysAgo(7), scheduledEndTime: new Date(daysAgo(7).getTime() + 30 * 60000),
      chiefComplaint: 'General wellness check',
      clinicalRisk: { score: 20, color: 'green', factors: [] },
      callMinutesUsed: 0,
    },
    // Upcoming scheduled (today + 2h)
    {
      type: 'video', status: 'scheduled',
      scheduledStartTime: hoursFromNow(2), scheduledEndTime: hoursFromNow(2.5),
      chiefComplaint: 'Follow-up: BP control and medication review',
      clinicalRisk: { score: 35, color: 'green', factors: ['Hypertension - monitored'] },
      aiRecommendations: ['Check adherence to Amlodipine', 'Review home BP log'],
      callMinutesUsed: 0,
    },
    // Upcoming scheduled (tomorrow)
    {
      type: 'chat', status: 'scheduled',
      scheduledStartTime: hoursFromNow(26), scheduledEndTime: hoursFromNow(26.5),
      chiefComplaint: 'Shortness of breath – possible asthma exacerbation',
      clinicalRisk: { score: 55, color: 'gray', factors: ['Asthma', 'Recent cold weather'] },
      aiRecommendations: ['Pre-consultation: request peak flow reading', 'Prepare rescue inhaler protocol'],
      callMinutesUsed: 0,
    },
    // Pending request
    {
      type: 'video', status: 'pending',
      scheduledStartTime: hoursFromNow(48), scheduledEndTime: hoursFromNow(48.5),
      chiefComplaint: 'Chest tightness and mild fever',
      clinicalRisk: { score: 72, color: 'red', factors: ['Hypertension', 'Respiratory symptoms', 'Fever'] },
      aiRecommendations: ['Rule out pneumonia', 'Check CRP and FBC if available', 'High priority review'],
      callMinutesUsed: 0,
    },
  ];

  for (const c of consultations) {
    await Consultation.create({
      patientId: thandiwe._id,
      practitionerId: oliver._id,
      facilityId: NETCARE_FACILITY_ID,
      ...c,
    });
  }
  console.log(`Created ${consultations.length} consultations`);

  // ── Summary ────────────────────────────────────────────────────────────────────
  console.log('\n✓ Seed complete!\n');
  console.log('PATIENT — Thandiwe Mokoena');
  console.log('  Email:    thandiwe.mokoena@example.com');
  console.log('  SA ID:    9003125678087');
  console.log('  Password: Password123!');
  console.log('  Login →   /patient\n');
  console.log('PRACTITIONER — Dr. Oliver Mitchell (GP)');
  console.log('  Email:    mitchell@247digihealth.com');
  console.log('  HPCSA:    MP0123456');
  console.log('  Password: Password123!');
  console.log('  Login →   /practitioner\n');

  await mongoose.disconnect();
}

seed().catch((err) => { console.error(err); process.exit(1); });
