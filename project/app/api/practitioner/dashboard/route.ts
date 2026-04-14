import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import Patient from '@/lib/models/Patient';
import User from '@/lib/models/User';
import { PatientProfile } from '@/lib/models/RoleProfiles';

// MVP: extract practitioner ID from header or fall back to env mock
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
    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Fetch upcoming consultations for today + next 24h
    const upcomingWindow = new Date(now.getTime() + 24 * 3600000);

    const consultations = await Consultation.find({
      practitionerId,
      scheduledStartTime: { $gte: now, $lte: upcomingWindow },
      status: { $in: ['scheduled', 'in_progress', 'pending'] },
    })
      .sort({ scheduledStartTime: 1 })
      .limit(10)
      .lean();

    // Populate patient names
    const mappedConsultations = await Promise.all(
      consultations.map(async (c: any) => {
        const userDoc = await User.findById(c.patientId).lean();
        const patientName = userDoc ? `${userDoc.firstName} ${userDoc.lastName}` : 'Unknown Patient';
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
          scheduledStart: c.scheduledStartTime,
          scheduledEnd: c.scheduledEndTime,
          reason: c.chiefComplaint,
          riskScore: c.clinicalRisk?.score,
          riskColor: c.clinicalRisk?.color,
          riskFactors: c.clinicalRisk?.factors || [],
          aiRecommendations: c.aiRecommendations || [],
          status: c.status,
          type: c.type,
        };
      }),
    );

    const queue = mappedConsultations.filter(c => c.status === 'scheduled' || c.status === 'in_progress');
    const pendingRequests = mappedConsultations.filter(c => c.status === 'pending');

    // High-risk alerts (score > 70) from all consultations
    const riskAlerts = mappedConsultations
      .filter((q) => q.riskScore > 70)
      .map((q) => ({
        consultationId: q.consultationId,
        patientName: q.patientName,
        score: q.riskScore,
        color: q.riskColor,
        condition: q.aiRecommendations[0] || 'High risk – review urgently',
        factors: q.riskFactors,
      }));

    // Total count for today
    const upcomingCount = await Consultation.countDocuments({
      practitionerId,
      scheduledStartTime: { $gte: now, $lte: todayEnd },
      status: { $in: ['scheduled', 'in_progress'] },
    });

    // --- Metric Calculations ---
    // 1. Total unique visitors (patients)
    const uniquePatientIds = await Consultation.find({ practitionerId }).distinct('patientId');
    const totalVisitors = uniquePatientIds.length;

    // 2. Canceled appointments this week
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const canceledThisWeek = await Consultation.countDocuments({
      practitionerId,
      status: 'cancelled',
      scheduledStartTime: { $gte: startOfWeek }
    });

    // 3. Patients Overview (Age Groups)
    const patientProfiles = await PatientProfile.find({ userId: { $in: uniquePatientIds } }).lean();
    const ageGroups = {
      '18-25': 0,
      '26-35': 0,
      '36-45': 0,
      '46-60': 0,
      '61+': 0
    };

    patientProfiles.forEach((p: any) => {
      const birth = new Date(p.dateOfBirth);
      const age = now.getFullYear() - birth.getFullYear();
      if (age <= 25) ageGroups['18-25']++;
      else if (age <= 35) ageGroups['26-35']++;
      else if (age <= 45) ageGroups['36-45']++;
      else if (age <= 60) ageGroups['46-60']++;
      else ageGroups['61+']++;
    });

    const chartData = Object.entries(ageGroups).map(([label, value]) => ({
      label,
      value,
      max: Math.max(...Object.values(ageGroups), 10) // normalized max for UI
    }));

    // Practitioner info
    const practitioner = await User.findById(practitionerId).lean();

    return NextResponse.json({
      success: true,
      data: {
        upcomingCount,
        totalVisitors,
        canceledThisWeek,
        chartData,
        queue,
        pendingRequests,
        riskAlerts,
        practitioner: practitioner
          ? {
              id: practitioner._id.toString(),
              name: (practitioner as any).profile?.fullName || 'Practitioner',
              specialisation: (practitioner as any).profile?.specialisation || '',
              avatarUrl: (practitioner as any).profile?.avatarUrl || '',
            }
          : null,
      },
    });
  } catch (err) {
    console.error('[GET /api/practitioner/dashboard]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load dashboard data' },
      { status: 500 },
    );
  }
}
