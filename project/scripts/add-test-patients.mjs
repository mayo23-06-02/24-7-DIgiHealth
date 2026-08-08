import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://Mayo:ozl2Fd51bM1uhEZm@ac-xtoaiei-shard-00-00.cqsjwqi.mongodb.net:27017,ac-xtoaiei-shard-00-01.cqsjwqi.mongodb.net:27017,ac-xtoaiei-shard-00-02.cqsjwqi.mongodb.net:27017/digihealth?ssl=true&replicaSet=atlas-r7ie47-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";

// --- Minimal Schemas ---
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['patient', 'practitioner'], default: 'patient' },
  firstName: String,
  lastName: String,
  profile: {
    fullName: String,
    avatarUrl: String,
  }
}, { timestamps: true });

const PatientSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  dateOfBirth: Date,
  mobileNumber: String,
  medicalHistory: [String],
  allergies: [String],
  currentMedications: [String],
  bloodType: String,
}, { timestamps: true });

const ConsultationSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  practitionerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  scheduledStart: Date,
  scheduledEnd: Date,
  status: { type: String, default: 'scheduled' },
  type: { type: String, default: 'video' },
  reason: String,
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Patient = mongoose.models.Patient || mongoose.model('Patient', PatientSchema);
const Consultation = mongoose.models.Consultation || mongoose.model('Consultation', ConsultationSchema);

async function addPatients() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  const practitionerId = "69dc43f8a541f65b5b66f523";
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Male Patient
  const maleEmail = `mark.davies.${Date.now()}@test.com`;
  const maleUser = await User.create({
    email: maleEmail,
    passwordHash,
    role: 'patient',
    firstName: 'Mark',
    lastName: 'Davies',
    profile: {
      fullName: 'Mark Davies',
      avatarUrl: 'https://ui-avatars.com/api/?name=Mark+Davies&background=4493b8&color=fff'
    }
  });

  await Patient.create({
    userId: maleUser._id,
    gender: 'male',
    dateOfBirth: new Date('1985-06-15'),
    mobileNumber: '+27821234567',
    medicalHistory: ['Mild Hypertension'],
    allergies: ['Dust Mites'],
    currentMedications: ['Lisinopril 5mg'],
    bloodType: 'A+'
  });
  console.log(`✅ Added Male Patient: ${maleEmail}`);

  // Add Consultation for Mark
  await Consultation.create({
    patientId: malePatient._id,
    practitionerId,
    scheduledStart: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
    scheduledEnd: new Date(Date.now() + 1000 * 60 * 90),
    status: 'scheduled',
    type: 'video',
    reason: 'Hypertension follow-up'
  });

  // 2. Female Patient
  const femaleEmail = `sarah.watson.${Date.now()}@test.com`;
  const femaleUser = await User.create({
    email: femaleEmail,
    passwordHash,
    role: 'patient',
    firstName: 'Sarah',
    lastName: 'Watson',
    profile: {
      fullName: 'Sarah Watson',
      avatarUrl: 'https://ui-avatars.com/api/?name=Sarah+Watson&background=4493b8&color=fff'
    }
  });

  const femalePatient = await Patient.create({
    userId: femaleUser._id,
    gender: 'female',
    dateOfBirth: new Date('1992-03-22'),
    mobileNumber: '+27719876543',
    medicalHistory: ['Asthma'],
    allergies: ['Penicillin'],
    currentMedications: ['Salbutamol Inhaler'],
    bloodType: 'O-'
  });
  console.log(`✅ Added Female Patient: ${femaleEmail}`);

  // Add Consultation for Sarah
  await Consultation.create({
    patientId: femalePatient._id,
    practitionerId,
    scheduledStart: new Date(Date.now() + 1000 * 60 * 120), // 2 hours from now
    scheduledEnd: new Date(Date.now() + 1000 * 60 * 150),
    status: 'scheduled',
    type: 'video',
    reason: 'Asthma review'
  });

  await mongoose.disconnect();
  console.log('Done.');
}

addPatients().catch(err => {
  console.error('Error seeding patients:', err);
  process.exit(1);
});
