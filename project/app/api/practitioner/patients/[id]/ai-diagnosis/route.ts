import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { PractitionerProfile } from '@/lib/models/RoleProfiles';
import { Consultation } from '@/lib/models/Consultation';
import { ClinicalDecisionSupport } from '@/lib/models/AIDecision';
import { getPatientClinicalSummary, formatClinicalSummaryForPrompt } from '@/lib/ai/patientContext';
import { getDiagnosisSupport } from '@/lib/ai/anthropic';

import { apiError } from "@/lib/api/errors";
/** Shared with GET/PATCH — mirrors the ownership check already used in
 * app/api/practitioner/patients/[id]/health-record/route.ts: assigned to
 * this practitioner OR a consultation exists between them. */
async function assertPractitionerCanAccessPatient(practitionerId: string, patientId: string) {
  const profile = await PractitionerProfile.findOne({ userId: practitionerId }).lean();
  const assignedIds = (profile?.assignedPatientIds || []).map((id) => id.toString());
  if (assignedIds.includes(patientId)) return true;
  return !!(await Consultation.exists({ patientId, practitionerId }));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || (user.role !== 'practitioner' && user.role !== 'mega_admin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: patientId } = await params;
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return NextResponse.json({ success: false, error: 'Invalid patient ID' }, { status: 400 });
    }

    if (
      user.role !== 'mega_admin' &&
      !(await assertPractitionerCanAccessPatient(user.userId, patientId))
    ) {
      return NextResponse.json(
        { success: false, error: 'Access denied: patient not linked to your practice' },
        { status: 403 },
      );
    }

    const body = await req.json();
    const symptoms = String(body.symptoms || '').trim();
    if (!symptoms) {
      return NextResponse.json({ success: false, error: 'Symptoms are required' }, { status: 400 });
    }

    const summary = await getPatientClinicalSummary(patientId);
    const result = await getDiagnosisSupport({
      symptoms,
      patientContextText: formatClinicalSummaryForPrompt(summary),
    });

    const record = await ClinicalDecisionSupport.create({
      practitionerId: user.userId,
      patientId,
      symptoms,
      suggestedDiagnoses: result.diagnoses,
      recommendedTests: result.recommendedTests,
      riskScore: result.riskScore,
      riskAssessment: result.riskAssessment,
      modelUsed: result.modelUsed,
      status: 'pending',
    });

    return NextResponse.json({ success: true, data: record });
  } catch (err: any) {
    console.error('[POST /api/practitioner/patients/[id]/ai-diagnosis]', err);
    return apiError(err);
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || (user.role !== 'practitioner' && user.role !== 'mega_admin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: patientId } = await params;
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return NextResponse.json({ success: false, error: 'Invalid patient ID' }, { status: 400 });
    }

    if (
      user.role !== 'mega_admin' &&
      !(await assertPractitionerCanAccessPatient(user.userId, patientId))
    ) {
      return NextResponse.json(
        { success: false, error: 'Access denied: patient not linked to your practice' },
        { status: 403 },
      );
    }

    const history = await ClinicalDecisionSupport.find({ patientId })
      .sort({ generatedAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({ success: true, data: history });
  } catch (err: any) {
    console.error('[GET /api/practitioner/patients/[id]/ai-diagnosis]', err);
    return apiError(err);
  }
}
