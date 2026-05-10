import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { MedicalContext } from '@/lib/models/ClinicalData';
import { getRequestUser } from '@/lib/auth/getRequestUser';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

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

    return NextResponse.json({ success: true, data: context.allergies });
  } catch (error: any) {
    console.error('[POST /api/patient/allergies]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
