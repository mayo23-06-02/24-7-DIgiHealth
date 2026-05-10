/**
 * scripts/seedOliver.mjs
 *
 * Enriches Dr. Oliver Mitchell's practitioner dashboard with:
 *  - 10 rich upcoming / recent consultations with real patients
 *  - SOAP notes for completed consultations
 *  - 8 secure message threads with patients
 *  - 5 notifications
 *  - Additional authored health articles & tips
 *  - Trusted device seed
 *
 * Run: node --env-file=.env.local scripts/seedOliver.mjs
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { addDays, subDays } from 'date-fns';

// ── CONNECT ──────────────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in .env.local');
  process.exit(1);
}

await mongoose.connect(MONGODB_URI);
console.log('✅ Connected to MongoDB');

// ── MODELS ───────────────────────────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
  email: String, passwordHash: String, role: String,
  status: String, firstName: String, lastName: String,
  saId: String, mobile: String, mfaEnabled: Boolean,
  avatarUrl: String, trustedDevices: Array, notificationPrefs: Object
}, { strict: false, timestamps: true });

const ConsultationSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  practitionerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  type: String, status: String,
  scheduledStartTime: Date, scheduledEndTime: Date,
  chiefComplaint: String, minutesAllocated: Number, minutesUsed: Number,
  clinicalRisk: Object, soapNotes: Object,
}, { strict: false, timestamps: true });

const ConversationSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  practitionerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: String, startedAt: Date, minutesAllocated: Number
}, { strict: false });

const MessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String, isRead: Boolean,
}, { strict: false, timestamps: true });

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: String, title: String, body: String, isRead: Boolean,
}, { strict: false, timestamps: true });

const ArticleSchema = new mongoose.Schema({
  title: String, slug: String, excerpt: String, content: String,
  coverImage: String, author: String, tags: [String],
  likes: Number, isPublished: Boolean, publishedAt: Date,
  readTimeMinutes: Number,
}, { strict: false });

const HealthTipSchema = new mongoose.Schema({
  title: String, excerpt: String, content: String, author: String,
  date: String, readTime: String, tag: String, category: String,
  icon: String,
}, { strict: false });

const PractitionerProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { strict: false });

// ── REGISTER MODELS ──────────────────────────────────────────────────────────
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Consultation = mongoose.models.Consultation || mongoose.model('Consultation', ConsultationSchema);
const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);
const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
const Article = mongoose.models.Article || mongoose.model('Article', ArticleSchema);
const HealthTip = mongoose.models.HealthTip || mongoose.model('HealthTip', HealthTipSchema);
const PractitionerProfile = mongoose.models.PractitionerProfile || mongoose.model('PractitionerProfile', PractitionerProfileSchema);

// ── FIND DR. OLIVER ──────────────────────────────────────────────────────────
const oliver = await User.findOne({ email: 'mitchell@247digihealth.com' });
if (!oliver) {
  console.error('❌ Dr. Oliver Mitchell not found. Run the main seed first.');
  await mongoose.disconnect();
  process.exit(1);
}
console.log(`🩺 Found Dr. Oliver Mitchell (${oliver._id})`);

// ── FIND PATIENTS ─────────────────────────────────────────────────────────────
const patients = await User.find({ role: 'patient' }).limit(15).lean();
if (patients.length === 0) {
  console.error('❌ No patients found. Run the main seed first.');
  await mongoose.disconnect();
  process.exit(1);
}

// ── FIND FACILITY ─────────────────────────────────────────────────────────────
const FacilitySchema = new mongoose.Schema({}, { strict: false });
const Facility = mongoose.models.Facility || mongoose.model('Facility', FacilitySchema);
const facility = await Facility.findOne({}).lean();

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONSULTATIONS
// ─────────────────────────────────────────────────────────────────────────────
console.log('📅 Seeding Dr. Oliver\'s consultations...');

const complaints = [
  'Persistent headache and mild fever for 3 days',
  'Follow-up for hypertension management',
  'Shortness of breath on exertion',
  'Routine annual health check',
  'Chest discomfort, non-cardiac origin suspected',
  'Skin rash on forearms — possible contact dermatitis',
  'Sleep disturbance and fatigue — burnout assessment',
  'Medication review for Type 2 Diabetes management',
  'Upper respiratory tract infection',
  'Joint pain — left knee, onset 1 week ago',
  'Anxiety symptoms — follow-up CBT referral',
  'Weight management consultation',
];

const soapTemplates = [
  {
    subjective: 'Patient reports persistent headache (7/10 severity) for 3 days, accompanied by low-grade fever (37.8°C). No vomiting, no photophobia. Sleep disrupted.',
    objective: 'BP: 128/82 mmHg, HR: 78 bpm, Temp: 37.8°C, SpO2: 98%. Mild pharyngeal erythema. Neck supple, no meningism.',
    assessment: 'Viral upper respiratory tract infection with tension-type headache component. No red flags for CNS pathology.',
    plan: 'Paracetamol 1g TDS PRN. Increase fluids. Avoid screen time. Return if fever exceeds 39°C or symptoms worsen after 5 days.',
  },
  {
    subjective: 'Patient reports good medication compliance but morning BP readings at home averaging 145/92 mmHg. Mild pedal oedema noted. Denies chest pain.',
    objective: 'BP: 148/94 mmHg (right arm, seated). Weight 78kg (+2kg since last visit). Trace ankle oedema. Heart sounds normal, no S3/S4.',
    assessment: 'Hypertension — suboptimally controlled. Possible fluid retention from dietary sodium excess.',
    plan: 'Increase Amlodipine from 5mg to 10mg daily. DASH diet counselling. Sodium restriction. 4-week BP diary. Follow-up in 4 weeks.',
  },
  {
    subjective: 'Patient with Type 2 Diabetes reports improved dietary adherence over last 6 weeks. Fasting glucose home readings: 6.5–8.2 mmol/L. HbA1c pending.',
    objective: 'Weight 91kg (BMI 28.4). BP 132/80 mmHg. Feet: no ulcers, peripheral pulses present bilaterally. Random glucose 7.8 mmol/L.',
    assessment: 'Type 2 Diabetes — improving glycaemic control. Continue current regimen. Microalbuminuria screen needed.',
    plan: 'Continue Metformin 500mg BD. Request HbA1c, lipogram, urine microalbumin. Dietitian referral. Encourage 30min walk daily. Follow-up 8 weeks.',
  },
  {
    subjective: 'Routine annual review. Patient feels well. No specific complaints. Last cholesterol done 2 years ago. Non-smoker, occasional alcohol.',
    objective: 'BMI 24.1. BP 118/76 mmHg. HR 68 bpm. Abdomen: soft, non-tender. No lymphadenopathy. Skin clear.',
    assessment: 'Healthy adult. Preventative care visit. High-normal LDL historically.',
    plan: 'Full blood count, lipogram, glucose, thyroid function tests ordered. Flu vaccination administered. PSA discussed. Follow-up on results in 2 weeks.',
  },
];

const consultationsToAdd = [];
for (let i = 0; i < 12; i++) {
  const isUpcoming = i < 4;
  const patient = patients[i % patients.length];
  const date = isUpcoming
    ? addDays(new Date(), rand(1, 14))
    : subDays(new Date(), rand(1, 45));
  const status = isUpcoming ? pick(['scheduled', 'confirmed']) : pick(['completed', 'completed', 'completed', 'cancelled']);
  const hasSoap = status === 'completed';
  const hasRisk = hasSoap && Math.random() > 0.5;
  const riskScore = hasRisk ? rand(20, 85) : undefined;

  consultationsToAdd.push({
    patientId: patient._id,
    practitionerId: oliver._id,
    facilityId: facility?._id,
    type: pick(['video', 'video', 'chat', 'in_person']),
    status,
    scheduledStartTime: date,
    scheduledEndTime: new Date(date.getTime() + 30 * 60000),
    minutesAllocated: 30,
    minutesUsed: hasSoap ? rand(18, 30) : 0,
    chiefComplaint: complaints[i % complaints.length],
    clinicalRisk: riskScore ? {
      score: riskScore,
      color: riskScore > 70 ? 'red' : riskScore > 40 ? 'gray' : 'green',
      factors: [
        pick(['Elevated BP', 'High Glucose', 'Irregular Pulse', 'Respiratory Distress']),
        pick(['Smoking History', 'Sedentary Lifestyle', 'Family History CVD']),
      ],
    } : undefined,
    soapNotes: hasSoap ? {
      ...soapTemplates[i % soapTemplates.length],
      signedAt: new Date(date.getTime() + 40 * 60000),
      signedByDr: 'Dr. Oliver Mitchell',
    } : undefined,
  });
}

await Consultation.insertMany(consultationsToAdd);
console.log(`   ✅ ${consultationsToAdd.length} consultations added`);

// ─────────────────────────────────────────────────────────────────────────────
// 2. SECURE MESSAGES
// ─────────────────────────────────────────────────────────────────────────────
console.log('💬 Seeding message threads for Dr. Oliver...');

const messageExchanges = [
  [
    { from: 'patient', text: 'Good morning Dr. Mitchell, my BP reading this morning was 148/94. Should I be concerned?' },
    { from: 'doctor', text: 'Good morning. That reading is a bit elevated above your target of 130/80. Have you taken your Amlodipine today? Also, try to rest for 10 minutes before measuring.' },
    { from: 'patient', text: 'Yes I took it with breakfast. I\'ll try again in an hour and let you know.' },
    { from: 'doctor', text: 'Good. If the second reading is still above 150/95, please come in or contact the practice directly. Otherwise I\'ll see it at our follow-up on Thursday.' },
    { from: 'patient', text: 'Second reading was 138/88. Much better. Thank you Doctor!' },
  ],
  [
    { from: 'patient', text: 'Dr Mitchell, I forgot to ask during our consultation — can I take ibuprofen for my knee pain given my BP medication?' },
    { from: 'doctor', text: 'Good question. I would avoid ibuprofen and other NSAIDs with your current antihypertensive regimen. They can raise blood pressure and reduce the effectiveness of your medication. Use paracetamol 1g up to 4 times daily instead. Ice the knee for 20 minutes every 2 hours.' },
    { from: 'patient', text: 'Understood, thank you for the quick response!' },
  ],
  [
    { from: 'patient', text: 'Hello Dr. I received my blood results. The lab flagged LDL at 4.2 mmol/L. What does that mean?' },
    { from: 'doctor', text: 'Thank you for sharing. An LDL of 4.2 mmol/L is above the recommended target of below 3.0 for your risk profile. I would like to start you on a low-dose statin. Can you come in early next week so we can discuss and formalise the prescription?' },
    { from: 'patient', text: 'Yes, Tuesday at 10am works for me.' },
    { from: 'doctor', text: 'Perfect. I have noted Tuesday 10am. Please bring all your current medications to the appointment.' },
  ],
  [
    { from: 'patient', text: 'Hi Doctor, my glucose readings have been much more stable this week — between 5.8 and 7.2 throughout the day. I think the dietary changes are working!' },
    { from: 'doctor', text: 'That is excellent news! Consistent readings in that range suggest your body is responding well to the lifestyle modifications. Keep up the great work. We will do a formal HbA1c in 6 weeks to confirm the improvement.' },
    { from: 'patient', text: 'Thank you Dr. Mitchell. I feel so much better with more energy. The 30 minute walks are helping too.' },
    { from: 'doctor', text: 'Wonderful to hear. Physical activity has a profound effect on insulin sensitivity. Keep the regimen consistent and document your readings in the app.' },
  ],
];

for (let i = 0; i < messageExchanges.length; i++) {
  const patient = patients[i % patients.length];
  const conv = await Conversation.create({
    patientId: patient._id,
    practitionerId: oliver._id,
    status: 'active',
    startedAt: subDays(new Date(), rand(1, 20)),
    minutesAllocated: 30,
  });

  const exchange = messageExchanges[i];
  for (let k = 0; k < exchange.length; k++) {
    const isFromPatient = exchange[k].from === 'patient';
    await Message.create({
      conversationId: conv._id,
      senderId: isFromPatient ? patient._id : oliver._id,
      receiverId: isFromPatient ? oliver._id : patient._id,
      content: exchange[k].text,
      isRead: true,
      createdAt: subDays(new Date(), exchange.length - k),
    });
  }
}
console.log(`   ✅ ${messageExchanges.length} message threads added`);

// ─────────────────────────────────────────────────────────────────────────────
// 3. NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────
console.log('🔔 Seeding notifications for Dr. Oliver...');

await Notification.insertMany([
  { userId: oliver._id, type: 'new_appointment', title: 'New Consultation Request', body: `Thandiwe Mokoena has requested a video consultation for Thursday at 10:00 AM.`, isRead: false, createdAt: subDays(new Date(), 0) },
  { userId: oliver._id, type: 'message', title: 'New Secure Message', body: `John Dlamini sent you a message regarding his latest glucose readings.`, isRead: false, createdAt: subDays(new Date(), 1) },
  { userId: oliver._id, type: 'lab_result', title: 'Lab Results Available', body: `Patient lab results for Lipogram (LDL, HDL, Triglycerides) are now available for review.`, isRead: false, createdAt: subDays(new Date(), 1) },
  { userId: oliver._id, type: 'system', title: 'HPCSA Renewal Reminder', body: `Your HPCSA practitioner license renewal is due in 45 days. Please initiate the renewal process.`, isRead: true, createdAt: subDays(new Date(), 3) },
  { userId: oliver._id, type: 'payout', title: 'Payout Processed', body: `Your earnings payout of R4,850.00 for the period ending 31 March 2026 has been processed to FNB ****3344.`, isRead: true, createdAt: subDays(new Date(), 7) },
]);
console.log('   ✅ 5 notifications added');

// ─────────────────────────────────────────────────────────────────────────────
// 4. HEALTH ARTICLES (authored by Dr. Oliver)
// ─────────────────────────────────────────────────────────────────────────────
console.log('✍️  Seeding Dr. Oliver\'s health articles...');

const existingArticles = await Article.find({ slug: { $in: ['primary-care-burnout-sa', 'understanding-hypertension-myths'] } });
if (existingArticles.length === 0) {
  await Article.insertMany([
    {
      title: 'Understanding Hypertension: The Silent Killer in South Africa',
      slug: 'understanding-hypertension-south-africa',
      excerpt: 'Hypertension affects 1 in 3 South African adults. Most don\'t know they have it. Here\'s what you need to know to protect yourself.',
      content: `<h2>The Numbers Are Alarming</h2>
      <p>South Africa has one of the highest rates of hypertension in sub-Saharan Africa. According to the South African Heart Association, over 6 million South Africans are living with uncontrolled high blood pressure — many without any symptoms at all.</p>
      <h3>What is "Normal" Blood Pressure?</h3>
      <p>A reading below 120/80 mmHg is considered optimal. Readings between 130–139/80–89 mmHg indicate Stage 1 hypertension, and anything above 140/90 mmHg requires clinical management.</p>
      <h3>Risk Factors You Can Control</h3>
      <ul>
        <li>Salt intake — South Africans consume almost double the WHO recommended limit of 5g/day.</li>
        <li>Physical inactivity — A sedentary lifestyle increases risk by up to 50%.</li>
        <li>Obesity — A BMI above 30 significantly elevates cardiovascular risk.</li>
        <li>Chronic stress — Cortisol spikes transiently raise BP and chronically damage vessel walls.</li>
      </ul>
      <h3>What Can You Do Today?</h3>
      <p>The good news is that lifestyle modifications alone can reduce systolic BP by 10–20 mmHg. Start with a 30-minute walk daily, reduce your salt intake, and use a digital platform like 24/7 DigiHealth to log your readings consistently.</p>
      <p>Early detection saves lives. Schedule your next BP screening today.</p>`,
      coverImage: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&q=80&w=800',
      author: 'Dr. Oliver Mitchell',
      tags: ['Hypertension', 'Preventative Care', 'Cardiology'],
      likes: 284,
      isPublished: true,
      publishedAt: subDays(new Date(), 18),
      readTimeMinutes: 5,
    },
    {
      title: 'Primary Care in the Digital Age: How Telehealth is Changing Doctor–Patient Relationships',
      slug: 'primary-care-telehealth-digital-age',
      excerpt: 'Digital consultations are not just convenient — they are reshaping how we deliver preventative primary care at scale.',
      content: `<h2>Beyond the Waiting Room</h2>
      <p>As a General Practitioner, I have witnessed firsthand how the pandemic accelerated what would have taken a decade of adoption in telehealth services. What started as a necessity has evolved into a powerful complement to in-person care.</p>
      <h3>What Works Well Remotely?</h3>
      <p>Approximately 70% of primary care consultations can be effectively managed through a secure video or chat consultation platform. These include:</p>
      <ul>
        <li>Follow-up consultations for chronic conditions (hypertension, diabetes, asthma)</li>
        <li>Mental health check-ins and medication reviews</li>
        <li>Script renewals and lab result discussions</li>
        <li>Minor acute presentations (URTI, skin rashes, gastroenteritis)</li>
      </ul>
      <h3>The Limitations We Must Acknowledge</h3>
      <p>As valuable as telehealth is, a physical examination remains irreplaceable in many scenarios. Auscultation of heart sounds, palpation of an abdomen, or a formal neurological examination cannot be replicated through a screen. Hybrid models are the future — not purely digital, not purely physical.</p>
      <h3>A Note on Trust</h3>
      <p>The doctor-patient relationship is built on trust, empathy, and communication. These values translate beautifully into digital formats when approached with intentionality. Eye contact through a camera, active listening, and clear explanations matter just as much on screen as they do in a consulting room.</p>`,
      coverImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800',
      author: 'Dr. Oliver Mitchell',
      tags: ['Telehealth', 'Primary Care', 'Digital Health'],
      likes: 197,
      isPublished: true,
      publishedAt: subDays(new Date(), 32),
      readTimeMinutes: 7,
    },
  ]);
  console.log('   ✅ 2 articles by Dr. Oliver added');
} else {
  console.log('   ℹ️  Articles already exist, skipping');
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. HEALTH TIPS (authored by Dr. Oliver)
// ─────────────────────────────────────────────────────────────────────────────
console.log('💡 Seeding Dr. Oliver\'s health tips...');

await HealthTip.insertMany([
  { title: 'Measure BP at the Same Time Daily', excerpt: 'Consistency in timing gives you comparable data. Always measure in the morning before medication for accurate trending.', content: 'Measure your blood pressure at the same time each day — ideally in the morning before taking any medication and after sitting quietly for 5 minutes. This ensures that your readings are comparable day-to-day and gives your doctor the most accurate picture of your BP trend.', author: 'Dr. Oliver Mitchell', date: subDays(new Date(), 1).toISOString().split('T')[0], readTime: '2 min', tag: 'Hypertension', category: 'tip' },
  { title: 'The 10-3-2-1-0 Sleep Rule', excerpt: 'This simple framework can transform your sleep quality without medication.', content: 'No caffeine 10 hours before bed. No alcohol 3 hours before bed. No food 2 hours before bed. No screens 1 hour before bed. Zero snooze alarms in the morning. Following this framework consistently can significantly improve sleep architecture and daytime energy levels.', author: 'Dr. Oliver Mitchell', date: subDays(new Date(), 3).toISOString().split('T')[0], readTime: '2 min', tag: 'Sleep', category: 'tip' },
  { title: 'Know Your 5 Critical Health Numbers', excerpt: 'Blood pressure, glucose, cholesterol, BMI, and waist circumference — your essential health dashboard.', content: 'Every adult should know their: (1) Blood Pressure — target below 130/80 mmHg; (2) Fasting Glucose — below 5.6 mmol/L; (3) LDL Cholesterol — below 3.0 mmol/L; (4) BMI — between 18.5–24.9; (5) Waist Circumference — below 88cm for women, below 102cm for men. These five numbers together paint a comprehensive picture of your cardiovascular and metabolic risk.', author: 'Dr. Oliver Mitchell', date: subDays(new Date(), 6).toISOString().split('T')[0], readTime: '3 min', tag: 'Preventative Care', category: 'tip' },
]);
console.log('   ✅ 3 health tips by Dr. Oliver added');

// ─────────────────────────────────────────────────────────────────────────────
// 6. PROFILE ENRICHMENT (avatar, mobile, trustedDevices)
// ─────────────────────────────────────────────────────────────────────────────
console.log('👤 Enriching Dr. Oliver\'s profile...');

await User.updateOne(
  { _id: oliver._id },
  {
    $set: {
      mobile: '+27 11 484 5000',
      avatarUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200',
      mfaEnabled: true,
      notificationPrefs: { email: true, push: true, sms: false },
      trustedDevices: [
        { id: 'session-macbook', name: 'MacBook Pro (Clinic)', lastUsed: 'Active now', active: true },
        { id: 'session-iphone', name: 'iPhone 15 Pro (Personal)', lastUsed: '2 hours ago', active: false },
        { id: 'session-ipad', name: 'iPad Pro (Ward)', lastUsed: 'Yesterday', active: false },
      ],
    }
  }
);
console.log('   ✅ Profile enriched');

// ─────────────────────────────────────────────────────────────────────────────
// DONE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n🎉 Dr. Oliver Mitchell\'s dashboard data seeded successfully!\n');
console.log('  📅  12 consultations (4 upcoming, 8 historical with SOAP notes)');
console.log('  💬   4 rich patient message threads');
console.log('  🔔   5 targeted notifications');
console.log('  ✍️    2 authored clinical articles');
console.log('  💡   3 health tips');
console.log('  👤   Profile enriched (avatar, mobile, MFA, devices)\n');

await mongoose.disconnect();
process.exit(0);
