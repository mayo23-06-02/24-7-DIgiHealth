/**
 * seedHospital.mjs — Standalone seed script for 24/7 DigiHealth Hospital Dashboard
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/digihealth';

// ─── Inline Schemas ──────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true },
  firstName: String,
  lastName: String,
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  status: String,
  profile: Object
}, { timestamps: true });

const FacilitySchema = new mongoose.Schema({
  name: String,
  type: String,
  contactNo: String,
  email: String,
  website: String,
  location: Object,
  status: String,
  operatingHours: Object
}, { timestamps: true });

const BedSchema = new mongoose.Schema({
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  ward: String,
  bedNumber: String,
  status: String,
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String
}, { timestamps: true });

const BedOccupancySchema = new mongoose.Schema({
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  timestamp: { type: Date, default: Date.now },
  totalBeds: Number,
  occupiedBeds: Number,
  icuOccupied: Number,
  icuTotal: Number,
  emergencyOccupied: Number,
  emergencyTotal: Number,
}, { timestamps: true });

const StaffSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  role: String,
  department: String,
  shiftSchedule: Object,
  isOnDuty: Boolean,
  hourlyRate: Number,
  qualifications: [String]
}, { timestamps: true });

const HospitalAppointmentSchema = new mongoose.Schema({
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  practitionerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: String,
  scheduledStart: Date,
  scheduledEnd: Date,
  status: String,
  room: String
}, { timestamps: true });

const HospitalTransactionSchema = new mongoose.Schema({
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: Number,
  type: String,
  status: String,
  paymentMethod: String,
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

const EmergencyIncidentSchema = new mongoose.Schema({
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  ambulanceId: String,
  patientName: String,
  etaMinutes: Number,
  status: String,
  triageLevel: String,
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });


const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Facility = mongoose.models.Facility || mongoose.model('Facility', FacilitySchema);
const Bed = mongoose.models.Bed || mongoose.model('Bed', BedSchema);
const BedOccupancy = mongoose.models.BedOccupancy || mongoose.model('BedOccupancy', BedOccupancySchema);
const Staff = mongoose.models.Staff || mongoose.model('Staff', StaffSchema);
const HospitalAppointment = mongoose.models.HospitalAppointment || mongoose.model('HospitalAppointment', HospitalAppointmentSchema);
const HospitalTransaction = mongoose.models.HospitalTransaction || mongoose.model('HospitalTransaction', HospitalTransactionSchema);
const EmergencyIncident = mongoose.models.EmergencyIncident || mongoose.model('EmergencyIncident', EmergencyIncidentSchema);


async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create a facility
    const facilityData = {
      name: "DigiHealth General Hospital",
      type: "private",
      contactNo: "+27 11 555 0100",
      email: "info@digihealth.co.za",
      website: "https://digihealth.co.za",
      location: {
        address: "123 Health Ave",
        city: "Johannesburg",
        province: "Gauteng",
        postalCode: "2000",
        country: "South Africa"
      },
      status: "active",
      operatingHours: { open24Hours: true }
    };

    let facility = await Facility.findOne({ name: "DigiHealth General Hospital" });
    if (!facility) {
      facility = await Facility.create(facilityData);
      console.log('🏢 Created facility: DigiHealth General Hospital');
    }

    // Connect to existing users from seed.mjs
    let adminUser = await User.findOne({ role: 'hospital_admin' });
    if (!adminUser) {
      adminUser = await User.create({
        email: 'admin@digihealth.co.za',
        passwordHash: 'hashedpassword',
        firstName: 'System',
        lastName: 'Admin',
        role: 'hospital_admin',
        facilityId: facility._id,
        status: 'active'
      });
      console.log('👤 Created hospital admin user: admin@digihealth.co.za');
    } else {
        await User.findByIdAndUpdate(adminUser._id, { facilityId: facility._id });
    }

    // Try finding patients / practitioners from existing seed data
    let patient = await User.findOne({ role: 'patient' });
    if (!patient) {
        patient = await User.create({
            email: 'patient@example.com',
            passwordHash: 'hashedpassword',
            firstName: 'John',
            lastName: 'Doe',
            role: 'patient',
            status: 'active'
        });
        console.log('👤 Created fallback patient user');
    }

    let practitioner = await User.findOne({ role: 'practitioner' });
    if (!practitioner) {
        practitioner = await User.create({
            email: 'dr@example.com',
            passwordHash: 'hashedpassword',
            firstName: 'Jane',
            lastName: 'Smith',
            role: 'practitioner',
            facilityId: facility._id,
            status: 'active'
        });
        console.log('👤 Created fallback practitioner user');
    } else {
        await User.findByIdAndUpdate(practitioner._id, { facilityId: facility._id });
    }

    const allPatients = await User.find({ role: 'patient' });
    
    // Clear existing to avoid duplicates in mock data
    await Bed.deleteMany({ facilityId: facility._id });
    await BedOccupancy.deleteMany({ facilityId: facility._id });
    await Staff.deleteMany({ facilityId: facility._id });
    await HospitalAppointment.deleteMany({ facilityId: facility._id });
    await HospitalTransaction.deleteMany({ facilityId: facility._id });
    await EmergencyIncident.deleteMany({ facilityId: facility._id });

    console.log('🗑️ Cleared existing hospital mock data');

    // 50 Beds (20 general, 10 ICU, 20 emergency) ~ 60% occupied
    const beds = [];
    let occCount = 0, icuOcc = 0, emOcc = 0;
    
    for (let i = 1; i <= 20; i++) {
      const isOccupied = Math.random() < 0.6;
      if(isOccupied) occCount++;
      const assignedPatient = isOccupied ? allPatients[Math.floor(Math.random() * allPatients.length)] : null;
      beds.push({
        facilityId: facility._id,
        ward: 'general',
        bedNumber: `G-${i}`,
        status: isOccupied ? 'occupied' : 'available',
        patientId: assignedPatient ? assignedPatient._id : null
      });
    }

    for (let i = 1; i <= 10; i++) {
        const isOccupied = Math.random() < 0.6;
        if(isOccupied) { occCount++; icuOcc++; }
        const assignedPatient = isOccupied ? allPatients[Math.floor(Math.random() * allPatients.length)] : null;
        beds.push({
          facilityId: facility._id,
          ward: 'icu',
          bedNumber: `ICU-${i}`,
          status: isOccupied ? 'occupied' : 'available',
          patientId: assignedPatient ? assignedPatient._id : null
        });
    }

    for (let i = 1; i <= 20; i++) {
        const isOccupied = Math.random() < 0.6;
        if(isOccupied) { occCount++; emOcc++; }
        const assignedPatient = isOccupied ? allPatients[Math.floor(Math.random() * allPatients.length)] : null;
        beds.push({
            facilityId: facility._id,
            ward: 'emergency',
            bedNumber: `ER-${i}`,
            status: isOccupied ? 'occupied' : 'available',
            patientId: assignedPatient ? assignedPatient._id : null
        });
    }

    await Bed.insertMany(beds);
    console.log(`🛏️ Inserted ${beds.length} beds (Occupied: ${occCount})`);

    await BedOccupancy.create({
        facilityId: facility._id,
        totalBeds: 50,
        occupiedBeds: occCount,
        icuTotal: 10,
        icuOccupied: icuOcc,
        emergencyTotal: 20,
        emergencyOccupied: emOcc
    });
    console.log('📈 Inserted bed occupancy snapshot');

    // 30 Staff
    const staffMembers = [];
    const roles = ['doctor', 'nurse', 'admin', 'technician'];
    for(let i=1; i<=30; i++) {
        staffMembers.push({
            facilityId: facility._id,
            role: roles[Math.floor(Math.random() * roles.length)],
            department: ['Cardiology', 'Emergency', 'Pediatrics', 'Surgery'][Math.floor(Math.random() * 4)],
            shiftSchedule: { start: "08:00", end: "16:00", days: [1,2,3,4,5] },
            isOnDuty: Math.random() > 0.5,
            hourlyRate: Math.floor(Math.random() * 500) + 100,
            qualifications: ["MBChB", "ACLS"]
        });
    }
    await Staff.insertMany(staffMembers);
    console.log('👩‍⚕️ Inserted 30 staff records');

    // 100 Appointments
    const appointments = [];
    for(let i=0; i<100; i++) {
        const d = new Date();
        d.setDate(d.getDate() - 15 + Math.floor(Math.random() * 30));
        const assignedPatient = allPatients[Math.floor(Math.random() * allPatients.length)];
        appointments.push({
            facilityId: facility._id,
            patientId: assignedPatient._id,
            practitionerId: practitioner._id, // Assigning to main practitioner
            type: ['consultation', 'procedure', 'lab'][Math.floor(Math.random() * 3)],
            scheduledStart: d,
            scheduledEnd: new Date(d.getTime() + 30 * 60000),
            status: d > new Date() ? 'scheduled' : 'completed',
            room: `R-${Math.floor(Math.random() * 20)+1}`
        });
    }
    await HospitalAppointment.insertMany(appointments);
    console.log('📅 Inserted 100 hospital appointments');

    // 200 Transactions
    const transactions = [];
    for(let i=0; i<200; i++) {
        const d = new Date();
        d.setDate(d.getDate() - Math.floor(Math.random() * 30));
        const assignedPatient = allPatients[Math.floor(Math.random() * allPatients.length)];
        transactions.push({
            facilityId: facility._id,
            patientId: assignedPatient._id,
            amount: Math.floor(Math.random() * 5000) + 500,
            type: ['consultation_fee', 'procedure', 'pharmacy'][Math.floor(Math.random() * 3)],
            status: Math.random() > 0.2 ? 'paid' : 'pending',
            paymentMethod: ['cash', 'card', 'medical_aid'][Math.floor(Math.random() * 3)],
            timestamp: d
        });
    }
    await HospitalTransaction.insertMany(transactions);
    console.log('💳 Inserted 200 hospital billing transactions');

    // 10 Emergency Incidents
    const emergencies = [];
    for(let i=0; i<10; i++) {
        emergencies.push({
            facilityId: facility._id,
            ambulanceId: `AMB-${100+i}`,
            patientName: `Emergency Patient ${i}`,
            etaMinutes: Math.floor(Math.random() * 45) + 5,
            status: 'en_route',
            triageLevel: ['red', 'yellow', 'green'][Math.floor(Math.random() * 3)]
        });
    }
    await EmergencyIncident.insertMany(emergencies);
    console.log('🚑 Inserted 10 emergency incidents');

    console.log('\n🎉 Hospital Seeding Complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
}

seed();
