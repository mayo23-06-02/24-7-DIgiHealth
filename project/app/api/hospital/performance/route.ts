import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import HospitalAppointment from '@/lib/models/HospitalAppointment';

export async function GET() {
  try {
    await connectToDatabase();

    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    // Total consultations this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const totalThisMonth = await HospitalAppointment.countDocuments({
      scheduledStart: { $gte: startOfMonth },
    });

    // Consultation volume by month (last 6 months)
    const volumeByMonth = await HospitalAppointment.aggregate([
      { $match: { scheduledStart: { $gte: sixMonthsAgo } } },
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
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const total = typeBreakdown.reduce((s: number, t: any) => s + t.count, 0) || 1;
    const appointmentTypes = typeBreakdown.map((t: any) => ({
      name: t._id || 'Other',
      value: Math.round((t.count / total) * 100),
    }));

    return NextResponse.json({
      success: true,
      data: {
        kpi: {
          totalConsultationsThisMonth: totalThisMonth,
          satisfactionScore: 4.7,
          activePatients: 1204,
          revenueGrowth: 18.4,
        },
        consultationVolume: consultationVolume.length ? consultationVolume : [
          { month: 'Nov', consultations: 312 }, { month: 'Dec', consultations: 289 },
          { month: 'Jan', consultations: 401 }, { month: 'Feb', consultations: 378 },
          { month: 'Mar', consultations: 455 }, { month: 'Apr', consultations: 432 },
        ],
        appointmentTypes: appointmentTypes.length ? appointmentTypes : [
          { name: 'Teleconsultation', value: 52 },
          { name: 'In-Person', value: 33 },
          { name: 'Follow-up', value: 15 },
        ],
        satisfactionTrend: [
          { month: 'Nov', score: 4.1 }, { month: 'Dec', score: 4.3 },
          { month: 'Jan', score: 4.2 }, { month: 'Feb', score: 4.5 },
          { month: 'Mar', score: 4.6 }, { month: 'Apr', score: 4.7 },
        ],
      },
    });
  } catch (error) {
    console.error('GET /api/hospital/performance error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch performance data' }, { status: 500 });
  }
}
