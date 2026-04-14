import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import BedOccupancy from '@/lib/models/BedOccupancy';
import HospitalTransaction from '@/lib/models/HospitalTransaction';
import HospitalAppointment from '@/lib/models/HospitalAppointment';

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    // Bed occupancy trend — last 30 days (use BedOccupancy snapshots)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const occupancyTrend = await BedOccupancy.find({ timestamp: { $gte: thirtyDaysAgo } })
      .sort({ timestamp: 1 })
      .lean();

    // Revenue by day — last 30 days
    const revenueByDay = await HospitalTransaction.aggregate([
      { $match: { timestamp: { $gte: thirtyDaysAgo }, status: 'paid' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Appointment type breakdown
    const appointmentTypes = await HospitalAppointment.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    // Wait time by hour (mock — requires actual checkin data for real implementation)
    const waitTimeByHour = Array.from({ length: 12 }, (_, i) => ({
      hour: `${(i + 8).toString().padStart(2, '0')}:00`,
      avgWait: Math.floor(Math.random() * 25) + 5
    }));

    return NextResponse.json({
      success: true,
      data: {
        occupancyTrend: occupancyTrend.map(o => ({
          date: o.timestamp?.toISOString().split('T')[0],
          percent: Math.round((o.occupiedBeds / o.totalBeds) * 100)
        })),
        revenueByDay: revenueByDay.map(r => ({ date: r._id, revenue: r.revenue })),
        appointmentTypes: appointmentTypes.map(t => ({ name: t._id, value: t.count })),
        waitTimeByHour
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
