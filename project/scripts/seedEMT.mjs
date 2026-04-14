import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/digihealth';

// Inline Schemas
const UserSchema = new mongoose.Schema({
  email: String, passwordHash: String, role: String, status: String,
  firstName: String, lastName: String, saId: String, mobile: String
}, { timestamps: true });

const EMTProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  licenseLevel: String, hpcsaNumber: String, assignedVehicle: String, 
  assignedFacilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  shiftSchedule: { start: String, end: String, days: [Number] },
  currentStatus: String, offlineMapsRegion: String,
  equipmentChecklist: [{ item: String, status: Boolean, updatedAt: Date }]
});

const EmergencyDispatchSchema = new mongoose.Schema({
  dispatchId: String, emtId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  callerPhone: String, priority: String, status: String,
  incidentLocation: { address: String, coordinates: [Number] },
  targetFacilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  timeline: [{ status: String, timestamp: Date, location: [Number] }],
  vitals: [{ timestamp: Date, bp: String, hr: Number, spo2: Number, gcs: Number }],
  handoffNotes: String, distanceDriven: Number
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const EMTProfile = mongoose.models.EMTProfile || mongoose.model('EMTProfile', EMTProfileSchema);
const EmergencyDispatch = mongoose.models.EmergencyDispatch || mongoose.model('EmergencyDispatch', EmergencyDispatchSchema);

async function seedEMT() {
  await mongoose.connect(MONGODB_URI);
  console.log('🌱 Connected to MongoDB for EMT Seeding...');

  // 1. Clear old EMT data
  await EMTProfile.deleteMany({});
  await EmergencyDispatch.deleteMany({});
  // Only remove EMT users
  await User.deleteMany({ role: 'emt' });

  // 2. Get some patients and facilities for linking
  const patients = await User.find({ role: 'patient' }).limit(5);
  const facilities = await mongoose.model('Facility', new mongoose.Schema({})).find().limit(2);

  if (patients.length === 0 || facilities.length === 0) {
    console.error('❌ Patients or Facilities not found. Run main seed script first.');
    process.exit(1);
  }

  const hashPassword = (p) => bcrypt.hashSync(p, 10);

  // 3. Create EMT Users
  const emtData = [
    { email: 'emt.john@24-7.co.za', firstName: 'John', lastName: 'Rescuer', vehicle: 'AMB-101', level: 'ALS' },
    { email: 'emt.sarah@24-7.co.za', firstName: 'Sarah', lastName: 'Medic', vehicle: 'AMB-202', level: 'BLS' }
  ];

  for (const emt of emtData) {
    const user = await User.create({
      email: emt.email,
      passwordHash: hashPassword('Password123!'),
      role: 'emt',
      status: 'active',
      firstName: emt.firstName,
      lastName: emt.lastName,
      mobile: '+2782' + Math.floor(1000000 + Math.random() * 9000000)
    });

    await EMTProfile.create({
      userId: user._id,
      licenseLevel: emt.level,
      hpcsaNumber: 'EMT' + Math.floor(100000 + Math.random() * 900000),
      assignedVehicle: emt.vehicle,
      assignedFacilityId: facilities[0]._id,
      shiftSchedule: { start: '06:00', end: '18:00', days: [1, 2, 3, 4, 5] },
      currentStatus: 'available',
      offlineMapsRegion: 'Gauteng-South',
      equipmentChecklist: [
        { item: 'Defibrillator', status: true, updatedAt: new Date() },
        { item: 'Oxygen Tank', status: true, updatedAt: new Date() },
        { item: 'Airway Kit', status: true, updatedAt: new Date() }
      ]
    });

    // 4. Create an active dispatch for John
    if (emt.firstName === 'John') {
      await EmergencyDispatch.create({
        dispatchId: 'DISP-' + Math.floor(10000 + Math.random() * 90000),
        emtId: user._id,
        patientId: patients[0]._id,
        callerPhone: '+2772' + Math.floor(1000000 + Math.random() * 9000000),
        priority: 'red',
        status: 'en_route',
        incidentLocation: { 
          address: '123 Sandton Dr, Sandton, Johannesburg', 
          coordinates: [28.0567, -26.1076] 
        },
        targetFacilityId: facilities[0]._id,
        timeline: [
          { status: 'pending', timestamp: new Date(Date.now() - 15 * 60000) },
          { status: 'en_route', timestamp: new Date(Date.now() - 5 * 60000), location: [28.05, -26.11] }
        ]
      });
    }

    // 5. Create history dispatches
    for (let i = 0; i < 5; i++) {
        await EmergencyDispatch.create({
            dispatchId: 'HIST-' + Math.floor(10000 + Math.random() * 90000),
            emtId: user._id,
            patientId: patients[i % patients.length]._id,
            callerPhone: '+2772' + Math.floor(1000000 + Math.random() * 9000000),
            priority: ['red', 'yellow', 'green'][i % 3],
            status: 'completed',
            incidentLocation: { 
                address: (10 + i) + ' Random St, Johannesburg', 
                coordinates: [28.0 + (i * 0.01), -26.2 + (i * 0.01)] 
            },
            targetFacilityId: facilities[i % facilities.length]._id,
            vitals: [
                { timestamp: new Date(Date.now() - (i + 1) * 86400000), bp: '120/80', hr: 75, spo2: 98, gcs: 15 }
            ],
            handoffNotes: 'Patient stable upon arrival at facility.',
            distanceDriven: 12 + i
        });
    }
  }

  console.log('✅ EMT Seeding Finished!');
  await mongoose.disconnect();
}

seedEMT().catch(err => {
  console.error(err);
  process.exit(1);
});
