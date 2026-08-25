import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import Patient from '@/lib/models/Patient';
import { riskBandFromScore } from '@/lib/riskScore';
import { requireRole } from '@/lib/auth/access';
import { apiError } from '@/lib/api/errors';

export async function GET(req: NextRequest) {
  try {
    /*
     * Identity comes from the verified session, never from the request.
     *
     * This used to read an `x-practitioner-id` header with no JWT check at
     * all, falling back to MOCK_PRACTITIONER_ID. The header is copied
     * through by the proxy untouched — only `x-user-id` and `x-user-role`
     * are overwritten — so any signed-in account could name any practitioner
     * and receive their schedule: patient identities, chief complaints, risk
     * scores and AI recommendations. Same fix as practitioner/queue.
     */
    const user = await requireRole('practitioner', 'mega_admin');
    const practitionerId = user.userId;

    await connectToDatabase();

    const { searchParams } = new URL(req.url);

    // Default: current week Mon–Sun
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : weekStart;
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : weekEnd;

    const consultations = await Consultation.find({
      practitionerId,
      scheduledStartTime: { $gte: from, $lte: to },
    })
      .sort({ scheduledStartTime: 1 })
      .lean();

    const events = await Promise.all(
      consultations.map(async (c: any) => {
        const patient = await Patient.findById(c.patientId).populate('userId').lean();
        const userDoc = patient?.userId as any;
        const patientName = userDoc?.profile?.fullName || 'Unknown Patient';

        return {
          id: c._id.toString(),
          title: patientName,
          patientName,
          start: c.scheduledStartTime,
          end: c.scheduledEndTime,
          status: c.status,
          type: c.type,
          reason: c.chiefComplaint,
          riskScore: c.clinicalRisk?.score ?? 0,
          riskColor: riskBandFromScore(c.clinicalRisk?.score ?? 0),
          riskFactors: c.clinicalRisk?.factors || [],
          aiRecommendations: c.aiRecommendations || [],
          patientId: c.patientId.toString(),
          consultationId: c._id.toString(),
          soapNotes: c.soapNotes,
        };
      }),
    );

    return NextResponse.json({ success: true, data: { events } });
  } catch (err) {
    return apiError(err, 'Consultations could not be loaded. Please try again.');
  }
}
