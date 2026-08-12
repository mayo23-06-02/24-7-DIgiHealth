import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import HospitalAppointment from '@/lib/models/HospitalAppointment';
import { getRequestUser } from '@/lib/auth/getRequestUser';
// Same resolver the sibling hospital routes use (dashboard, performance, sla).
// The Postgres-only variant returns null for any admin whose facility link
// still lives in Mongo, which 404'd this endpoint for every seeded account.
import { resolveHospitalId } from '@/lib/hospital/resolveHospitalId';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export async function GET() {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const facilityId = await resolveHospitalId(user.userId, user.email);
    if (!facilityId) {
      return NextResponse.json({ error: 'No facility linked' }, { status: 404 });
    }

    // Query helpers cast a string facilityId to ObjectId for us; aggregate()
    // does not, so pipelines need the ObjectId form or they match nothing.
    const baseFilter = { facilityId };
    const aggFilter = {
      facilityId: new mongoose.Types.ObjectId(String(facilityId)),
    };

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    // ---- Real: appointment volume per month, last 12 months ----
    const volumeByMonth = await HospitalAppointment.aggregate([
      { $match: { ...aggFilter, scheduledStart: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$scheduledStart' }, month: { $month: '$scheduledStart' } },
          count: { $sum: 1 },
        },
      },
    ]);

    const countByKey = new Map(
      volumeByMonth.map((m) => [`${m._id.year}-${m._id.month}`, m.count]),
    );

    const monthlyCounts = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(twelveMonthsAgo);
      d.setMonth(twelveMonthsAgo.getMonth() + i);
      return {
        month: MONTHS[d.getMonth()],
        appointments: countByKey.get(`${d.getFullYear()}-${d.getMonth() + 1}`) ?? 0,
      };
    });

    // Utilisation expressed against the facility's own busiest month in the
    // window. Genuine relative signal derived from real appointment counts —
    // not an absolute bed-occupancy figure, which this schema doesn't track.
    const peak = Math.max(...monthlyCounts.map((m) => m.appointments), 1);
    const occupancyTrend = monthlyCounts.map((m) => ({
      month: m.month,
      appointments: m.appointments,
      occupancy: Math.round((m.appointments / peak) * 100),
      capacity: 100,
    }));

    // ---- Real: appointment mix by type ----
    const typeBreakdown = await HospitalAppointment.aggregate([
      { $match: aggFilter },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const appointmentDistribution = typeBreakdown.map((t) => ({
      type: t._id || 'Telehealth',
      count: t.count,
    }));

    const totalAppointments = appointmentDistribution.reduce(
      (sum, t) => sum + t.count,
      0,
    );

    // ---- Real: distinct patients seen at this facility ----
    const distinctPatients = await HospitalAppointment.distinct('patientId', baseFilter);

    // ---- Placeholder ----
    // Revenue-per-department and patient age demographics have no backing
    // source in the current schema: appointments carry no department or
    // billing linkage, and patient DOB lives on a separate profile collection
    // that isn't joined here. These stay static and are flagged in the payload
    // via `placeholderFields` so the UI (and anyone reading this response) can
    // tell them apart from the aggregated numbers above. Wiring them up needs
    // a department field on HospitalAppointment and a billing join.
    const revenueByDept = [
      { department: 'Emergency', revenue: 45000 },
      { department: 'Surgery', revenue: 68000 },
      { department: 'Cardiology', revenue: 52000 },
      { department: 'Pediatrics', revenue: 38000 },
      { department: 'Oncology', revenue: 72000 },
    ];

    const patientDemographics = [
      { ageGroup: '0-18', count: 1200 },
      { ageGroup: '19-35', count: 3400 },
      { ageGroup: '36-50', count: 5200 },
      { ageGroup: '51-65', count: 4100 },
      { ageGroup: '65+', count: 2800 },
    ];

    return NextResponse.json({
      success: true,
      data: {
        occupancyTrend,
        appointmentDistribution,
        revenueByDept,
        patientDemographics,
        summary: {
          avgOccupancy: Math.round(
            occupancyTrend.reduce((s, o) => s + o.occupancy, 0) / occupancyTrend.length,
          ),
          totalAppointments,
          totalPatients: distinctPatients.length,
          totalRevenue: revenueByDept.reduce((s, d) => s + d.revenue, 0),
        },
        placeholderFields: ['revenueByDept', 'patientDemographics', 'summary.totalRevenue'],
      },
    });
  } catch (error) {
    console.error('[GET /api/hospital/analytics]', error);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}
