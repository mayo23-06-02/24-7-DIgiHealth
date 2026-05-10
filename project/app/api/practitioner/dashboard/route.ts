import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import User from '@/lib/models/User';
import { PatientProfile, PractitionerProfile } from '@/lib/models/RoleProfiles';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { apiLogger } from '@/lib/apiLogger';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    
    if (!user || (user.role !== 'practitioner' && user.role !== 'mega_admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const practitionerId = user.userId;
    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Fetch upcoming consultations for today + next 24h
    const upcomingWindow = new Date(now.getTime() + 24 * 3600000);

    const [consultations, pendingConsultations] = await Promise.all([
      Consultation.find({
        practitionerId,
        scheduledStartTime: { $gte: now, $lte: upcomingWindow },
        status: { $in: ['scheduled', 'in_progress', 'pending', 'requested'] },
      }).sort({ scheduledStartTime: 1 }).limit(10).lean(),
      Consultation.find({
        practitionerId,
        status: { $in: ['pending', 'requested'] },
      }).sort({ scheduledStartTime: 1 }).lean()
    ]);

    // Populate patient names for both sets
    const mapCons = async (list: any[]) => Promise.all(
      list.map(async (c: any) => {
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
          createdAt: c.createdAt,
        };
      })
    );

    const mappedUpcoming = await mapCons(consultations);
    const mappedPending = await mapCons(pendingConsultations);

    const queue = mappedUpcoming.filter(c => c.status === 'scheduled' || c.status === 'in_progress');
    const pendingRequests = mappedPending;

    // High-risk alerts (score > 70) from all consultations
    const riskAlerts = mappedUpcoming
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

    // --- Trend Calculations ---
    const yesterdayStart = new Date(now);
    yesterdayStart.setDate(now.getDate() - 1);
    yesterdayStart.setHours(0,0,0,0);
    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(23,59,59,999);

    const countYesterday = await Consultation.countDocuments({
      practitionerId,
      scheduledStartTime: { $gte: yesterdayStart, $lte: yesterdayEnd },
      status: { $in: ['scheduled', 'in_progress', 'completed'] },
    });
    const upcomingTrend = countYesterday === 0 ? 0 : parseFloat((((upcomingCount - countYesterday) / countYesterday) * 100).toFixed(1));

    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(now.getDate() - 7);
    const uniquePatientIdsLastWeek = await Consultation.find({ 
      practitionerId,
      createdAt: { $lt: lastWeekStart }
    }).distinct('patientId');
    const totalVisitorsLastWeek = uniquePatientIdsLastWeek.length;
    const visitorsTrend = totalVisitorsLastWeek === 0 ? 0 : parseFloat((((totalVisitors - totalVisitorsLastWeek) / totalVisitorsLastWeek) * 100).toFixed(1));

    // 4. Interaction Data (Mocked but structure for dynamic DB integration)
    const interactionData = [
      { name: 'Mon', reactions: 12, comments: 4, likes: 8, dislikes: 1 },
      { name: 'Tue', reactions: 18, comments: 6, likes: 12, dislikes: 0 },
      { name: 'Wed', reactions: 15, comments: 5, likes: 10, dislikes: 2 },
      { name: 'Thu', reactions: 22, comments: 8, likes: 15, dislikes: 1 },
      { name: 'Fri', reactions: 30, comments: 12, likes: 20, dislikes: 0 },
      { name: 'Sat', reactions: 25, comments: 10, likes: 18, dislikes: 1 },
      { name: 'Sun', reactions: 20, comments: 7, likes: 14, dislikes: 0 },
    ];

    // Fetch practitioner profile details for the response
    const practitionerUser = await User.findById(practitionerId).lean();
    const practitionerProfile = await PractitionerProfile.findOne({ userId: practitionerId }).lean();

    return NextResponse.json({
      success: true,
      data: {
        isNewUser: !practitionerProfile,
        upcomingCount,
        upcomingTrend,
        totalVisitors,
        visitorsTrend,
        canceledThisWeek,
        chartData,
        interactionData,
        queue,
        pendingRequests,
        riskAlerts,
        practitioner: practitionerUser
          ? {
              id: practitionerUser._id.toString(),
              name: `${practitionerUser.firstName} ${practitionerUser.lastName}`,
              specialisation: practitionerProfile?.specialisation || '',
              avatarUrl: (practitionerUser as any).avatarUrl || '',
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
