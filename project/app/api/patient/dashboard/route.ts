import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Anthropometric, MedicalContext } from '@/lib/models/ClinicalData';
import { PatientProfile } from '@/lib/models/RoleProfiles';
import User from '@/lib/models/User';

import { getRequestUser } from '@/lib/auth/getRequestUser';
import { isMongoObjectId } from '@/lib/utils/mongoId';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const userId = user.userId;

    // Postgres-native accounts have no Mongo identity (see lib/utils/mongoId.ts)
    // — Anthropometric/MedicalContext are still Mongo-only, so they genuinely
    // have no vitals/medical history recorded rather than a lookup failure.
    const hasMongoIdentity = isMongoObjectId(userId);

    // Fetch two latest vitals for trend calculation
    const vitalsHistory = hasMongoIdentity
      ? await Anthropometric.find({ patientId: userId })
          .sort({ dateRecorded: -1 })
          .limit(2)
          .lean()
      : [];

    const latest = vitalsHistory[0];
    const previous = vitalsHistory[1];

    const calculateTrend = (latestVal: number | undefined, prevVal: number | undefined) => {
      if (!latestVal || !prevVal) return 0;
      return parseFloat((((latestVal - prevVal) / prevVal) * 100).toFixed(1));
    };

    // Special handling for BP trend (using systolic)
    const calculateBPTrend = () => {
      const latestSys = latest?.vitalSigns?.systolicBP;
      const prevSys = previous?.vitalSigns?.systolicBP;
      if (!latestSys || !prevSys) return 0;
      return parseFloat((((latestSys - prevSys) / prevSys) * 100).toFixed(1));
    };

    // Fetch patient profile for demographics
    const profile = hasMongoIdentity
      ? await PatientProfile.findOne({ userId }).lean()
      : null;

    // Fetch medical history summary
    const medicalCtx = hasMongoIdentity
      ? await MedicalContext.findOne({ patientId: userId }).lean()
      : null;

    return NextResponse.json({
      success: true,
      data: {
        isNewUser: !profile,
        vitals: latest ? {
          heartRate: latest.vitalSigns?.heartRateBpm || 0,
          bloodPressure: latest.vitalSigns?.bloodPressure || (latest.vitalSigns?.systolicBP ? `${latest.vitalSigns.systolicBP}/${latest.vitalSigns.diastolicBP}` : "0/0"),
          weight: latest.weightKg || 0,
          glucose: latest.vitalSigns?.bloodGlucose || 0,
          height: latest.heightCm || 0,
          // Trends
          heartRateTrend: calculateTrend(latest.vitalSigns?.heartRateBpm, previous?.vitalSigns?.heartRateBpm),
          bloodPressureTrend: calculateBPTrend(),
          weightTrend: calculateTrend(latest.weightKg, previous?.weightKg),
          glucoseTrend: calculateTrend(latest.vitalSigns?.bloodGlucose, previous?.vitalSigns?.bloodGlucose),
        } : {
          heartRate: 0,
          bloodPressure: "0/0",
          weight: 0,
          glucose: 0,
          height: 0,
          heartRateTrend: 0,
          bloodPressureTrend: 0,
          weightTrend: 0,
          glucoseTrend: 0
        },
        profile: {
          gender: profile?.gender || 'female',
          subscriptionTier: profile?.subscriptionTier || 'free',
          ageRange: profile?.ageRange,
          dateOfBirth: profile?.dateOfBirth
        },
        medicalSummary: {
          conditions: medicalCtx?.chronicConditions || [],
          allergies: (medicalCtx?.allergies || []).map((a: any) => a.allergen),
          currentMedications: medicalCtx?.currentMedications || []
        }
      }
    });
  } catch (err: any) {
    console.error('[GET /api/patient/dashboard]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
