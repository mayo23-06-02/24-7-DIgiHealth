import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import User from '@/lib/models/User';
import { PatientProfile, PractitionerProfile } from '@/lib/models/RoleProfiles';
import { PaymentTransaction, PayoutRequest } from '@/lib/models/Billing';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { apiLogger } from '@/lib/apiLogger';
import { riskBandFromScore } from '@/lib/riskScore';
import { getBlockedAcceptorId } from '@/lib/booking/requester';

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

    // Fetch upcoming consultations for the next 60 days
    const upcomingWindow = new Date(now.getTime() + 60 * 24 * 3600000);

    const [consultations, pendingConsultations] = await Promise.all([
      Consultation.find({
        practitionerId,
        scheduledStartTime: { $gte: now, $lte: upcomingWindow },
        status: { $in: ['scheduled', 'in_progress', 'pending', 'requested'] },
      }).sort({ scheduledStartTime: 1 }).limit(500).lean(),
      Consultation.find({
        practitionerId,
        status: { $in: ['pending', 'requested'] },
        $or: [
          { requestedTo: practitionerId },
          { requestedTo: { $exists: false } },
          { requestedTo: null },
        ],
      }).sort({ scheduledStartTime: 1 }).lean()
    ]);

    // Patient names for both sets, fetched in one query rather than one per
    // consultation. The previous version issued a findById inside the map, so
    // a practitioner with a full book paid a round trip per row — twice, since
    // mapCons runs over the upcoming and pending lists separately.
    const patientIds = [
      ...new Set(
        [...consultations, ...pendingConsultations]
          .map((c: any) => c.patientId?.toString())
          .filter(Boolean),
      ),
    ];
    const patientDocs = patientIds.length
      ? await User.find({ _id: { $in: patientIds } })
          .select('firstName lastName')
          .lean()
      : [];
    const patientsById = new Map(
      patientDocs.map((u: any) => [u._id.toString(), u]),
    );

    const mapCons = async (list: any[]) => Promise.all(
      list.map(async (c: any) => {
        const userDoc = patientsById.get(c.patientId?.toString());
        const patientName = userDoc ? `${userDoc.firstName} ${userDoc.lastName}` : 'Unknown Patient';
        const initials = patientName
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();

        const canAccept =
          !(c.status === 'requested' || c.status === 'pending') ||
          (c.requestedTo
            ? c.requestedTo.toString() === practitionerId
            : practitionerId !==
              getBlockedAcceptorId({
                source: c.source,
                patientId: c.patientId,
                practitionerId: c.practitionerId,
                pendingReschedule: c.pendingReschedule,
              }));

        return {
          consultationId: c._id.toString(),
          patientId: c.patientId.toString(),
          patientName,
          initials,
          scheduledStart: c.scheduledStartTime,
          scheduledEnd: c.scheduledEndTime,
          reason: c.chiefComplaint,
          riskScore: c.clinicalRisk?.score ?? 0,
          riskColor: riskBandFromScore(c.clinicalRisk?.score ?? 0),
          riskFactors: c.clinicalRisk?.factors || [],
          aiRecommendations: c.aiRecommendations || [],
          status: c.status,
          type: c.type,
          createdAt: c.createdAt,
          canAccept,
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

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    // These four don't depend on one another, so they go out together instead
    // of paying four sequential round trips. This route was the slowest
    // endpoint on the platform at ~3.8s, and it is the one a doctor waits on
    // at the start of every shift.
    const [
      upcomingCount,
      uniquePatientIds,
      canceledThisWeek,
      allConsultations,
    ] = await Promise.all([
      // Total count for today
      Consultation.countDocuments({
        practitionerId,
        scheduledStartTime: { $gte: now, $lte: todayEnd },
        status: { $in: ['scheduled', 'in_progress'] },
      }),
      // 1. Total unique visitors (patients)
      Consultation.find({ practitionerId }).distinct('patientId'),
      // 2. Canceled appointments this week
      Consultation.countDocuments({
        practitionerId,
        status: 'cancelled',
        scheduledStartTime: { $gte: startOfWeek },
      }),
      // 3. Patient growth — first consultation date per patient
      Consultation.find({ practitionerId }).sort({ createdAt: 1 }).lean(),
    ]);

    const totalVisitors = uniquePatientIds.length;
    
    // Track first consultation for each patient
    const patientFirstConsultation = new Map<string, Date>();
    allConsultations.forEach((c: any) => {
      if (!patientFirstConsultation.has(c.patientId.toString())) {
        patientFirstConsultation.set(c.patientId.toString(), c.createdAt);
      }
    });

    // Group new patients by month for the last 6 months
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const growthData: Record<string, number> = {};
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${months[date.getMonth()]} ${date.getFullYear()}`;
      growthData[key] = 0;
    }

    // Count new patients per month
    patientFirstConsultation.forEach((firstDate) => {
      const monthDiff = (now.getFullYear() - firstDate.getFullYear()) * 12 + (now.getMonth() - firstDate.getMonth());
      if (monthDiff >= 0 && monthDiff < 6) {
        const key = `${months[firstDate.getMonth()]} ${firstDate.getFullYear()}`;
        if (growthData.hasOwnProperty(key)) {
          growthData[key]++;
        }
      }
    });

    const chartData = Object.entries(growthData).map(([label, value]) => ({
      label,
      value,
      max: Math.max(...Object.values(growthData), 10)
    }));

    // --- Trend Calculations ---
    const yesterdayStart = new Date(now);
    yesterdayStart.setDate(now.getDate() - 1);
    yesterdayStart.setHours(0,0,0,0);
    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(23,59,59,999);

    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(now.getDate() - 7);

    // 4. Earnings & Payout Tracker Data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Second independent batch: two trend queries and both transaction reads.
    const [
      countYesterday,
      uniquePatientIdsLastWeek,
      recentTransactions,
      allTransactions,
    ] = await Promise.all([
      Consultation.countDocuments({
        practitionerId,
        scheduledStartTime: { $gte: yesterdayStart, $lte: yesterdayEnd },
        status: { $in: ['scheduled', 'in_progress', 'completed'] },
      }),
      Consultation.find({
        practitionerId,
        createdAt: { $lt: lastWeekStart },
      }).distinct('patientId'),
      PaymentTransaction.find({
        practitionerId,
        status: 'completed',
        timestamp: { $gte: sevenDaysAgo },
      }).lean(),
      PaymentTransaction.find({
        practitionerId,
        status: 'completed',
      }).lean(),
    ]);

    const upcomingTrend = countYesterday === 0 ? 0 : parseFloat((((upcomingCount - countYesterday) / countYesterday) * 100).toFixed(1));
    const totalVisitorsLastWeek = uniquePatientIdsLastWeek.length;
    const visitorsTrend = totalVisitorsLastWeek === 0 ? 0 : parseFloat((((totalVisitors - totalVisitorsLastWeek) / totalVisitorsLastWeek) * 100).toFixed(1));

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

    let totalGross = 0;
    let totalNet = 0;
    let totalFees = 0;
    allTransactions.forEach((tx: any) => {
      totalGross += tx.amount || 0;
      totalNet += tx.practitionerEarnings || 0;
      totalFees += tx.platformFeeAmount || 0;
    });

    // Final independent batch: payouts plus the practitioner's own record.
    const [recentPayouts, practitionerUser, practitionerProfile] =
      await Promise.all([
        PayoutRequest.find({ practitionerId })
          .sort({ requestedAt: -1 })
          .limit(5)
          .lean(),
        User.findById(practitionerId).lean(),
        PractitionerProfile.findOne({ userId: practitionerId }).lean(),
      ]);

    const formattedPayouts = recentPayouts.map((p: any) => ({
      payoutId: p._id.toString(),
      amount: p.amount,
      status: p.status,
      requestedAt: p.requestedAt,
      periodFrom: p.periodFrom,
      periodTo: p.periodTo,
      consultationCount: p.consultationCount
    }));

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
