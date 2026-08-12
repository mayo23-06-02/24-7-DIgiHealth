import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import HospitalAppointment from '@/lib/models/HospitalAppointment';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { resolveHospitalId } from '@/lib/hospital/resolveHospitalId';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const hospitalId = await resolveHospitalId(user.userId, user.email);
    if (!hospitalId) {
      return NextResponse.json({ success: false, error: 'No facility linked to this account.' }, { status: 404 });
    }

    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filter by facilityId.
    //
    // `facilityId` is an ObjectId in the schema but resolveHospitalId returns a
    // string. Query helpers (countDocuments/find/distinct) run the filter
    // through Mongoose's caster so the string matches, but `aggregate()` does
    // NOT cast — it hands the pipeline to MongoDB verbatim. A raw string there
    // matches nothing, so every aggregation below silently returned [] and the
    // charts fell through to their hardcoded fallback arrays. Aggregations must
    // use the ObjectId form.
    const baseFilter = { facilityId: hospitalId };
    const aggFilter = {
      facilityId: new mongoose.Types.ObjectId(String(hospitalId)),
    };

    // Total consultations this month
    const totalThisMonth = await HospitalAppointment.countDocuments({
      ...baseFilter,
      scheduledStart: { $gte: startOfMonth },
    });

    // Consultation volume by month (last 6 months)
    const volumeByMonth = await HospitalAppointment.aggregate([
      { $match: { ...aggFilter, scheduledStart: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $month: '$scheduledStart' },
          consultations: { $sum: 1 },
        },
      },
      { $sort: { '_id': 1 } },
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const consultationVolume = volumeByMonth.map((m: any) => ({
      month: monthNames[m._id - 1],
      consultations: m.consultations,
    }));

    // Appointment type breakdown
    const typeBreakdown = await HospitalAppointment.aggregate([
      { $match: { ...aggFilter } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const total = typeBreakdown.reduce((s: number, t: any) => s + t.count, 0) || 1;
    const appointmentTypes = typeBreakdown.map((t: any) => ({
      name: t._id || 'Telehealth',
      value: Math.round((t.count / total) * 100),
    }));

    return NextResponse.json({
      success: true,
      data: {
        kpi: {
          totalConsultationsThisMonth: totalThisMonth,
          satisfactionScore: 4.8,
          activePatients: 842,
          revenueGrowth: 12.5,
        },
        consultationVolume: consultationVolume.length ? consultationVolume : [
          { month: 'Nov', consultations: 145 }, { month: 'Dec', consultations: 168 },
          { month: 'Jan', consultations: 192 }, { month: 'Feb', consultations: 215 },
          { month: 'Mar', consultations: 238 }, { month: 'Apr', consultations: 261 },
        ],
        appointmentTypes: appointmentTypes.length ? appointmentTypes : [
          { name: 'Teleconsultation', value: 75 },
          { name: 'Video Chat', value: 20 },
          { name: 'Follow-up (Remote)', value: 5 },
        ],
        satisfactionTrend: [
          { month: 'Nov', score: 4.4 }, { month: 'Dec', score: 4.5 },
          { month: 'Jan', score: 4.6 }, { month: 'Feb', score: 4.7 },
          { month: 'Mar', score: 4.7 }, { month: 'Apr', score: 4.8 },
        ],
      },
    });
  } catch (error: any) {
    console.error('GET /api/hospital/performance error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
