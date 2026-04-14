import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { MedicalContext } from '@/lib/models/ClinicalData';
import Patient from '@/lib/models/Patient';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();
    const { medicalHistory, allergies, currentMedications } = body;

    // 1. Get User ID from Patient ID
    const patientDoc = await Patient.findById(id).lean();
    if (!patientDoc) return NextResponse.json({ success: false, error: 'Patient Record Not Found' }, { status: 404 });
    const userId = patientDoc.userId;

    // 2. Update MedicalContext (Detailed Record)
    const formattedAllergies = (allergies || []).map((a: string) => ({
      allergen: a,
      severity: 'moderate',
      reaction: 'To be determined',
      source: 'clinician'
    }));

    await MedicalContext.findOneAndUpdate(
      { patientId: userId },
      { 
        chronicConditions: medicalHistory,
        allergies: formattedAllergies,
        currentMedications: currentMedications
      },
      { upsert: true, new: true }
    );

    // 3. Update Patient Model (Base Profile)
    const updatedPatient = await Patient.findByIdAndUpdate(
      id,
      { 
        medicalHistory,
        allergies,
        currentMedications
      },
      { new: true }
    ).lean();
    
    return NextResponse.json({ 
      success: true, 
      data: {
        medicalHistory: updatedPatient?.medicalHistory || [],
        allergies: updatedPatient?.allergies || [],
        currentMedications: updatedPatient?.currentMedications || []
      } 
    });
  } catch (err: any) {
    console.error('[POST /api/practitioner/patients/[id]/update]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
