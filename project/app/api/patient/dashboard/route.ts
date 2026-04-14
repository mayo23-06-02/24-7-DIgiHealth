import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Anthropometric, MedicalContext } from '@/lib/models/ClinicalData';
import { PatientProfile } from '@/lib/models/RoleProfiles';
import User from '@/lib/models/User';

async function getUserId(req: NextRequest): Promise<string | null> {
  return req.headers.get('x-user-id') || null;
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    // Fetch latest vitals
    const latestVitals = await Anthropometric.findOne({ patientId: userId }).sort({ dateRecorded: -1 }).lean();

    // Fetch patient profile for demographics
    const profile = await PatientProfile.findOne({ userId }).lean();

    // Fetch medical history summary
    const medicalCtx = await MedicalContext.findOne({ patientId: userId }).lean();

    return NextResponse.json({
      success: true,
      data: {
        vitals: latestVitals ? {
          heartRate: latestVitals.vitalSigns?.heartRateBpm || 72,
          bloodPressure: latestVitals.vitalSigns?.bloodPressure || `${latestVitals.vitalSigns?.systolicBP || 120}/${latestVitals.vitalSigns?.diastolicBP || 80}`,
          weight: latestVitals.weightKg || 0,
          glucose: latestVitals.vitalSigns?.bloodGlucose || 5.5,
          height: latestVitals.heightCm || 165,
        } : {
          heartRate: 72,
          bloodPressure: "120/80",
          weight: 68,
          glucose: 5.5,
          height: 165
        },
        profile: {
          gender: profile?.gender || 'female',
          subscriptionTier: profile?.subscriptionTier || 'free'
        },
        medicalSummary: {
          conditions: medicalCtx?.chronicConditions || [],
          allergiesCount: medicalCtx?.allergies?.length || 0
        }
      }
    });
  } catch (err: any) {
    console.error('[GET /api/patient/dashboard]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
