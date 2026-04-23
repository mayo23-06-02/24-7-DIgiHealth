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
  role: { type: String, enum: ['patient', 'practitioner', 'hospital_admin', 'inspector', 'super_admin', 'mega_admin'] },
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
  // consultationFee removed - subscription-based model
  bio: String,
  languages: [String],
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  achievements: [String],
  reviews: [{
     reviewer: String,
     rating: Number,
     comment: String,
     date: { type: Date, default: Date.now }
  }],
  isOnline: Boolean,
});

const FacilitySchema = new mongoose.Schema({
  name: String,
  facilityType: String,
  address: { city: String, province: String, coordinates: [Number, Number] },
  currentWaitTimeMins: Number,
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
const Anthropometric = mongoose.model('Anthropometric', AnthropometricSchema);
const MedicalContext = mongoose.model('MedicalContext', MedicalContextSchema);
const Facility = mongoose.model('Facility', FacilitySchema);
const Consultation = mongoose.model('Consultation', ConsultationSchema);
const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
const HealthTip = mongoose.model('HealthTip', HealthTipSchema);

// ─── Data Generation ─────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Connecting to MongoDB Atlas...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected.');

  console.log('🗑️  Clearing collections...');
  await Promise.all([
    User.deleteMany({}), PatientProfile.deleteMany({}), PractitionerProfile.deleteMany({}),
    Anthropometric.deleteMany({}), MedicalContext.deleteMany({}),
    Facility.deleteMany({}), Consultation.deleteMany({}), AuditLog.deleteMany({}),
    HealthTip.deleteMany({})
  ]);

  // 1. Core Facilities
  console.log('🏥 Creating Facilities...');
  const facility1 = await Facility.create({
    name: 'Prestige Medical Plaza', facilityType: 'Private',
    address: { city: 'Sandton', province: 'Gauteng', coordinates: [28.0167, -26.0548] },
    currentWaitTimeMins: 18
  });

  // 2. Personas (Users)
  console.log('👥 Creating 7 Personas...');
  
  // -- Patient: Thabo (High Risk)
  const thabo = await User.create({
    email: 'thabo@patient.com', passwordHash: '$2b$10$eN16remZzocHGTmyib5cROsDOOsSLkj7KwrZGTOrluHGwIWXzDbm6', role: 'patient',
    firstName: 'Thabo', lastName: 'Mokoena', mobile: '+27 71 123 4567'
  });
  await PatientProfile.create({ userId: thabo._id, dateOfBirth: new Date('1990-03-12'), gender: 'male', subscriptionTier: 'pro' });
  await Anthropometric.create({ patientId: thabo._id, heightCm: 178, weightKg: 97, bmi: 30.6, bloodType: 'B+' });
  await MedicalContext.create({ patientId: thabo._id, chronicConditions: ['Hypertension', 'Type 2 Diabetes'], allergies: [{ allergen: 'Penicillin', severity: 'severe' }] });

  // -- Practitioner: Dr. Nkosi
  const drNkosi = await User.create({
    email: 'dr.nkosi@digihealth.com', passwordHash: '$2b$10$eN16remZzocHGTmyib5cROsDOOsSLkj7KwrZGTOrluHGwIWXzDbm6', role: 'practitioner',
    firstName: 'Sipho', lastName: 'Nkosi'
  });
  await PractitionerProfile.create({ 
     userId: drNkosi._id, 
     specialisation: 'General Practitioner', 
     hpcsaNumber: 'MP0123456', 
     experienceYears: 14, 
     // consultationFee removed
     bio: 'Dr. Nkosi is a dedicated general practitioner with over 14 years of experience, passionate about holistic family medicine.',
     languages: ['English', 'isiZulu'],
     rating: 4.8,
     reviewCount: 152,
     achievements: ['Top GP Award 2021', 'Published Researcher in Family Medicine'],
     reviews: [{ reviewer: 'Thabo M.', rating: 5, comment: 'Dr Nkosi is very thorough!', date: new Date() }],
     isOnline: true 
  });

  // -- Seed 20 additional fake practitioners
  const { faker } = await import('@faker-js/faker');
  console.log('🩺 Seeding 20 extra Practitioners...');
  const specialties = ['Cardiologist', 'Dermatologist', 'Pediatrician', 'Neurologist', 'Psychiatrist', 'Oncologist', 'General Practitioner', 'Orthopedic Surgeon'];
  
  for (let i = 0; i < 20; i++) {
     const fn = faker.person.firstName();
     const ln = faker.person.lastName();
     const fakeDoc = await User.create({
        email: faker.internet.email({ firstName: fn, lastName: ln }),
        passwordHash: '$2b$10$eN16remZzocHGTmyib5cROsDOOsSLkj7KwrZGTOrluHGwIWXzDbm6',
        role: 'practitioner',
        firstName: fn,
        lastName: ln,
     });
     
     const docSpecialty = faker.helpers.arrayElement(specialties);
     await PractitionerProfile.create({
        userId: fakeDoc._id,
        specialisation: docSpecialty,
        hpcsaNumber: `MP${faker.number.int({ min: 1000000, max: 9999999 })}`,
        experienceYears: faker.number.int({ min: 2, max: 30 }),
        // consultationFee removed
        bio: faker.lorem.paragraph(3),
        languages: faker.helpers.arrayElements(['English', 'Afrikaans', 'isiZulu', 'isiXhosa', 'French'], { min: 1, max: 3 }),
        rating: faker.number.float({ min: 3.5, max: 5.0, fractionDigits: 1 }),
        reviewCount: faker.number.int({ min: 0, max: 500 }),
        achievements: faker.helpers.arrayElements([
            'Gold Medalist', 'Top Rated 2023', 'Best Researcher', 'Innovative Care Award', 'Medical Board Member'
        ], { min: 1, max: 3 }),
        reviews: Array.from({ length: 3 }).map(() => ({
            reviewer: faker.person.fullName(),
            rating: faker.number.int({ min: 4, max: 5 }),
            comment: faker.lorem.sentence(),
            date: faker.date.recent({ days: 90 })
        })),
        isOnline: faker.datatype.boolean()
     });
  }

  // -- Hospital Admin: Nandi
  const adminNandi = await User.create({
    email: 'nandi@prestige.com', passwordHash: '$2b$10$eN16remZzocHGTmyib5cROsDOOsSLkj7KwrZGTOrluHGwIWXzDbm6', role: 'hospital_admin',
    firstName: 'Nandi', lastName: 'Dlamini'
  });



  // -- Super Admin: Priya
  const priya = await User.create({
    email: 'priya@admin.com', passwordHash: '$2b$10$eN16remZzocHGTmyib5cROsDOOsSLkj7KwrZGTOrluHGwIWXzDbm6', role: 'super_admin',
    firstName: 'Priya', lastName: 'Naidoo'
  });

  // -- Mega Admin: Kgomotso
  const kgomotso = await User.create({
    email: 'ceo@admin.com', passwordHash: '$2b$10$eN16remZzocHGTmyib5cROsDOOsSLkj7KwrZGTOrluHGwIWXzDbm6', role: 'mega_admin',
    firstName: 'Kgomotso', lastName: 'Ramaphosa'
  });

  // 3. Operational Data
  console.log('🔄 Sowing Operational Data (Consultations)...');
  
  // Ongoing Consultation between Thabo and Dr Nkosi
  await Consultation.create({
    patientId: thabo._id, practitionerId: drNkosi._id, facilityId: facility1._id,
    type: 'video', status: 'in_progress', scheduledStartTime: new Date(), scheduledEndTime: new Date(Date.now() + 1800000),
    clinicalRisk: { score: 82, color: 'red', factors: ['Obese', 'Diabetic'] }
  });

  // -- Inspector: Lebo
  const lebo = await User.create({
    email: 'lebo@doh.gov.za', passwordHash: '$2b$10$eN16remZzocHGTmyib5cROsDOOsSLkj7KwrZGTOrluHGwIWXzDbm6', role: 'inspector',
    firstName: 'Lebo', lastName: 'Sithole'
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

  console.log('\n✅ Seed Complete!');
  console.log(`\n📋 MOCK LOGIN EMAILS:`);
  console.log(`     Patient : thabo@patient.com`);
  console.log(`      Doctor : dr.nkosi@digihealth.com`);
  console.log(`       Admin : nandi@prestige.com`);
  console.log(`   Inspector : lebo@doh.gov.za`);
  
  await mongoose.disconnect();
}

seed().catch(err => { console.error('❌ SEED FAILED:', err); process.exit(1); });
