import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { ClinicalDecisionSupport } from '@/lib/models/AIDecision';

import { apiError } from "@/lib/api/errors";
/** PATCH — the doctor accepts or dismisses an AI-generated suggestion. This
 * is the audit trail: the AI never auto-writes to the chart, the doctor's
 * explicit action here is what gets recorded. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; decisionId: string }> },
) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || (user.role !== 'practitioner' && user.role !== 'mega_admin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: patientId, decisionId } = await params;
    if (
      !mongoose.Types.ObjectId.isValid(patientId) ||
      !mongoose.Types.ObjectId.isValid(decisionId)
    ) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    const body = await req.json();
    if (!['accepted', 'dismissed'].includes(body.status)) {
      return NextResponse.json(
        { success: false, error: "status must be 'accepted' or 'dismissed'" },
        { status: 400 },
      );
    }

    const record = await ClinicalDecisionSupport.findOne({ _id: decisionId, patientId });
    if (!record) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    if (
      user.role !== 'mega_admin' &&
      record.practitionerId.toString() !== user.userId
    ) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    record.status = body.status;
    record.reviewedAt = new Date();
    await record.save();

    return NextResponse.json({ success: true, data: record });
  } catch (err: any) {
    console.error('[PATCH /api/practitioner/patients/[id]/ai-diagnosis/[decisionId]]', err);
    return apiError(err);
  }
}
