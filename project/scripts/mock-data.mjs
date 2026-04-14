/**
 * Comprehensive Simulation Dataset for 24/7 DigiHealth
 * Covers all 7 roles, 14 domains, and every tele-health use case.
 */

export const mData = {
  // 1. FACILITIES (Operations Base)
  facilities: [
    {
      _refId: 'FAC-PRESTIGE',
      name: 'Prestige Medical Plaza',
      facilityType: 'Private',
      address: { city: 'Sandton', province: 'Gauteng', coordinates: [28.0167, -26.0548] },
      bedCapacity: { total: 124, generalAvailable: 12, icuAvailable: 2 },
      isOpen: true,
      emergencyServices: true,
      currentWaitTimeMins: 18,
      specialties: ['Cardiology', 'Trauma', 'Maternity', 'Oncology']
    },
    {
      _refId: 'FAC-GREENCROSS',
      name: 'GreenCross Pharmacy Hub',
      facilityType: 'Private',
      address: { city: 'Arcadia', province: 'Pretoria', coordinates: [28.2167, -25.7461] },
      bedCapacity: { total: 0, generalAvailable: 0, icuAvailable: 0 },
      isOpen: true,
      emergencyServices: false,
      currentWaitTimeMins: 5,
      specialties: ['Telehealth Dispensing', 'Vaccinations', 'OTC']
    },
    {
      _refId: 'FAC-GUGULETHU',
      name: 'Gugulethu Community Clinic',
      facilityType: 'Public',
      address: { city: 'Cape Town', province: 'Western Cape', coordinates: [18.5667, -33.9833] },
      bedCapacity: { total: 40, generalAvailable: 2, icuAvailable: 0 },
      isOpen: true,
      emergencyServices: true,
      currentWaitTimeMins: 124,
      specialties: ['Primary Care', 'HIV/TB Management', 'Maternity']
    }
  ],

  // 2. USERS & PERSONAS (The 7 Roles)
  users: [
    // --- PATIENTS ---
    {
      _refId: 'USR-THABO', role: 'patient',
      email: 'thabo.m@digimock.com', firstName: 'Thabo', lastName: 'Mokoena', saId: '9003125481082', mobile: '+27711234567',
      profile: { gender: 'male', dateOfBirth: '1990-03-12', subscriptionTier: 'pro' },
      anthropometric: { heightCm: 178, weightKg: 97, bmi: 30.6, bloodType: 'B+', vitals: { systolicBP: 145, diastolicBP: 92, heartRateBpm: 88, spO2: 97, temperatureCelsius: 36.8 } },
      medicalContext: { chronicConditions: ['Hypertension', 'Type 2 Diabetes'], allergies: [{ allergen: 'Penicillin', severity: 'severe', reaction: 'Anaphylaxis', source: 'clinician' }] },
      prescriptions: [{ medicationName: 'Metformin', dosage: '500mg', instructions: 'Twice daily with meals', status: 'active', refillsRemaining: 2 }],
      labResults: [{ testName: 'HbA1c', dateReported: '2026-03-15', parameters: [{ name: 'HbA1c Level', value: '8.2', unit: '%', referenceRange: '4.0-5.6', status: 'high' }] }]
    },
    {
      _refId: 'USR-GRACE', role: 'patient',
      email: 'grace.m@digimock.com', firstName: 'Grace', lastName: 'Molefe', saId: '5006180234086', mobile: '+27825678901',
      profile: { gender: 'female', dateOfBirth: '1950-06-18', subscriptionTier: 'free' },
      anthropometric: { heightCm: 158, weightKg: 72, bmi: 28.8, bloodType: 'O+', vitals: { systolicBP: 130, diastolicBP: 85, heartRateBpm: 72, spO2: 95, temperatureCelsius: 37.1 } },
      medicalContext: { chronicConditions: ['CKD Stage 3', 'Osteoporosis', 'Diabetes'], allergies: [] },
      prescriptions: [{ medicationName: 'Insulin Glargine', dosage: '20 Units', instructions: 'At bedtime', status: 'active', refillsRemaining: 5 }],
      labResults: [{ testName: 'eGFR', dateReported: '2026-04-01', parameters: [{ name: 'Estimated Glomerular Filtration Rate', value: '42', unit: 'mL/min/1.73m2', referenceRange: '>90', status: 'low' }] }]
    },
    {
      _refId: 'USR-AMIRA', role: 'patient',
      email: 'amira.k@digimock.com', firstName: 'Amira', lastName: 'Khan', saId: '8511055234083', mobile: '+27837890123',
      profile: { gender: 'female', dateOfBirth: '1985-11-05', subscriptionTier: 'pro' },
      anthropometric: { heightCm: 164, weightKg: 61, bmi: 22.7, bloodType: 'B+', vitals: { systolicBP: 110, diastolicBP: 75, heartRateBpm: 68, spO2: 99, temperatureCelsius: 36.6 } },
      medicalContext: { chronicConditions: ['Asthma', 'Anxiety'], allergies: [{ allergen: 'NSAIDs', severity: 'mild', reaction: 'Wheezing', source: 'patient' }] },
      prescriptions: [{ medicationName: 'Salbutamol Inhaler', dosage: '100mcg', instructions: '1-2 puffs as needed for wheezing', status: 'active', refillsRemaining: 1 }],
      labResults: []
    },

    // --- PRACTITIONERS ---
    {
      _refId: 'USR-DR-NKOSI', role: 'practitioner',
      email: 'dr.nkosi@digihealth.com', firstName: 'Sipho', lastName: 'Nkosi', mobile: '+27612349999',
      profile: { specialisation: 'General Practitioner', hpcsaNumber: 'MP0123456', experienceYears: 14, isOnline: true, consultationFee: 450, affiliatedFacilities: ['FAC-PRESTIGE', 'FAC-GREENCROSS'] }
    },
    {
      _refId: 'USR-DR-VANWYK', role: 'practitioner',
      email: 'dr.vanwyk@digihealth.com', firstName: 'Anke', lastName: 'van Wyk', mobile: '+27723458888',
      profile: { specialisation: 'Cardiologist', hpcsaNumber: 'MP0789012', experienceYears: 19, isOnline: false, consultationFee: 800, affiliatedFacilities: ['FAC-PRESTIGE'] }
    },

    // --- HOSPITAL ADMIN ---
    {
      _refId: 'USR-ADMIN-NANDI', role: 'hospital_admin',
      email: 'nandi@prestigeplaza.co.za', firstName: 'Nandi', lastName: 'Dlamini', mobile: '+27115550101',
      profile: { assignedFacilityId: 'FAC-PRESTIGE' }
    },

    // --- EMT ---
    {
      _refId: 'USR-EMT-BONGANI', role: 'emt',
      email: 'bongani@netcare.com', firstName: 'Bongani', lastName: 'Khumalo', mobile: '+27724561234',
      profile: { licenseLevel: 'ALS', hpcsaNumber: 'EMT-0045123', assignedVehicle: 'GP-07', currentStatus: 'en_route', assignedFacility: 'FAC-PRESTIGE' }
    },

    // --- INSPECTOR ---
    {
      _refId: 'USR-INSP-LEBO', role: 'inspector',
      email: 'lebo@doh.gov.za', firstName: 'Lebo', lastName: 'Sithole',
      profile: { region: 'Gauteng', department: 'POPIA Compliance' }
    },

    // --- SUPER ADMIN ---
    {
      _refId: 'USR-SUPER-PRIYA', role: 'super_admin',
      email: 'priya@admin.com', firstName: 'Priya', lastName: 'Naidoo'
    },

    // --- MEGA ADMIN ---
    {
      _refId: 'USR-MEGA-KGOMOTSO', role: 'mega_admin',
      email: 'ceo@admin.com', firstName: 'Kgomotso', lastName: 'Ramaphosa'
    }
  ],

  // 3. CONSULTATIONS (Past, Present, Future)
  consultations: [
    {
      _refId: 'CONS-1',
      patientId: 'USR-THABO', practitionerId: 'USR-DR-NKOSI', facilityId: 'FAC-PRESTIGE',
      type: 'video', status: 'in_progress', 
      scheduledStartTime: new Date(Date.now() - 10 * 60000), // started 10m ago
      scheduledEndTime: new Date(Date.now() + 20 * 60000), 
      chiefComplaint: 'Severe headaches over past 3 days and dizziness',
      clinicalRisk: { score: 82, color: 'red', factors: ['High BP history', 'Obese', 'Diabetic'] }
    },
    {
      _refId: 'CONS-2',
      patientId: 'USR-AMIRA', practitionerId: 'USR-DR-NKOSI', facilityId: 'FAC-PRESTIGE',
      type: 'chat', status: 'scheduled', 
      scheduledStartTime: new Date(Date.now() + 24 * 3600000), // tomorrow
      scheduledEndTime: new Date(Date.now() + 24.5 * 3600000), 
      chiefComplaint: 'Refill needed for asthma pump and anxiety meds',
      clinicalRisk: { score: 38, color: 'amber', factors: ['Asthmatic', 'Anxiety History'] }
    },
    {
      _refId: 'CONS-3',
      patientId: 'USR-GRACE', practitionerId: 'USR-DR-VANWYK', facilityId: 'FAC-PRESTIGE',
      type: 'in_person', status: 'completed', 
      scheduledStartTime: new Date(Date.now() - 72 * 3600000), // 3 days ago
      scheduledEndTime: new Date(Date.now() - 71 * 3600000), 
      chiefComplaint: 'Palpitations and swelling in legs (edema)',
      clinicalRisk: { score: 88, color: 'red', factors: ['CKD Stage 3', 'Age > 70', 'Heart Failure Risks'] },
      soapNotes: { 
        subjective: 'Patient reports 2 weeks of worsening pedal edema. Heart feels like it races.', 
        objective: 'Pitting edema +2 bilaterally. HR irregular at 95bpm.', 
        assessment: 'Fluid overload secondary to worsening CKD vs CHF.', 
        plan: 'Increase Furosemide to 80mg. Urgent ECHO scheduled. Review in 1 week.' 
      }
    }
  ],

  // 4. EMERGENCY DISPATCH (EMT & Admins)
  emergencies: [
    {
      _refId: 'EMG-1',
      dispatchId: 'EMG-2026-007',
      emtId: 'USR-EMT-BONGANI', patientId: 'USR-THABO',  // Oh no, Thabo had an emergency!
      status: 'en_route',
      incidentLocation: { address: 'Diepkloof, Soweto', coordinates: [27.9482, -26.2415] },
      targetFacilityId: 'FAC-PRESTIGE',
      dispatchTime: new Date(Date.now() - 15 * 60000), // 15m ago
      estimatedTimeOfArrival: new Date(Date.now() + 8 * 60000), // 8m from now
      vitalsInTransit: [
        { time: new Date(Date.now() - 5 * 60000), bloodPressure: '185/110', heartRate: 112, spO2: 94 }
      ]
    }
  ],

  // 5. AI TRIAGE SESSIONS (Clinical Decision Support)
  aiTriage: [
    {
      patientId: 'USR-THABO',
      symptoms: 'My chest feels tight and my left arm aches. I have high blood pressure.',
      recommendation: 'emergency',
      urgencyScore: 95,
      createdAt: new Date(Date.now() - 40 * 60000) // This triggered the EMT dispatch
    },
    {
      patientId: 'USR-AMIRA',
      symptoms: 'I have a sore throat and slight cough for 2 days.',
      recommendation: 'self_care',
      urgencyScore: 12,
      createdAt: new Date(Date.now() - 4 * 3600000)
    }
  ],

  // 6. AUDIT LOGS (POPIA & Security)
  audits: [
    { actorId: 'USR-INSP-LEBO', action: 'EXPORTED_COMPLIANCE_REPORT_FAC-PRESTIGE', timestamp: new Date() },
    { actorId: 'USR-SUPER-PRIYA', action: 'SUSPENDED_USER_ACCOUNT', timestamp: new Date(Date.now() - 2 * 3600000) },
    { actorId: 'USR-DR-NKOSI', targetId: 'USR-THABO', action: 'ACCESSED_PATIENT_MEDICAL_CONTEXT', timestamp: new Date(Date.now() - 10 * 60000) }
  ],

  // 7. SUBSCRIPTIONS & BILLING
  billing: [
    { patientId: 'USR-THABO', amount: 250, currency: 'ZAR', provider: 'PayFast', status: 'completed', timestamp: new Date(Date.now() - 14 * 86400000) },
    { patientId: 'USR-AMIRA', amount: 250, currency: 'ZAR', provider: 'Peach', status: 'completed', timestamp: new Date(Date.now() - 21 * 86400000) }
  ]
};
