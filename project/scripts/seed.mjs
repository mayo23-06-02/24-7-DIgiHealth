/**
 * seed.mjs — Standalone seed script for 24/7 DigiHealth Practitioner Dashboard
 *
 * Run from project root:
 *   MONGODB_URI=mongodb://localhost:27017/digihealth node scripts/seed.mjs
 *
 * Or add to package.json: "seed": "node scripts/seed.mjs"
 */

import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/digihealth";

// ─── Inline Schemas (avoid TypeScript import issues in .mjs) ─────────────────

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["practitioner", "patient"], required: true },
    profile: {
      fullName: String,
      specialisation: String,
      hpcsNumber: String,
      avatarUrl: String,
      bio: String,
    },
  },
  { timestamps: true },
);

const PatientSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    dateOfBirth: Date,
    gender: String,
    mobileNumber: String,
    medicalHistory: [String],
    allergies: [String],
    currentMedications: [String],
    bloodType: String,
    emergencyContact: { name: String, phone: String, relationship: String },
  },
  { timestamps: true },
);

const ConsultationSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
    practitionerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    scheduledStart: Date,
    scheduledEnd: Date,
    status: String,
    type: String,
    reason: String,
    soapNotes: {
      subjective: String,
      objective: String,
      assessment: String,
      plan: String,
      savedAt: Date,
    },
    riskScore: Number,
    riskColor: String,
    aiRecommendations: [String],
    riskFactors: [String],
  },
  { timestamps: true },
);

const RiskScoreSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
  practitionerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  consultationId: { type: mongoose.Schema.Types.ObjectId, ref: "Consultation" },
  score: Number,
  color: String,
  factors: [String],
  condition: String,
  calculatedAt: { type: Date, default: Date.now },
});

const HealthTipSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    excerpt: { type: String, required: true },
    content: { type: String },
    author: { type: String, required: true },
    date: { type: String, required: true },
    readTime: { type: String },
    image: { type: String },
    tag: { type: String },
    category: { type: String, enum: ["tip", "news", "blog"], default: "tip" },
  },
  { timestamps: true },
);

const ArticleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    excerpt: { type: String, required: true },
    content: { type: String, required: true },
    coverImage: { type: String, required: true },
    author: { type: String, required: true },
    publishedAt: { type: Date, default: Date.now },
    readTimeMinutes: { type: Number, default: 5 },
    tags: [{ type: String }],
    likes: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Patient =
  mongoose.models.Patient || mongoose.model("Patient", PatientSchema);
const Consultation =
  mongoose.models.Consultation ||
  mongoose.model("Consultation", ConsultationSchema);
const RiskScore =
  mongoose.models.RiskScore || mongoose.model("RiskScore", RiskScoreSchema);
const HealthTip =
  mongoose.models.HealthTip || mongoose.model("HealthTip", HealthTipSchema);
const Article =
  mongoose.models.Article || mongoose.model("Article", ArticleSchema);

// ─── Data ─────────────────────────────────────────────────────────────────────

const now = new Date();
const addHours = (h) => new Date(now.getTime() + h * 3600000);
const subtractDays = (d) => new Date(now.getTime() - d * 86400000);
const addDays = (d) => new Date(now.getTime() + d * 86400000);

function getRiskColor(score) {
  if (score < 30) return "green";
  if (score <= 70) return "gray";
  return "red";
}

const practitioners = [
  {
    email: "dr.nkosi@digihealth.co.za",
    passwordHash: "$2b$10$examplehash1",
    role: "practitioner",
    profile: {
      fullName: "Dr. Sipho Nkosi",
      specialisation: "General Practitioner",
      hpcsNumber: "MP0123456",
      avatarUrl:
        "https://ui-avatars.com/api/?name=Sipho+Nkosi&background=0052cc&color=fff",
      bio: "Experienced GP with 12 years in telehealth and preventive care.",
    },
  },
  {
    email: "dr.van.wyk@digihealth.co.za",
    passwordHash: "$2b$10$examplehash2",
    role: "practitioner",
    profile: {
      fullName: "Dr. Anke van Wyk",
      specialisation: "Cardiologist",
      hpcsNumber: "MP0789012",
      avatarUrl:
        "https://ui-avatars.com/api/?name=Anke+van+Wyk&background=00A3BF&color=fff",
      bio: "Cardiologist specialising in cardiac risk stratification and heart failure management.",
    },
  },
];

const patientUsers = [
  {
    email: "thandiwe.mokoena@patient.co.za",
    fullName: "Thandiwe Mokoena",
    gender: "female",
    dob: new Date("1990-03-12"),
    blood: "A+",
    history: ["Hypertension", "Type 2 Diabetes"],
    allergies: ["Penicillin"],
    meds: ["Metformin 500mg", "Amlodipine 5mg"],
    riskScore: 82,
    factors: ["Age >30", "History of hypertension", "Diabetic", "BMI >28"],
    condition: "Hypertensive crisis risk",
    aiRec: [
      "Monitor BP daily",
      "Review Metformin dosage",
      "Schedule HbA1c test",
    ],
  },
  {
    email: "john.dlamini@patient.co.za",
    fullName: "John Dlamini",
    gender: "male",
    dob: new Date("1962-07-22"),
    blood: "O-",
    history: [
      "Coronary Artery Disease",
      "Hypertension",
      "Hypercholesterolaemia",
    ],
    allergies: ["Aspirin", "Sulfa drugs"],
    meds: ["Atorvastatin 40mg", "Bisoprolol 5mg", "Ramipril 10mg"],
    riskScore: 92,
    factors: [
      "Age >60",
      "History of CAD",
      "Hypertension",
      "Hypercholesterolaemia",
      "Male gender",
    ],
    condition: "Possible cardiac event",
    aiRec: ["Urgent ECG review", "Troponin levels", "Cardiology referral"],
  },
  {
    email: "amira.khan@patient.co.za",
    fullName: "Amira Khan",
    gender: "female",
    dob: new Date("1985-11-05"),
    blood: "B+",
    history: ["Asthma", "Allergic rhinitis"],
    allergies: ["NSAIDs", "Latex"],
    meds: ["Salbutamol inhaler", "Fluticasone inhaler"],
    riskScore: 45,
    factors: [
      "Chronic asthma",
      "Allergen-triggered attacks",
      "Seasonal exacerbation",
    ],
    condition: "Moderate asthma exacerbation risk",
    aiRec: [
      "Check peak flow rate",
      "Ensure rescue inhaler available",
      "Review action plan",
    ],
  },
  {
    email: "sipho.zulu@patient.co.za",
    fullName: "Sipho Zulu",
    gender: "male",
    dob: new Date("1978-01-30"),
    blood: "AB+",
    history: ["HIV (controlled)", "Depression"],
    allergies: ["Efavirenz (CNS side effects)"],
    meds: ["Dolutegravir 50mg", "Tenofovir/Lamivudine", "Sertraline 50mg"],
    riskScore: 38,
    factors: [
      "Chronic HIV management",
      "Mental health co-morbidity",
      "Medication interactions",
    ],
    condition: "Stable with monitoring required",
    aiRec: ["Monthly CD4 count", "Viral load check", "Depression screening"],
  },
  {
    email: "grace.molefe@patient.co.za",
    fullName: "Grace Molefe",
    gender: "female",
    dob: new Date("1950-06-18"),
    blood: "O+",
    history: ["Type 2 Diabetes", "CKD Stage 3", "Hypertension"],
    allergies: ["Metformin (GI intolerance)"],
    meds: ["Insulin Glargine 20 units", "Amlodipine 10mg", "Furosemide 40mg"],
    riskScore: 88,
    factors: [
      "Age >70",
      "CKD Stage 3",
      "Diabetic",
      "Hypertension",
      "Polypharmacy risk",
    ],
    condition: "High renal failure risk",
    aiRec: [
      "eGFR monitoring",
      "Potassium levels check",
      "Nephrology consult recommended",
    ],
  },
  {
    email: "david.botha@patient.co.za",
    fullName: "David Botha",
    gender: "male",
    dob: new Date("1995-09-14"),
    blood: "A-",
    history: ["Anxiety disorder", "Insomnia"],
    allergies: [],
    meds: ["Escitalopram 10mg", "Melatonin 5mg"],
    riskScore: 22,
    factors: ["Generalised anxiety", "Sleep disruption"],
    condition: "Low risk – mental wellness support",
    aiRec: [
      "CBT referral",
      "Sleep hygiene counselling",
      "Follow-up in 4 weeks",
    ],
  },
  {
    email: "nomsa.dube@patient.co.za",
    fullName: "Nomsa Dube",
    gender: "female",
    dob: new Date("1940-12-01"),
    blood: "B-",
    history: ["COPD", "Heart failure", "Osteoporosis"],
    allergies: ["Codeine"],
    meds: ["Salbutamol", "Tiotropium", "Bisoprolol", "Calcium + Vit D"],
    riskScore: 95,
    factors: [
      "Age >80",
      "COPD",
      "Heart failure",
      "Polypharmacy (4+ meds)",
      "High fall risk",
    ],
    condition: "Critical – multi-organ risk",
    aiRec: [
      "Urgent review needed",
      "O2 saturation check",
      "Palliative care discussion",
    ],
  },
  {
    email: "lethabo.sithole@patient.co.za",
    fullName: "Lethabo Sithole",
    gender: "male",
    dob: new Date("2002-04-25"),
    blood: "AB-",
    history: ["Type 1 Diabetes"],
    allergies: ["Sulfonamides"],
    meds: ["Insulin Aspart", "Insulin Detemir", "Continuous Glucose Monitor"],
    riskScore: 55,
    factors: [
      "Type 1 Diabetes",
      "Recent HbA1c >8%",
      "Adolescent compliance challenges",
    ],
    condition: "Moderate glycaemic control risk",
    aiRec: [
      "CGM data review",
      "Dietary counselling",
      "Bolus adjustment needed",
    ],
  },
];

const healthTips = [
  {
    title: "10 Daily Health Tips To Strengthen Your Immune System",
    excerpt:
      "Adopt simple daily habits like balanced eating, regular exercise, and stress control to strengthen your heart and boost longevity.",
    author: "Dr. Dilshad Hasan",
    date: "Oct 12, 2024",
    readTime: "5 min",
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800&auto=format&fit=crop",
    tag: "Immunity",
    category: "tip",
  },
  {
    title: "Effective Tips For Reducing Stress & Enhancing Mental Clarity",
    excerpt:
      "Discover how routine health checkups help detect issues early, prevent serious diseases, and promote long-term physical and mental wellness.",
    author: "Dr. Humayun Kabir",
    date: "Oct 10, 2024",
    readTime: "8 min",
    image:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=800&auto=format&fit=crop",
    tag: "Mental Health",
    category: "tip",
  },
  {
    title: "Nutrition Guide: Keeping Your Heart In Maximum Condition",
    excerpt:
      "Understand how unmanaged stress affects your body and why regular health checkups are vital for early detection and prevention.",
    author: "Dr. Navid Mahbub",
    date: "Oct 08, 2024",
    readTime: "12 min",
    image:
      "https://images.unsplash.com/photo-1547517023-7ca0c162f816?q=80&w=800&auto=format&fit=crop",
    tag: "Cardiology",
    category: "blog",
  },
  {
    title: "New AI Technology Detects Early Signs of Diabetes",
    excerpt:
      "DigiHealth's new AI module successfully identifies early diabetic retinopathy in clinical trials with 98% accuracy.",
    author: "Medical Tech Desk",
    date: "Feb 20, 2026",
    readTime: "4 min",
    image:
      "https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=800&auto=format&fit=crop",
    tag: "AI News",
    category: "news",
  },
  {
    title: "South Africa's New Telehealth Framework: What You Need to Know",
    excerpt:
      "The latest government guidelines clarify POPIA compliance for telehealth providers in 2026.",
    author: "Lebo Sithole",
    date: "Mar 05, 2026",
    readTime: "10 min",
    image:
      "https://images.unsplash.com/photo-1505751172107-573225a9470e?q=80&w=800&auto=format&fit=crop",
    tag: "Regulatory",
    category: "news",
  },
];

// ─── SEED ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected.");

  // Clean existing data
  await Promise.all([
    User.deleteMany({}),
    Patient.deleteMany({}),
    Consultation.deleteMany({}),
    RiskScore.deleteMany({}),
    HealthTip.deleteMany({}),
    Article.deleteMany({}),
  ]);
  console.log("🗑️  Cleared existing data.");

  // Create practitioners
  const createdPractitioners = await User.insertMany(practitioners);
  const mainPractitioner = createdPractitioners[0];
  console.log(`👨‍⚕️ Created ${createdPractitioners.length} practitioners.`);

  // Create patient users + patient records
  const createdPatients = [];
  for (const p of patientUsers) {
    const user = await User.create({
      email: p.email,
      passwordHash: "$2b$10$examplePatientHash",
      role: "patient",
      profile: {
        fullName: p.fullName,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(p.fullName)}&background=e2e8f0&color=0052cc`,
      },
    });

    const age = Math.floor((now - p.dob) / (365.25 * 86400000));
    const patient = await Patient.create({
      userId: user._id,
      dateOfBirth: p.dob,
      gender: p.gender,
      mobileNumber: `+27${Math.floor(600000000 + Math.random() * 99999999)}`,
      medicalHistory: p.history,
      allergies: p.allergies,
      currentMedications: p.meds,
      bloodType: p.blood,
      emergencyContact: {
        name: `${p.fullName.split(" ")[0]} Family Contact`,
        phone: `+27${Math.floor(700000000 + Math.random() * 99999999)}`,
        relationship: "Family",
      },
    });

    createdPatients.push({ patient, user, ...p });
  }
  console.log(`🧑‍🤝‍🧑 Created ${createdPatients.length} patients.`);

  // Create consultations (mix of upcoming, ongoing, completed)
  const consultationData = [
    // Upcoming consultations (queue)
    { idx: 0, hoursFromNow: 0.3, status: "ongoing", type: "video" },
    { idx: 1, hoursFromNow: 1.0, status: "scheduled", type: "video" },
    { idx: 2, hoursFromNow: 1.75, status: "scheduled", type: "chat" },
    { idx: 3, hoursFromNow: 2.5, status: "scheduled", type: "video" },
    { idx: 4, hoursFromNow: 3.5, status: "scheduled", type: "video" },
    { idx: 5, hoursFromNow: 4.0, status: "scheduled", type: "in-person" },
    { idx: 6, hoursFromNow: 5.0, status: "scheduled", type: "chat" },
    { idx: 7, hoursFromNow: 24, status: "scheduled", type: "video" },
    // Past / completed
    { idx: 0, hoursFromNow: -3, status: "completed", type: "video" },
    { idx: 2, hoursFromNow: -24, status: "completed", type: "chat" },
    { idx: 3, hoursFromNow: -48, status: "completed", type: "video" },
    { idx: 5, hoursFromNow: -72, status: "cancelled", type: "in-person" },
  ];

  const reasons = [
    "Persistent headache and dizziness",
    "Chest pain with shortness of breath",
    "Asthma follow-up and medication review",
    "HIV viral load and medication check",
    "Kidney function monitoring and diabetes review",
    "Anxiety and insomnia management",
    "COPD exacerbation – breathing difficulty",
    "Diabetes glucose monitoring review",
  ];

  const createdConsultations = [];
  for (const c of consultationData) {
    const p = createdPatients[c.idx % createdPatients.length];
    const start = addHours(c.hoursFromNow);
    const end = new Date(start.getTime() + 30 * 60000);

    const consultation = await Consultation.create({
      patientId: p.patient._id,
      practitionerId: mainPractitioner._id,
      scheduledStart: start,
      scheduledEnd: end,
      status: c.status,
      type: c.type,
      reason: reasons[c.idx % reasons.length],
      riskScore: p.riskScore,
      riskColor: getRiskColor(p.riskScore),
      aiRecommendations: p.aiRec,
      riskFactors: p.factors,
      ...(c.status === "completed" && {
        soapNotes: {
          subjective: `Patient reports ${reasons[c.idx % reasons.length].toLowerCase()}. Reports symptoms worsening over past 48hrs.`,
          objective: `BP 145/92, HR 88bpm, SpO2 97%, Temp 36.8°C. Alert and oriented.`,
          assessment: `${p.history[0] || "General health concern"}. Risk score ${p.riskScore}/100.`,
          plan: `Continue current medications. ${p.aiRec[0]}. Follow-up in 2 weeks.`,
          savedAt: new Date(start.getTime() + 35 * 60000),
        },
      }),
    });
    createdConsultations.push({ consultation, patient: p });
  }
  console.log(`📅 Created ${createdConsultations.length} consultations.`);

  // Create risk score history
  for (const { consultation, patient } of createdConsultations) {
    await RiskScore.create({
      patientId: patient.patient._id,
      practitionerId: mainPractitioner._id,
      consultationId: consultation._id,
      score: patient.riskScore,
      color: getRiskColor(patient.riskScore),
      factors: patient.factors,
      condition: patient.condition,
      calculatedAt: consultation.scheduledStart,
    });
  }
  console.log(`📊 Created ${createdConsultations.length} risk score records.`);

  await HealthTip.insertMany(healthTips);
  console.log(`🗞️  Created ${healthTips.length} health tips and news items.`);

  // Create Articles
  const articlesSeed = [
    {
      title: "Understanding Hypertension – Latest Research 2026",
      slug: "understanding-hypertension-2026",
      excerpt:
        "Hypertension remains the leading cause of cardiovascular complications in South Africa.",
      content:
        "<h3>Clinical Overview</h3><p>Hypertension is defined as a sustained increase in blood pressure...</p><p>New guidelines suggest earlier intervention...</p>",
      coverImage:
        "https://images.unsplash.com/photo-1547517023-7ca0c162f816?q=80&w=800&auto=format&fit=crop",
      author: "Dr. Sipho Nkosi",
      publishedAt: new Date(),
      readTimeMinutes: 6,
      tags: ["Wellness", "Clinical"],
      likes: 124,
      isPublished: true,
    },
    {
      title: "5 Tips for Better Sleep – Enhancing Recovery",
      slug: "5-tips-better-sleep",
      excerpt:
        "Sleep hygiene is crucial for mental clarity and physical recovery.",
      content:
        "<h3>1. Consistency</h3><p>Keep a regular sleep schedule...</p><h3>2. Dark Environment</h3><p>Ensure your room is dark...</p>",
      coverImage:
        "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=800&auto=format&fit=crop",
      author: "Dr. Anke van Wyk",
      publishedAt: new Date(Date.now() - 86400000 * 2),
      readTimeMinutes: 4,
      tags: ["Mental Health", "Wellness"],
      likes: 89,
      isPublished: true,
    },
  ];

  await Article.insertMany(articlesSeed);
  console.log(`🗞️  Created ${articlesSeed.length} premium articles.`);

  const mainPractitionerData = {
    id: mainPractitioner._id.toString(),
    email: mainPractitioner.email,
    name: mainPractitioner.profile.fullName,
    specialisation: mainPractitioner.profile.specialisation,
  };

  console.log("\n✅ Seed complete!");
  console.log("\n📋 Mock practitioner login:");
  console.log(`   Email      : ${mainPractitionerData.email}`);
  console.log(`   Password   : password123`);
  console.log(`   ID         : ${mainPractitionerData.id}`);
  console.log(`\n💡 Add to .env.local:`);
  console.log(`   MOCK_PRACTITIONER_ID=${mainPractitionerData.id}`);
  console.log(`   MONGODB_URI=mongodb://localhost:27017/digihealth`);

  await mongoose.disconnect();
  console.log("\n🔌 Disconnected from MongoDB.");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
