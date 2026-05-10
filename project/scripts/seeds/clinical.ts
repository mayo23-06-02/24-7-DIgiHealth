import mongoose from 'mongoose';
import { Anthropometric, MedicalContext, Prescription, LabResult } from '../../lib/models/ClinicalData';
import RiskScore from '../../lib/models/RiskScore';

export async function createClinicalData(patients: any[], doctors: any[]) {
  const [patient1, patient2] = patients;
  const [doctor1, doctor2] = doctors;

  // Clear existing
  await Promise.all([
    Anthropometric.deleteMany({ patientId: { $in: [patient1._id, patient2._id] } }),
    MedicalContext.deleteMany({ patientId: { $in: [patient1._id, patient2._id] } }),
    Prescription.deleteMany({ patientId: { $in: [patient1._id, patient2._id] } }),
    LabResult.deleteMany({ patientId: { $in: [patient1._id, patient2._id] } }),
    RiskScore.deleteMany({ patientId: { $in: [patient1._id, patient2._id] } }),
  ]);

  // 1. Medical Context
  await MedicalContext.create([
    {
      patientId: patient1._id,
      chronicConditions: ['Hypertension', 'Type 2 Diabetes'],
      allergies: [
        { allergen: 'Penicillin', severity: 'severe', reaction: 'Anaphylaxis', source: 'clinician' }
      ],
      currentMedications: ['Metformin 500mg', 'Amlodipine 5mg'],
      familyHistory: ['Father: Heart Attack at 55', 'Mother: Diabetes'],
    },
    {
      patientId: patient2._id,
      chronicConditions: ['Hypercholesterolaemia', 'Asthma'],
      allergies: [
        { allergen: 'Aspirin', severity: 'moderate', reaction: 'Hives', source: 'patient' }
      ],
      currentMedications: ['Atorvastatin 40mg', 'Salbutamol Inhaler'],
      familyHistory: ['Stroke (Grandfather)', 'Early onset hypertension'],
    }
  ]);

  // 2. Anthropometric (Vitals over time - 6 months)
  const months = [5, 4, 3, 2, 1, 0];
  for (const m of months) {
    const date = new Date();
    date.setMonth(date.getMonth() - m);

    // Patient 1 (Thandiwe)
    await Anthropometric.create({
      patientId: patient1._id,
      dateRecorded: date,
      heightCm: 165,
      weightKg: 78 - (m * 0.5), // slight weight loss trend
      bmi: (78 - (m * 0.5)) / (1.65 * 1.65),
      vitalSigns: {
        systolicBP: 145 - (m * 2),
        diastolicBP: 92 - (m * 1),
        heartRateBpm: 72 + Math.floor(Math.random() * 10),
        spO2: 98,
        temperatureCelsius: 36.6 + (Math.random() * 0.4)
      }
    });

    // Patient 2 (John)
    await Anthropometric.create({
      patientId: patient2._id,
      dateRecorded: date,
      heightCm: 182,
      weightKg: 95,
      bmi: 95 / (1.82 * 1.82),
      vitalSigns: {
        systolicBP: 138,
        diastolicBP: 88,
        heartRateBpm: 78,
        spO2: 97,
        temperatureCelsius: 36.5
      }
    });
  }

  // 3. Prescriptions
  await Prescription.create([
    {
      patientId: patient1._id,
      practitionerId: doctor1._id,
      medicationName: 'Metformin',
      dosage: '500mg BD',
      instructions: 'Take with food',
      status: 'active',
      prescribedDate: new Date(Date.now() - 30 * 86400000),
      refillsRemaining: 2
    },
    {
      patientId: patient1._id,
      practitionerId: doctor1._id,
      medicationName: 'Amlodipine',
      dosage: '5mg OD',
      instructions: 'Take in the morning',
      status: 'active',
      prescribedDate: new Date(Date.now() - 30 * 86400000),
      refillsRemaining: 5
    },
    {
      patientId: patient2._id,
      practitionerId: doctor2._id,
      medicationName: 'Atorvastatin',
      dosage: '40mg OD',
      instructions: 'Take at night',
      status: 'active',
      prescribedDate: new Date(Date.now() - 60 * 86400000),
      refillsRemaining: 1
    }
  ]);

  // 4. Lab Results
  await LabResult.create([
    {
      patientId: patient1._id,
      orderedById: doctor1._id,
      testName: 'HbA1c & Fasting Glucose',
      dateReported: new Date(Date.now() - 15 * 86400000),
      parameters: [
        { name: 'HbA1c', value: '7.2', unit: '%', referenceRange: '4.0-5.6', status: 'high' },
        { name: 'Glucose', value: '6.8', unit: 'mmol/L', referenceRange: '3.9-5.5', status: 'high' }
      ]
    },
    {
      patientId: patient2._id,
      orderedById: doctor2._id,
      testName: 'Lipid Profile',
      dateReported: new Date(Date.now() - 10 * 86400000),
      parameters: [
        { name: 'Total Cholesterol', value: '6.2', unit: 'mmol/L', referenceRange: '< 5.0', status: 'high' },
        { name: 'LDL', value: '4.1', unit: 'mmol/L', referenceRange: '< 3.0', status: 'high' }
      ]
    }
  ]);

  // 5. Risk Scores (every 3 months)
  const riskDates = [6, 3, 0];
  for (const m of riskDates) {
      const date = new Date();
      date.setMonth(date.getMonth() - m);
      
      await RiskScore.create({
          patientId: patient1._id,
          practitionerId: doctor1._id,
          score: 65 - (m * 2), // Improving risk
          color: (65 - (m * 2)) > 60 ? 'gray' : 'gray',
          factors: ['Age > 30', 'HBP', 'Diabetes'],
          condition: 'Metabolic Syndrome monitoring',
          calculatedAt: date
      });
  }

  console.log('🩺 Clinical data seeded for Thandiwe & John');
}
