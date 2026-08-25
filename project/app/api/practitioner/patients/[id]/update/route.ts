import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { MedicalContext } from '@/lib/models/ClinicalData';
import Patient from '@/lib/models/Patient';
import { requirePatientAccess } from '@/lib/auth/access';

import { apiError } from "@/lib/api/errors";
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();
    const { medicalHistory, allergies, currentMedications } = body;

    /*
     * 1. Authorization.
     *
     * The check here stopped at the role, and the practitioner id it resolved
     * was then never used for anything — so any practitioner account could
     * overwrite any patient's chronic conditions, allergies and current
     * medications, upserting the record into existence if it did not already
     * exist. An allergy list is safety-critical and this left no trace of who
     * changed it.
     */
    await requirePatientAccess(id);

    // 2. Update MedicalContext (Primary Detailed Record)
    // We use 'id' from params which is the patient's userId
    const formattedAllergies = (allergies || []).map((a: string) => ({
      allergen: a,
      severity: 'moderate',
      reaction: 'To be determined',
      source: 'clinician'
    }));

    const updatedContext = await MedicalContext.findOneAndUpdate(
      { patientId: id },
      { 
        chronicConditions: medicalHistory,
        allergies: formattedAllergies,
        currentMedications: currentMedications
      },
      { upsert: true, new: true }
    ).lean();

    // 3. Update Patient Model (Legacy/Base Profile) - Optional or Create if missing
    const updatedPatient = await Patient.findOneAndUpdate(
      { userId: id },
      { 
        medicalHistory,
        allergies,
        currentMedications
      },
      { new: true, upsert: false } // Don't upsert here if we don't have enough data (like DOB/Gender)
    ).lean();
    
    return NextResponse.json({ 
      success: true, 
      data: {
        medicalHistory: updatedContext?.chronicConditions || [],
        allergies: (updatedContext?.allergies || []).map((a: any) => a.allergen),
        currentMedications: updatedContext?.currentMedications || []
      } 
    });
  } catch (err: any) {
    console.error('[POST /api/practitioner/patients/[id]/update]', err);
    return apiError(err);
  }
}
