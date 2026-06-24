import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import User from '@/lib/models/User';
import { PatientProfile, PractitionerProfile } from '@/lib/models/RoleProfiles';
import { PaymentTransaction, PayoutRequest } from '@/lib/models/Billing';
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

    // 4. Earnings & Payout Tracker Data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentTransactions = await PaymentTransaction.find({
      practitionerId,
      status: 'completed',
      timestamp: { $gte: sevenDaysAgo }
    }).lean();

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const earningsMap: Record<string, number> = {};
    const volumeMap: Record<string, number> = {};
    const feesMap: Record<string, number> = {};

    for (let d = 6; d >= 0; d--) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      const label = daysOfWeek[date.getDay()];
      earningsMap[label] = 0;
      volumeMap[label] = 0;
      feesMap[label] = 0;
    }

    recentTransactions.forEach((tx: any) => {
      const txDate = new Date(tx.timestamp);
      const label = daysOfWeek[txDate.getDay()];
      if (label in earningsMap) {
        earningsMap[label] += tx.practitionerEarnings || 0;
        volumeMap[label] += tx.amount || 0;
        feesMap[label] += tx.platformFeeAmount || 0;
      }
    });

    const earningsChartData = Object.keys(earningsMap).map(label => ({
      name: label,
      earnings: parseFloat(earningsMap[label].toFixed(2)),
      gross: parseFloat(volumeMap[label].toFixed(2)),
      fees: parseFloat(feesMap[label].toFixed(2))
    }));

    const allTransactions = await PaymentTransaction.find({
      practitionerId,
      status: 'completed'
    }).lean();

    let totalGross = 0;
    let totalNet = 0;
    let totalFees = 0;
    allTransactions.forEach((tx: any) => {
      totalGross += tx.amount || 0;
      totalNet += tx.practitionerEarnings || 0;
      totalFees += tx.platformFeeAmount || 0;
    });

    const recentPayouts = await PayoutRequest.find({ practitionerId })
      .sort({ requestedAt: -1 })
      .limit(5)
      .lean();

    const formattedPayouts = recentPayouts.map((p: any) => ({
      payoutId: p._id.toString(),
      amount: p.amount,
      status: p.status,
      requestedAt: p.requestedAt,
      periodFrom: p.periodFrom,
      periodTo: p.periodTo,
      consultationCount: p.consultationCount
    }));

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
        earningsChartData,
        financials: {
          totalGross: parseFloat(totalGross.toFixed(2)),
          totalNet: parseFloat(totalNet.toFixed(2)),
          totalFees: parseFloat(totalFees.toFixed(2))
        },
        recentPayouts: formattedPayouts,
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
