import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '../lib/mongodb';

// Import All Models to ensure they are registered
import User from '../lib/models/User';
import { Facility } from '../lib/models/Facility';
import Consultation from '../lib/models/Consultation';
import { PatientProfile, PractitionerProfile, EMTProfile } from '../lib/models/RoleProfiles';
import { EmergencyDispatch, AuditLog } from '../lib/models/TelehealthCore';
import { Anthropometric, Prescription, LabResult, MedicalContext } from '../lib/models/ClinicalData';
import Bed from '../lib/models/Bed';
import BedOccupancy from '../lib/models/BedOccupancy';
import Staff from '../lib/models/Staff';
import HospitalTransaction from '../lib/models/HospitalTransaction';
import HospitalAppointment from '../lib/models/HospitalAppointment';
import { Subscription } from '../lib/models/Billing'; 
import RiskScore from '../lib/models/RiskScore';
import Conversation from '../lib/models/Conversation';
import Message from '../lib/models/Message';

const SA_NAMES = [
  { first: 'Thandiwe', last: 'Mokoena' },
  { first: 'Sibusiso', last: 'Dlamini' },
  { first: 'Lerato', last: 'Zulu' },
  { first: 'Willem', last: 'de Klerk' },
  { first: 'Zanele', last: 'Ndlovu' },
  { first: 'Khosi', last: 'Molefe' },
  { first: 'Anke', last: 'van Wyk' },
  { first: 'Jabu', last: 'Khumalo' },
  { first: 'Pieter', last: 'Botha' },
  { first: 'Nomsa', last: 'Sithole' },
  { first: 'Lethabo', last: 'Gumede' },
  { first: 'Dmitri', last: 'Naidoo' },
  { first: 'Farrah', last: 'Khan' },
  { first: 'Chantal', last: 'September' },
  { first: 'Sizwe', last: 'Bhengu' }
];

const PROVINCES = ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Free State', 'Mpumalanga'];
const HOSPITALS = [
  { name: 'Netcare Milpark Hospital', city: 'Johannesburg', province: 'Gauteng' },
  { name: 'Mediclinic Morningside', city: 'Sandton', province: 'Gauteng' },
  { name: 'Groote Schuur Hospital', city: 'Cape Town', province: 'Western Cape' },
  { name: 'Life Fourways Hospital', city: 'Johannesburg', province: 'Gauteng' },
  { name: 'Busamed Gateway Private Hospital', city: 'Umhlanga', province: 'KwaZulu-Natal' }
];

const MEDICAL_AIDS = ['Discovery Health', 'Bonitas', 'Momentum', 'GEMS', 'Fedhealth'];

async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

const randItem = <T>(arr: T[]): T | undefined => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : undefined;
const subtractDays = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const addDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

async function seedDatabase() {
  try {
    await connectToDatabase();
    console.log('🌱 Connected to MongoDB Atlas');

    console.log('🗑️  Clearing existing simulation data...');
    // Drop in order to handle refs or just clear all
    const models = [
        User, Facility, Consultation, PatientProfile, PractitionerProfile, 
        EMTProfile, EmergencyDispatch, AuditLog, Anthropometric, Prescription, 
        LabResult, Bed, BedOccupancy, Staff, HospitalTransaction, 
        HospitalAppointment, Subscription, RiskScore, MedicalContext
    ];
    
    for (const model of models) {
        if (model && model.deleteMany) {
            await model.deleteMany({});
        }
    }
    console.log('✅ Collections purged.');

    // 1. FACILITIES (Major SA Hospitals)
    const facilities = [];
    for (const h of HOSPITALS) {
      const f = await Facility.create({
        name: h.name,
        facilityType: 'Private',
        contactInfo: {
            phone: `+27 ${faker.string.numeric(2)} ${faker.string.numeric(3)} ${faker.string.numeric(4)}`,
            email: `info@${h.name.toLowerCase().replace(/ /g, '')}.co.za`
        },
        address: {
          street: faker.location.streetAddress(),
          city: h.city,
          province: h.province,
          coordinates: [faker.location.longitude(), faker.location.latitude()]
        },
        bedCapacity: { total: 100, generalAvailable: 40, icuAvailable: 10 },
        isOpen: true,
        specialties: ['Emergency', 'Cardiology', 'General Surgery'],
        emergencyServices: true
      });
      facilities.push(f);
    }
    console.log(`🏥 Created ${facilities.length} SA Facilities`);

    // 2. USERS & PROFILES
    const passwordHash = await hashPassword('Password123!');

    // Patient: Thandiwe Mokoena
    const patientUser = await User.create({
      email: 'patient@24-7.co.za',
      passwordHash,
      role: 'patient',
      firstName: 'Thandiwe',
      lastName: 'Mokoena',
      status: 'active',
      saId: '9003125441088',
      mobile: '+27725551234',
      mfaEnabled: false
    });
    await PatientProfile.create({
      userId: patientUser._id,
      dateOfBirth: new Date('1990-03-12'),
      gender: 'female',
      emergencyContact: { name: 'Sizwe Mokoena', phone: '+27825559876', relationship: 'Brother' },
      medicalAid: { provider: 'Discovery Health', planName: 'Classic Priority', memberNumber: '987654321' },
      subscriptionTier: 'pro',
      popiaConsentDate: new Date('2024-01-01')
    });

    // Practitioner: Dr. Oliver Mitchell
    const practitionerUser = await User.create({
      email: 'practitioner@24-7.co.za',
      passwordHash,
      role: 'practitioner',
      firstName: 'Oliver',
      lastName: 'Mitchell',
      status: 'active',
      saId: '7805215112081',
      mobile: '+27834445555',
      mfaEnabled: false
    });
    await PractitionerProfile.create({
      userId: practitionerUser._id,
      specialisation: 'General Practitioner',
      hpcsaNumber: 'MP0123456',
      experienceYears: 15,
      consultationFee: 650,
      bio: 'Senior GP with extensive experience in acute care and telehealth diagnostics.',
      languages: ['English', 'Afrikaans', 'isiZulu'],
      acceptedMedicalAids: ['Discovery Health', 'Bonitas', 'Momentum'],
      affiliatedFacilityIds: [facilities[0]._id, facilities[1]._id],
      isOnline: true,
      bankAccount: {
          accountHolder: 'Oliver Mitchell',
          bankName: 'First National Bank',
          accountNumber: '62001122334',
          branchCode: '250655',
          taxNumber: '1234567890'
      }
    });

    // Hospital Admin: Willem de Klerk
    const adminUser = await User.create({
        email: 'admin@digihealth.co.za',
        passwordHash,
        role: 'hospital_admin',
        firstName: 'Willem',
        lastName: 'de Klerk',
        status: 'active',
        saId: '6504125001082',
        mobile: '+27821112222'
    });

    // EMT: John Rescuer
    const emtUser = await User.create({
        email: 'emt.john@24-7.co.za',
        passwordHash,
        role: 'emt',
        firstName: 'John',
        lastName: 'Rescuer',
        status: 'active',
        saId: '8810225113083',
        mobile: '+27712223333'
    });
    await EMTProfile.create({
        userId: emtUser._id,
        licenseLevel: 'ALS',
        hpcsaNumber: 'ANT001234',
        assignedVehicle: 'AMB-101 (NP 123-456)',
        assignedFacilityId: facilities[2]._id,
        currentStatus: 'en_route',
        shiftSchedule: { start: '06:00', end: '18:00', days: [1, 2, 3, 4, 5] },
        offlineMapsRegion: 'Gauteng-Central',
        equipmentChecklist: [
            { item: 'Defibrillator', status: true },
            { item: 'Oxygen Tank', status: true },
            { item: 'Airway Kit', status: true }
        ]
    });

    // Inspector: Sarah Molefe
    await User.create({
        email: 'inspector@24-7.co.za',
        passwordHash,
        role: 'inspector',
        firstName: 'Sarah',
        lastName: 'Molefe',
        status: 'active',
        saId: '8207150114084',
        mobile: '+27601234567'
    });

    console.log('👤 Primary personas created with SA localization');

    // 2b. Generate Bulk Data (Random SA Users)
    const randomUsers = [];
    for (let i = 0; i < 20; i++) {
        const name = randItem(SA_NAMES)!;
        const roles = ['patient', 'practitioner', 'patient', 'patient']; 
        const role = randItem(roles)!;
        
        const user = await User.create({
            email: faker.internet.email({ firstName: name.first, lastName: name.last }).toLowerCase().replace('@', `${faker.string.numeric(4)}@`),
            passwordHash,
            role,
            firstName: name.first,
            lastName: name.last,
            status: 'active',
            saId: faker.string.numeric(13),
            mobile: `+27${faker.helpers.arrayElement(['72', '82', '71', '60'])}${faker.string.numeric(7)}`
        });

        if (role === 'patient') {
            await PatientProfile.create({
              userId:user._id,
                dateOfBirth: faker.date.birthdate({ min: 18, max: 70, mode: 'age' }),
                gender: randItem(['male', 'female'])!,
                emergencyContact: { name: faker.person.fullName(), phone: '+27' + faker.string.numeric(9), relationship: 'Family' },
                medicalAid: { provider: randItem(MEDICAL_AIDS)!, planName: 'Standard', memberNumber: faker.string.numeric(10) },
                subscriptionTier: randItem(['free', 'pro'])
            });
        } else if (role === 'practitioner') {
            await PractitionerProfile.create({
                userId: user._id,
                specialisation: randItem(['Cardiologist', 'Dermatologist', 'Paediatrician', 'Family Physician'])!,
                hpcsaNumber: 'MP' + faker.string.numeric(6),
                consultationFee: 500 + Math.random() * 400,
                bio: faker.lorem.paragraph(),
                languages: ['English', randItem(['Afrikaans', 'isiZulu', 'Setswana'])!],
                affiliatedFacilityIds: [randItem(facilities)!._id]
            });
        }
        randomUsers.push(user);
    }
    console.log(`🧑‍🤝‍🧑 Generated 20 additional random SA users`);

    // 3. CLINICAL DATA SIMULATION
    const patients = await User.find({ role: 'patient' });
    
    // 3a. Consultations for Dr. Mitchell
    for (let i = 0; i < 30; i++) {
        const patient = randItem(patients)!;
        const start = subtractDays(faker.number.int({ min: 1, max: 60 }));
        const end = new Date(start.getTime() + 30 * 60000);
        
        await Consultation.create({
            patientId: patient._id,
            practitionerId: practitionerUser._id,
            facilityId: facilities[0]._id,
            type: randItem(['chat', 'video', 'in_person'])!,
            status: 'completed',
            scheduledStartTime: start,
            scheduledEndTime: end,
            chiefComplaint: 'Reporting symptoms of ' + faker.lorem.words(3),
            soapNotes: {
                subjective: faker.lorem.sentence(),
                objective: 'Vitals stable. No acute distress observed.',
                assessment: 'Patient presents with mild symptom.',
                plan: 'Recommended rest and follow-up in 7 days.',
                signedAt: end
            },
            clinicalRisk: { score: faker.number.int({ min: 10, max: 80 }), color: randItem(['green', 'amber'])!, factors: ['Age', 'Environment'] }
        });
    }

    // Upcoming Consults
    for (let i = 0; i < 12; i++) {
        const start = addDays(i);
        start.setHours(9 + (i % 8), 0, 0, 0);
        const end = new Date(start.getTime() + 30 * 60000);

        await Consultation.create({
            patientId: randItem(patients)!._id,
            practitionerId: practitionerUser._id,
            facilityId: facilities[0]._id,
            type: randItem(['video', 'chat', 'in_person'])!,
            status: 'scheduled',
            scheduledStartTime: start,
            scheduledEndTime: end,
            chiefComplaint: 'Follow-up appointment for systemic review.'
        });
    }
    console.log('📅 Seeded 42+ consultations');

    // 3b. Clinical Records for Thandiwe Mokoena
    await Anthropometric.create({
        patientId: patientUser._id,
        dateRecorded: subtractDays(2),
        weightKg: 72,
        heightCm: 165,
        bmi: 26.4,
        bloodType: 'O+',
        vitalSigns: { heartRateBpm: 72, systolicBP: 135, diastolicBP: 88, spO2: 98, temperatureCelsius: 36.6 }
    });
    await Prescription.create({
        patientId: patientUser._id,
        practitionerId: practitionerUser._id,
        medicationName: 'Amlodipine 5mg',
        dosage: '1 tablet',
        instructions: 'Take in the morning with food.',
        status: 'active',
        prescribedDate: subtractDays(10),
        refillsRemaining: 2
    });
    await LabResult.create({
        patientId: patientUser._id,
        orderedById: practitionerUser._id,
        testName: 'HbA1c / Glucose',
        dateReported: subtractDays(14),
        parameters: [{ name: 'HbA1c', value: '5.8', unit: '%', referenceRange: '4.0 - 6.0', status: 'normal' }]
    });
    console.log('💊 Seeded clinical history (Vitals/Meds/Labs) for Thandiwe');

    // 4. HOSPITAL OPERATIONS SIMULATION (Netcare Milpark)
    const wards = ['general', 'icu', 'emergency'] as const;
    for (const ward of wards) {
        for (let i = 1; i <= 10; i++) {
            const isOccupied = Math.random() > 0.4;
            await Bed.create({
                facilityId: facilities[0]._id,
                ward,
                bedNumber: `${ward.charAt(0).toUpperCase()}${i}`,
                status: isOccupied ? 'occupied' : 'available',
                patientId: isOccupied ? randItem(patients)!._id : null
            });
        }
    }
    await BedOccupancy.create({
        facilityId: facilities[0]._id,
        timestamp: new Date(),
        totalBeds: 40,
        occupiedBeds: 28,
        icuTotal: 10,
        icuOccupied: 8,
        emergencyTotal: 10,
        emergencyOccupied: 7
    });

    for (let i = 0; i < 50; i++) {
        await HospitalTransaction.create({
            facilityId: facilities[0]._id,
            patientId: randItem(patients)!._id,
            amount: 750 + Math.random() * 5000,
            type: randItem(['consultation_fee', 'procedure', 'pharmacy'])!,
            status: randItem(['paid', 'paid', 'pending'])!,
            paymentMethod: randItem(['medical_aid', 'card', 'cash'])!,
            timestamp: subtractDays(i % 30)
        });
    }
    console.log('🏨 Seeded Hospital operations data');

    // 5. EMERGENCY RESPONSE SIMULATION
    await EmergencyDispatch.create({
        dispatchId: 'DISP-7721',
        emtId: emtUser._id,
        patientId: patientUser._id,
        callerPhone: '+2711911',
        priority: 'red',
        status: 'en_route',
        incidentLocation: {
            address: 'Sandton City, Rivonia Rd, Sandton',
            coordinates: [28.0567, -26.1076]
        },
        targetFacilityId: facilities[0]._id,
        timeline: [
            { status: 'pending', timestamp: new Date(Date.now() - 600000) },
            { status: 'en_route', timestamp: new Date(Date.now() - 300000) }
        ],
        vitals: [
            { timestamp: new Date(), bp: '110/70', hr: 95, spo2: 94, gcs: 14 }
        ]
    });
    console.log('🚑 Seeded Emergency Dispatch simulation');

    // 6. CHAT & CONSULTATION SIMULATION
    // Create an active consultation for chat
    const chatConsult = await Consultation.create({
        patientId: patientUser._id,
        practitionerId: practitionerUser._id,
        type: 'video',
        status: 'in_progress',
        scheduledStartTime: subtractDays(0),
        scheduledEndTime: addDays(0),
        callMinutesUsed: 0
    });

    const conversation = await Conversation.create({
        consultationId: chatConsult._id,
        patientId: patientUser._id,
        practitionerId: practitionerUser._id,
        status: 'active',
        minutesAllocated: 30,
        minutesUsed: 0,
        minutesRequested: 0,
        minutesApproved: 0,
        startedAt: subtractDays(0),
        lastActivityAt: subtractDays(0)
    });

    // Generate 20 Messages
    for (let i = 0; i < 20; i++) {
        const isPractitioner = i % 2 !== 0;
        await Message.create({
            conversationId: conversation._id,
            senderId: isPractitioner ? practitionerUser._id : patientUser._id,
            receiverId: isPractitioner ? patientUser._id : practitionerUser._id,
            content: isPractitioner ? 'How are you feeling today?' : 'I have a new symptom: headache.',
            type: (i === 4 && !isPractitioner) ? 'quick_phrase' : 'text',
            isRead: true,
            createdAt: subtractDays(0).getTime() + (i * 60000),
            updatedAt: subtractDays(0).getTime() + (i * 60000)
        });
    }

    console.log('💬 Seeded Chat conversations & messages');

    // ==================== ADD MISSING DATA ====================

    // 7. RISK SCORES for all patients
    console.log('📊 Adding risk scores...');
    const allPatients = await User.find({ role: 'patient' });
    for (const patient of allPatients) {
      const riskScore = faker.number.int({ min: 10, max: 95 });
      const factors = [];
      if (riskScore > 70) factors.push('Age > 60', 'Hypertension history');
      else if (riskScore > 40) factors.push('Sedentary lifestyle', 'Family history');
      else factors.push('Healthy BMI', 'Regular exercise');
      
      await RiskScore.create({
        patientId: patient._id,
        practitionerId: practitionerUser._id, // assign to main practitioner for demo
        score: riskScore,
        color: riskScore > 70 ? 'red' : riskScore > 40 ? 'amber' : 'green',
        calculatedAt: subtractDays(faker.number.int({ min: 1, max: 30 })),
        factors: factors
      });
    }
    console.log(`📊 Added risk scores for ${allPatients.length} patients`);

    // 8. MEDICAL CONTEXT (chronic conditions & allergies)
    console.log('🩺 Adding medical context...');
    for (const patient of allPatients.slice(0, 15)) {
      const hasChronic = faker.datatype.boolean();
      const hasAllergy = faker.datatype.boolean();
      await MedicalContext.create({
        patientId: patient._id,
        chronicConditions: hasChronic ? faker.helpers.arrayElements(['Hypertension', 'Type 2 Diabetes', 'Asthma', 'Hyperlipidemia'], { min: 1, max: 2 }) : [],
        allergies: hasAllergy ? [
          { allergen: 'Penicillin', severity: 'severe', reaction: 'Rash', source: 'clinician' },
          { allergen: 'Peanuts', severity: 'mild', reaction: 'Hives', source: 'patient' }
        ].slice(0, faker.number.int({ min: 1, max: 2 })) : [],
        familyHistory: faker.helpers.arrayElements(['Heart Disease', 'Diabetes', 'Stroke', 'None'], 2)
      });
    }
    console.log('🩺 Added medical context for 15 patients');

    // 9. SUBSCRIPTIONS for patients
    console.log('💳 Adding subscriptions...');
    for (const patient of allPatients.slice(0, 12)) {
      const tier = faker.helpers.arrayElement(['free', 'pro', 'family']);
      const status = faker.helpers.arrayElement(['active', 'trial', 'cancelled']);
      await Subscription.create({
        patientId: patient._id,
        tier,
        status,
        startDate: subtractDays(faker.number.int({ min: 1, max: 90 })),
        nextBillingDate: addDays(faker.number.int({ min: 1, max: 30 })),
        paymentMethodId: faker.string.alphanumeric(16),
        autoRenew: status === 'active'
      });
    }
    console.log('💳 Added subscriptions for 12 patients');

    // 10. HOSPITAL APPOINTMENTS (for facility 0)
    console.log('🏥 Adding hospital appointments...');
    for (let i = 0; i < 30; i++) {
      const patient = faker.helpers.arrayElement(allPatients);
      const start = addDays(faker.number.int({ min: -15, max: 30 }));
      start.setHours(faker.number.int({ min: 8, max: 16 }), 0, 0, 0);
      const end = new Date(start.getTime() + 30 * 60000);
      await HospitalAppointment.create({
        facilityId: facilities[0]._id,
        patientId: patient._id,
        practitionerId: practitionerUser._id,
        type: faker.helpers.arrayElement(['consultation', 'procedure', 'lab']),
        scheduledStart: start,
        scheduledEnd: end,
        status: faker.helpers.arrayElement(['scheduled', 'completed', 'cancelled']),
        room: `Room ${faker.number.int({ min: 1, max: 20 })}`
      });
    }
    console.log('🏥 Added 30 hospital appointments');

    // 11. STAFF for facilities
    console.log('👩‍⚕️ Adding staff...');
    const roles = ['doctor', 'nurse', 'admin', 'technician'];
    const departments = ['Emergency', 'Cardiology', 'Radiology', 'Pharmacy', 'General Ward'];
    for (const facility of facilities) {
      for (let i = 0; i < 12; i++) {
        // @ts-ignore
        const name = faker.person.firstName() + ' ' + faker.person.lastName();
        await Staff.create({
          userId: null, // no login for most staff
          facilityId: facility._id,
          name,
          role: faker.helpers.arrayElement(roles),
          department: faker.helpers.arrayElement(departments),
          shiftSchedule: { start: '08:00', end: '16:00', days: [1,2,3,4,5] },
          isOnDuty: faker.datatype.boolean(),
          hourlyRate: faker.number.int({ min: 100, max: 500 }),
          qualifications: [faker.lorem.word(), faker.lorem.word()]
        });
      }
    }
    console.log('👩‍⚕️ Added staff for all facilities');

    // 12. ADDITIONAL CONSULTATIONS for other practitioners
    console.log('📅 Adding consultations for random practitioners...');
    const allPractitioners = await User.find({ role: 'practitioner' });
    for (const practitioner of allPractitioners) {
      if (practitioner._id.toString() === practitionerUser._id.toString()) continue;
      const numConsults = faker.number.int({ min: 5, max: 20 });
      for (let i = 0; i < numConsults; i++) {
        const patient = faker.helpers.arrayElement(allPatients);
        const start = subtractDays(faker.number.int({ min: 1, max: 60 }));
        const end = new Date(start.getTime() + 30 * 60000);
        await Consultation.create({
          patientId: patient._id,
          practitionerId: practitioner._id,
          facilityId: faker.helpers.arrayElement(facilities)._id,
          type: faker.helpers.arrayElement(['video', 'chat', 'in_person']),
          status: faker.helpers.arrayElement(['completed', 'scheduled', 'cancelled']),
          scheduledStartTime: start,
          scheduledEndTime: end,
          chiefComplaint: faker.lorem.sentence(),
          soapNotes: { subjective: faker.lorem.sentence(), objective: 'Vitals stable', assessment: 'Routine', plan: 'Follow up', signedAt: end },
          clinicalRisk: { score: faker.number.int({ min: 10, max: 90 }), color: 'green', factors: [] }
        });
      }
    }
    console.log('📅 Added extra consultations for other practitioners');

    // 13. ADDITIONAL LAB RESULTS & PRESCRIPTIONS
    console.log('🔬 Adding more lab results and prescriptions...');
    for (let i = 0; i < 40; i++) {
      const patient = faker.helpers.arrayElement(allPatients);
      const practitioner = faker.helpers.arrayElement(allPractitioners);
      await LabResult.create({
        patientId: patient._id,
        orderedById: practitioner._id,
        testName: faker.helpers.arrayElement(['Full Blood Count', 'Lipid Profile', 'Thyroid Function', 'Glucose']),
        dateReported: subtractDays(faker.number.int({ min: 1, max: 60 })),
        parameters: [
          { name: 'Haemoglobin', value: faker.number.float({ min: 10, max: 18, fractionDigits: 1 }).toString(), unit: 'g/dL', referenceRange: '13.5-17.5', status: faker.helpers.arrayElement(['normal', 'low', 'high']) },
          { name: 'Cholesterol', value: faker.number.float({ min: 3, max: 8, fractionDigits: 1 }).toString(), unit: 'mmol/L', referenceRange: '<5.2', status: 'normal' }
        ]
      });
      
      if (i % 2 === 0) {
        await Prescription.create({
          patientId: patient._id,
          practitionerId: practitioner._id,
          medicationName: faker.helpers.arrayElement(['Amoxicillin', 'Lisinopril', 'Metformin', 'Atorvastatin']),
          dosage: '1 tablet',
          instructions: 'Take daily with food.',
          status: faker.helpers.arrayElement(['active', 'completed']),
          prescribedDate: subtractDays(faker.number.int({ min: 1, max: 30 })),
          refillsRemaining: faker.number.int({ min: 0, max: 3 })
        });
      }
    }
    console.log('🔬 Added 40 lab results and 20 prescriptions');

    // 14. ADDITIONAL EMERGENCY DISPATCHES
    console.log('🚑 Adding more emergency dispatches...');
    for (let i = 0; i < 5; i++) {
      const patient = faker.helpers.arrayElement(allPatients);
      const facility = faker.helpers.arrayElement(facilities);
      await EmergencyDispatch.create({
        dispatchId: `DISP-${faker.string.numeric(4)}`,
        emtId: emtUser._id,
        patientId: patient._id,
        callerPhone: '+271011',
        priority: faker.helpers.arrayElement(['red', 'yellow', 'green']),
        status: faker.helpers.arrayElement(['en_route', 'on_scene', 'transporting', 'completed']),
        incidentLocation: {
          address: faker.location.streetAddress(),
          coordinates: [faker.location.longitude(), faker.location.latitude()]
        },
        targetFacilityId: facility._id,
        timeline: [{ status: 'pending', timestamp: new Date(Date.now() - 600000) }],
        vitals: [{ timestamp: new Date(), bp: '120/80', hr: 85, spo2: 97, gcs: 15 }]
      });
    }
    console.log('🚑 Added 5 more emergency dispatches');

    // 15. AUDIT LOGS
    console.log('📝 Adding audit logs...');
    let previousHash = '';
    const actions = ['LOGIN', 'VIEWED_HEALTH_RECORD', 'MODIFIED_PRESCRIPTION', 'BOOKED_CONSULTATION', 'LOGOUT'];
    const allUsers = await User.find();
    for (let i = 0; i < 50; i++) {
      const actor = faker.helpers.arrayElement(allUsers);
      const target = faker.helpers.arrayElement(allUsers);
      const newLog = await AuditLog.create({
        actorId: actor._id,
        targetId: target._id,
        action: faker.helpers.arrayElement(actions),
        timestamp: subtractDays(faker.number.int({ min: 0, max: 30 })),
        ipAddress: faker.internet.ipv4(),
        metadata: { userAgent: faker.internet.userAgent() },
        consentVersion: '2.0',
        previousHash: previousHash,
        signature: ''
      });
      previousHash = newLog._id.toString();
    }
    console.log('📝 Added 50 audit logs');

    // 16. ADDITIONAL CHAT CONVERSATIONS & MESSAGES
    console.log('💬 Adding more chat conversations...');
    const allConsultations = await Consultation.find({ status: 'completed' }).limit(10);
    for (const consult of allConsultations) {
      if (!consult.patientId || !consult.practitionerId) continue;
      const existingConv = await Conversation.findOne({ consultationId: consult._id });
      if (existingConv) continue;
      const conversation = await Conversation.create({
        consultationId: consult._id,
        patientId: consult.patientId,
        practitionerId: consult.practitionerId,
        status: 'ended',
        minutesAllocated: 30,
        minutesUsed: faker.number.int({ min: 5, max: 30 }),
        minutesRequested: 0,
        minutesApproved: 0,
        startedAt: consult.scheduledStartTime,
        lastActivityAt: consult.scheduledEndTime
      });
      // Add random messages
      for (let i = 0; i < faker.number.int({ min: 3, max: 15 }); i++) {
        const sender = faker.datatype.boolean() ? consult.patientId : consult.practitionerId;
        const receiver = sender.toString() === consult.patientId.toString() ? consult.practitionerId : consult.patientId;
        await Message.create({
          conversationId: conversation._id,
          senderId: sender,
          receiverId: receiver,
          content: faker.lorem.sentence(),
          type: 'text',
          isRead: true,
          createdAt: new Date(consult.scheduledStartTime.getTime() + (i * 60000)),
          updatedAt: new Date(consult.scheduledStartTime.getTime() + (i * 60000))
        });
      }
    }
    console.log('💬 Added extra chat conversations and messages');

    console.log('\n🌟 REAL-LIFE SIMULATION SEED COMPLETE!');
    process.exit(0);

  } catch (err) {
    console.error('❌ SIMULATION SEED FAILED:', err);
    process.exit(1);
  }
}

seedDatabase();
