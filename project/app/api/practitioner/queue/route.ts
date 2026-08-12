import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Consultation from '@/lib/models/Consultation';
import Patient from '@/lib/models/Patient';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { riskBandFromScore } from '@/lib/riskScore';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    // Identity comes from the verified session, never from the request.
    //
    // This previously read an `x-practitioner-id` header (falling back to a
    // MOCK_PRACTITIONER_ID env var), with no JWT verification at all — so any
    // caller could set that header to another practitioner's id and read their
    // whole queue: patient names, presenting complaints, risk scores and AI
    // recommendations. That is PHI, and the header is entirely client-supplied.
    const user = await getRequestUser();
    if (!user || user.role !== 'practitioner') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }
    const practitionerId = user.userId;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status') || 'scheduled,ongoing';
    const skip = (page - 1) * limit;

    const now = new Date();
    const statusFilter = status.split(',');

    const [consultations, total] = await Promise.all([
      Consultation.find({
        practitionerId,
        status: { $in: statusFilter },
        scheduledStartTime: { $gte: now },
      })
        .sort({ scheduledStartTime: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Consultation.countDocuments({
        practitionerId,
        status: { $in: statusFilter },
        scheduledStartTime: { $gte: now },
      }),
    ]);

    const queue = await Promise.all(
      consultations.map(async (c: any) => {
        const patient = await Patient.findById(c.patientId).populate('userId').lean();
        const userDoc = patient?.userId as any;
        const patientName = userDoc?.profile?.fullName || 'Unknown Patient';
        const initials = patientName
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();

        return {
          consultationId: c._id.toString(),
          patientId: c.patientId.toString(),
          patientName,
          initials,
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(patientName)}&background=4493b8&color=fff`,
          scheduledStart: c.scheduledStartTime,
          scheduledEnd: c.scheduledEndTime,
          reason: c.chiefComplaint,
          riskScore: c.clinicalRisk?.score ?? 0,
          riskColor: riskBandFromScore(c.clinicalRisk?.score ?? 0),
          riskFactors: c.clinicalRisk?.factors || [],
          aiRecommendations: c.aiRecommendations || [],
          status: c.status,
          type: c.type,
          medicalHistory: patient?.medicalHistory || [],
          allergies: patient?.allergies || [],
        };
      }),
    );

    return NextResponse.json({
      success: true,
      data: {
        queue,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error('[GET /api/practitioner/queue]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load patient queue' },
      { status: 500 },
    );
  }
}
