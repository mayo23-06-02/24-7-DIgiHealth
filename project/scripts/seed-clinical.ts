import { connectToDatabase } from '../lib/mongodb';
import mongoose from 'mongoose';

async function seed() {
  await connectToDatabase();
  console.log("Connected to seed data...");
  
  // Ensure models are registered
  await import('../lib/models/User');
  await import('../lib/models/RoleProfiles');
  await import('../lib/models/Consultation');
  await import('../lib/models/ClinicalData');

  const User = mongoose.models.User;
  const PractitionerProfile = mongoose.models.PractitionerProfile;
  const Consultation = mongoose.models.Consultation;
  const Anthropometric = mongoose.models.Anthropometric;

  // 1. Create/Find Practitioner
  let doc = await User.findOne({ email: 'practitioner@247telehealth.co.za' });
  if (!doc) {
    doc = await User.create({
      firstName: 'Sarah',
      lastName: 'Jenkins',
      email: 'practitioner@247telehealth.co.za',
      passwordHash: '$2b$10$NRDwiT8ZtuzXCf9zMd5/beFva70YJcXY4UjY2v./LYDX5zgNwVaL.', // reuse a hash
      role: 'practitioner',
      isEmailVerified: true
    });
  }

  let profile = await PractitionerProfile.findOne({ userId: doc._id });
  if (!profile) {
    profile = await PractitionerProfile.create({
      userId: doc._id,
      specialisation: 'Cardiology Specialist',
      bio: 'Board-certified cardiologist with 15 years experience.',
      hpcsaNumber: 'MP123456',
      experienceYears: 15,
      consultationFee: 750,
      languages: ['English', 'Afrikaans'],
      availability: {
        monday: [{ start: '08:00', end: '17:00' }],
        tuesday: [{ start: '08:00', end: '17:00' }]
      }
    });
  }

  // 2. Create/Find Christine Zulauf
  let patient = await User.findOne({ email: 'christine_zulauf@hotmail.com' });
  if (!patient) {
    patient = await User.create({
      _id: new mongoose.Types.ObjectId('69dbef2745624cc31fd846c4'),
      firstName: 'Christine',
      lastName: 'Zulauf',
      email: 'christine_zulauf@hotmail.com',
      passwordHash: '$2b$10$NRDwiT8ZtuzXCf9zMd5/beFva70YJcXY4UjY2v./LYDX5zgNwVaL.',
      role: 'patient',
      isEmailVerified: true,
      saId: "6204765441392",
      mobile: "(467) 331-1894"
    });
  }

  // 3. Clear existing consultations for this patient to ensure fresh seed
  await Consultation.deleteMany({ patientId: patient._id });

  const now = new Date();
  
  // Upcoming 1: Video Consult
  await Consultation.create({
    patientId: patient._id,
    practitionerId: doc._id,
    type: 'video',
    status: 'scheduled',
    scheduledStartTime: new Date(now.getTime() + 86400000), // tomorrow
    scheduledEndTime: new Date(now.getTime() + 86400000 + 3600000),
    chiefComplaint: 'Monthly hypertension medication review'
  });

  // Upcoming 2: Chat Consult
  await Consultation.create({
    patientId: patient._id,
    practitionerId: doc._id,
    type: 'chat',
    status: 'scheduled',
    scheduledStartTime: new Date(now.getTime() + 86400000 * 3), // in 3 days
    scheduledEndTime: new Date(now.getTime() + 86400000 * 3 + 3600000),
    chiefComplaint: 'Questions about diet and sodium intake'
  });

  // Past 1: In-Person
  await Consultation.create({
    patientId: patient._id,
    practitionerId: doc._id,
    type: 'in_person',
    status: 'completed',
    scheduledStartTime: new Date(now.getTime() - 86400000 * 7), // 1 week ago
    scheduledEndTime: new Date(now.getTime() - 86400000 * 7 + 3600000),
    chiefComplaint: 'Initial full cardiac screening'
  });

  // Cancelled 1
  await Consultation.create({
    patientId: patient._id,
    practitionerId: doc._id,
    type: 'video',
    status: 'cancelled',
    scheduledStartTime: new Date(now.getTime() - 86400000 * 2), // 2 days ago
    scheduledEndTime: new Date(now.getTime() - 86400000 * 2 + 3600000),
    chiefComplaint: 'Quick consult on lightheadedness'
  });

  // 4. Seed Vitals for VitalsGrid
  await Anthropometric.deleteMany({ patientId: patient._id });
  await Anthropometric.create({
    patientId: patient._id,
    dateRecorded: now,
    weightKg: 68,
    heightCm: 165,
    vitalSigns: {
      heartRateBpm: 72,
      systolicBP: 118,
      diastolicBP: 76,
      spO2: 99,
      temperatureCelsius: 36.6
    }
  });

  console.log("Seeding complete for Christine Zulauf!");
  process.exit();
}

seed().catch(console.error);
