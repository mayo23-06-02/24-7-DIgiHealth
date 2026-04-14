import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import Patient from '@/lib/models/Patient';

function getPractitionerId(req: NextRequest): string {
  return (
    req.headers.get('x-practitioner-id') ||
    process.env.MOCK_PRACTITIONER_ID ||
    '000000000000000000000000'
  );
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const practitionerId = getPractitionerId(req);
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
          riskScore: c.clinicalRisk?.score,
          riskColor: c.clinicalRisk?.color,
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
    console.error('[GET /api/practitioner/consultations]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load consultations' },
      { status: 500 },
    );
  }
}
