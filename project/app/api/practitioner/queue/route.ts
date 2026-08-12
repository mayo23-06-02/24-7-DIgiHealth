import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Consultation from '@/lib/models/Consultation';
import Patient from '@/lib/models/Patient';
import User from '@/lib/models/User';
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

    // The UI (and this route's own default) asks for "ongoing", but no
    // consultation ever carries that status — the stored value is
    // `in_progress`. Translate rather than break existing callers.
    const STATUS_ALIASES: Record<string, string> = { ongoing: 'in_progress' };
    const statusFilter = status
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => STATUS_ALIASES[s] ?? s);

    const isHistorical = statusFilter.every((s) =>
      ['completed', 'cancelled'].includes(s),
    );

    // The window used to be `scheduledStartTime >= now`, which emptied every
    // tab. Completed and cancelled consultations are always in the past, so
    // those tabs could never return a row; and an in-progress consultation
    // started before "now" by definition, so it was excluded from the active
    // tab too. A practitioner's active queue is today's outstanding work —
    // anchor it to the start of today so appointments running late or already
    // under way stay visible, and drop the constraint entirely for history.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const query = {
      practitionerId,
      status: { $in: statusFilter },
      ...(isHistorical ? {} : { scheduledStartTime: { $gte: startOfToday } }),
    };

    // History reads newest-first; the active queue reads soonest-first.
    const sort: Record<string, 1 | -1> = { scheduledStartTime: isHistorical ? -1 : 1 };

    const [consultations, total] = await Promise.all([
      Consultation.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Consultation.countDocuments(query),
    ]);

    const queue = await Promise.all(
      consultations.map(async (c: any) => {
        // `patientId` is a Patient record in some rows and a User id in
        // others, so try the Patient join first and fall back to reading the
        // user directly rather than giving up.
        const patient = await Patient.findById(c.patientId).populate('userId').lean();
        let userDoc = (patient as any)?.userId;
        if (!userDoc) {
          userDoc = await User.findById(c.patientId)
            .select('firstName lastName profile')
            .lean();
        }

        // The name lives on firstName/lastName. This previously read
        // `userDoc.profile.fullName`, a field the User model does not define,
        // so every row in the queue rendered as "Unknown Patient".
        const patientName =
          [userDoc?.firstName, userDoc?.lastName].filter(Boolean).join(' ') ||
          userDoc?.profile?.fullName ||
          'Unknown Patient';
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
