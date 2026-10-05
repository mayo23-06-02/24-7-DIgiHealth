import { NextRequest, NextResponse } from 'next/server';
import { MedicalContext } from '@/lib/models/ClinicalData';
import { getRequestUser } from '@/lib/auth/getRequestUser';

import { apiError } from "@/lib/api/errors";
import { isValidId } from '@/lib/db';
export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    if (!isValidId(user.userId)) {
      return NextResponse.json(
        { success: false, error: 'Allergy tracking is not yet available for this account.' },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { allergen, severity, reaction } = body;

    if (!allergen || !severity) {
      return NextResponse.json({ success: false, error: 'Allergen and severity are required.' }, { status: 400 });
    }

    // Update or Create MedicalContext
    const context = await MedicalContext.findOneAndUpdate(
      { patientId: user.userId },
      { 
        $push: { 
          allergies: { 
            allergen, 
            severity, 
            reaction: reaction || '', 
            source: 'patient' 
          } 
        } 
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, data: context?.allergies ?? [] });
  } catch (error: any) {
    console.error('[POST /api/patient/allergies]', error);
    return apiError(error);
  }
}
