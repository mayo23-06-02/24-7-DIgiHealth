/**
 * seed-v2.mjs — Comprehensive V2 Bootstrap Script for 24/7 DigiHealth
 * 
 * Uses the Polymorphic Reference Architecture to seed all 7 personas.
 * IMPORTANT: Because this runs standalone in Node, we define the schemas 
 * inline here to prevent `Cannot use import statement outside a module` or TS errors.
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/digihealth';

// ─── Inline Schemas (V2 Architecture) ─────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['patient', 'practitioner', 'hospital_admin', 'emt', 'inspector', 'super_admin', 'mega_admin'] },
  status: { type: String, default: 'active' },
  firstName: String,
  lastName: String,
  saId: String,
  mobile: String,
}, { timestamps: true });

const PatientProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dateOfBirth: Date,
  gender: String,
  emergencyContact: { name: String, phone: String, relationship: String },
  subscriptionTier: String,
});

const PractitionerProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  specialisation: String,
  hpcsaNumber: String,
  experienceYears: Number,
  isOnline: Boolean,
});

const EMTProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  licenseLevel: String,
  hpcsaNumber: String,
  assignedVehicle: String,
  currentStatus: String,
});

const AnthropometricSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dateRecorded: Date,
  heightCm: Number,
  weightKg: Number,
  bmi: Number,
  bloodType: String,
});

const MedicalContextSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  chronicConditions: [String],
  allergies: [{ allergen: String, severity: String }],
});

const FacilitySchema = new mongoose.Schema({
  name: String,
  facilityType: String,
  address: { city: String, province: String, coordinates: [Number, Number] },
  bedCapacity: { total: Number, generalAvailable: Number, icuAvailable: Number },
  currentWaitTimeMins: Number,
});

const EmergencyDispatchSchema = new mongoose.Schema({
  dispatchId: String,
  emtId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dispatchTime: Date,
  status: String,
  incidentLocation: { address: String, coordinates: [Number, Number] },
  targetFacilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
});

const ConsultationSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  practitionerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  type: String,
  status: String,
  scheduledStartTime: Date,
  scheduledEndTime: Date,
  clinicalRisk: { score: Number, color: String, factors: [String] },
});

const AuditLogSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: String,
  timestamp: Date,
});

const HealthTipSchema = new mongoose.Schema({
  title: String,
  excerpt: String,
  author: String,
  date: String,
  readTime: String,
  image: String,
  tag: String,
  category: String,
});

mongoose.models = {}; // clear cache
const User = mongoose.model('User', UserSchema);
const PatientProfile = mongoose.model('PatientProfile', PatientProfileSchema);
const PractitionerProfile = mongoose.model('PractitionerProfile', PractitionerProfileSchema);
const EMTProfile = mongoose.model('EMTProfile', EMTProfileSchema);
const Anthropometric = mongoose.model('Anthropometric', AnthropometricSchema);
const MedicalContext = mongoose.model('MedicalContext', MedicalContextSchema);
const Facility = mongoose.model('Facility', FacilitySchema);
const EmergencyDispatch = mongoose.model('EmergencyDispatch', EmergencyDispatchSchema);
const Consultation = mongoose.model('Consultation', ConsultationSchema);
const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
const HealthTip = mongoose.model('HealthTip', HealthTipSchema);

// ─── Data Generation ─────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Connecting to MongoDB Atlas...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected.');

  console.log('🗑️  Clearing V2 collections...');
  await Promise.all([
    User.deleteMany({}), PatientProfile.deleteMany({}), PractitionerProfile.deleteMany({}),
    EMTProfile.deleteMany({}), Anthropometric.deleteMany({}), MedicalContext.deleteMany({}),
    Facility.deleteMany({}), EmergencyDispatch.deleteMany({}), Consultation.deleteMany({}), AuditLog.deleteMany({}),
    HealthTip.deleteMany({})
  ]);

  // 1. Core Facilities
  console.log('🏥 Creating Facilities...');
  const facility1 = await Facility.create({
    name: 'Prestige Medical Plaza', facilityType: 'Private',
    address: { city: 'Sandton', province: 'Gauteng', coordinates: [28.0167, -26.0548] },
    bedCapacity: { total: 124, generalAvailable: 18, icuAvailable: 2 },
    currentWaitTimeMins: 18
  });

  // 2. Personas (Users)
  console.log('👥 Creating 7 Personas...');
  
  // -- Patient: Thabo (High Risk)
  const thabo = await User.create({
    email: 'thabo@patient.com', passwordHash: 'hash', role: 'patient',
    firstName: 'Thabo', lastName: 'Mokoena', mobile: '+27 71 123 4567'
  });
  await PatientProfile.create({ userId: thabo._id, dateOfBirth: new Date('1990-03-12'), gender: 'male', subscriptionTier: 'pro' });
  await Anthropometric.create({ patientId: thabo._id, heightCm: 178, weightKg: 97, bmi: 30.6, bloodType: 'B+' });
  await MedicalContext.create({ patientId: thabo._id, chronicConditions: ['Hypertension', 'Type 2 Diabetes'], allergies: [{ allergen: 'Penicillin', severity: 'severe' }] });

  // -- Practitioner: Dr. Nkosi
  const drNkosi = await User.create({
    email: 'dr.nkosi@digihealth.com', passwordHash: 'hash', role: 'practitioner',
    firstName: 'Sipho', lastName: 'Nkosi'
  });
  await PractitionerProfile.create({ userId: drNkosi._id, specialisation: 'General Practitioner', hpcsaNumber: 'MP0123456', experienceYears: 14, isOnline: true });

  // -- Hospital Admin: Nandi
  const adminNandi = await User.create({
    email: 'nandi@prestige.com', passwordHash: 'hash', role: 'hospital_admin',
    firstName: 'Nandi', lastName: 'Dlamini'
  });

  // -- EMT: Bongani
  const bongani = await User.create({
    email: 'bongani@netcare.com', passwordHash: 'hash', role: 'emt',
    firstName: 'Bongani', lastName: 'Khumalo'
  });
  await EMTProfile.create({ userId: bongani._id, licenseLevel: 'ALS', hpcsaNumber: 'EMT-0045123', assignedVehicle: 'GP-07', currentStatus: 'en_route' });

  // -- Inspector: Lebo
  const lebo = await User.create({
    email: 'lebo@doh.gov.za', passwordHash: 'hash', role: 'inspector',
    firstName: 'Lebo', lastName: 'Sithole'
  });

  // -- Super Admin: Priya
  const priya = await User.create({
    email: 'priya@admin.com', passwordHash: 'hash', role: 'super_admin',
    firstName: 'Priya', lastName: 'Naidoo'
  });

  // -- Mega Admin: Kgomotso
  const kgomotso = await User.create({
    email: 'ceo@admin.com', passwordHash: 'hash', role: 'mega_admin',
    firstName: 'Kgomotso', lastName: 'Ramaphosa'
  });

  // 3. Operational Data bridging them together
  console.log('🔄 Sowing Operational Data (Consultations & EMT Dispatch)...');
  
  // Ongoing Consultation between Thabo and Dr Nkosi
  await Consultation.create({
    patientId: thabo._id, practitionerId: drNkosi._id, facilityId: facility1._id,
    type: 'video', status: 'in_progress', scheduledStartTime: new Date(), scheduledEndTime: new Date(Date.now() + 1800000),
    clinicalRisk: { score: 82, color: 'red', factors: ['Obese', 'Diabetic'] }
  });

  // Bongani dispatched to Prestige Medical
  await EmergencyDispatch.create({
    dispatchId: 'EMG-2026-007', emtId: bongani._id, status: 'en_route',
    incidentLocation: { address: 'Bryanston', coordinates: [28.0160, -26.0500] },
    targetFacilityId: facility1._id, dispatchTime: new Date()
  });

  // Lebo (Inspector) auditing
  await AuditLog.create({ actorId: lebo._id, action: 'VIEWED_FACILITY_POPIA_COMPLIANCE', timestamp: new Date() });

  // 4. Health Tips & News
  console.log('🗞️  Seeding Health Tips & News...');
  await HealthTip.insertMany([
    {
      title: "10 Daily Health Tips To Strengthen Your Immune System",
      excerpt: "Adopt simple daily habits like balanced eating, regular exercise, and stress control to strengthen your heart.",
      author: "Dr. Dilshad Hasan",
      date: "Oct 12, 2024",
      readTime: "5 min",
      image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800&auto=format&fit=crop",
      tag: "Immunity",
      category: "tip"
    },
    {
      title: "Effective Tips For Reducing Stress & Enhancing Mental Clarity",
      excerpt: "Discover how routine health checkups help detect issues early, prevent serious diseases.",
      author: "Dr. Humayun Kabir",
      date: "Oct 10, 2024",
      readTime: "8 min",
      image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=800&auto=format&fit=crop",
      tag: "Mental Health",
      category: "tip"
    },
    {
      title: "Nutrition Guide: Keeping Your Heart In Maximum Condition",
      excerpt: "Understand how unmanaged stress affects your body and why regular health checkups are vital.",
      author: "Dr. Navid Mahbub",
      date: "Oct 08, 2024",
      readTime: "12 min",
      image: "https://images.unsplash.com/photo-1547517023-7ca0c162f816?q=80&w=800&auto=format&fit=crop",
      tag: "Cardiology",
      category: "blog"
    },
    {
      title: "New AI Technology Detects Early Signs of Diabetes",
      excerpt: "DigiHealth's new AI module successfully identifies early diabetic retinopathy with high accuracy.",
      author: "Medical Tech Desk",
      date: "Feb 20, 2026",
      readTime: "4 min",
      image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=800&auto=format&fit=crop",
      tag: "AI News",
      category: "news"
    }
  ]);

  console.log('\n✅ V2 Seed Complete! The Polymorphic DB Architecture is Live.');
  console.log(`\n📋 MOCK LOGIN EMAILS:`);
  console.log(`     Patient : thabo@patient.com`);
  console.log(`      Doctor : dr.nkosi@digihealth.com`);
  console.log(`       Admin : nandi@prestige.com`);
  console.log(`         EMT : bongani@netcare.com`);
  console.log(`   Inspector : lebo@doh.gov.za`);
  
  await mongoose.disconnect();
}

seed().catch(err => { console.error('❌ SEED FAILED:', err); process.exit(1); });
