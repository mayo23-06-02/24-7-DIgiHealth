import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Prescription, MedicalContext } from '@/lib/models/ClinicalData';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();

    if (!user || (user.role !== 'practitioner' && user.role !== 'mega_admin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { patientId, medicationName, dosage, instructions, refillsRemaining } = body;

    if (!patientId || !medicationName) {
      return NextResponse.json({ success: false, error: 'Patient ID and Medication Name are required' }, { status: 400 });
    }

    // Create the prescription
    const newPrescription = await Prescription.create({
      patientId,
      practitionerId: user.userId,
      medicationName,
      dosage,
      instructions,
      refillsRemaining: refillsRemaining || 0,
      status: 'active',
      prescribedDate: new Date()
    });

    // Also update MedicalContext currentMedications if it's a new medication
    const medicalContext = await MedicalContext.findOne({ patientId });
    if (medicalContext) {
      if (!medicalContext.currentMedications.includes(medicationName)) {
        medicalContext.currentMedications.push(medicationName);
        await medicalContext.save();
      }
    } else {
      // Create medical context if it doesn't exist
      await MedicalContext.create({
        patientId,
        currentMedications: [medicationName],
        chronicConditions: [],
        allergies: [],
        familyHistory: []
      });
    }

    return NextResponse.json({
      success: true,
      data: newPrescription
    });
  } catch (err: any) {
    console.error('[POST /api/practitioner/prescriptions]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
