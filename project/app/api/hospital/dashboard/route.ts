import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import HospitalTransaction from '@/lib/models/HospitalTransaction';
import Staff from '@/lib/models/Staff';
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

    // New user — no facility linked yet
    if (!hospitalId) {
      return NextResponse.json({
        success: true,
        data: {
          isNewUser: true,
          name: user.firstName,
          kpi: { consultationsToday: 0, revenueToday: 0, staffOnDuty: 0, totalStaff: 0 },
          upcomingAppointments: [],
          monthlyData: [],
        },
      });
    }

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Revenue today from paid transactions
    const transactions = await HospitalTransaction.find({
      facilityId: hospitalId,
      timestamp: { $gte: today },
      status: 'paid',
    });
    const revenueToday = transactions.reduce((acc, curr) => acc + (curr.amount ?? 0), 0);

    // Staff counts
    const [staffOnDuty, totalStaff] = await Promise.all([
      Staff.countDocuments({ facilityId: hospitalId, isOnDuty: true }),
      Staff.countDocuments({ facilityId: hospitalId }),
    ]);

    // Consultations today
    const consultationsToday = await HospitalAppointment.countDocuments({
      facilityId: hospitalId,
      scheduledStart: { $gte: today },
    });

    // Upcoming appointments (next 8)
    const upcomingAppointments = await HospitalAppointment.find({
      facilityId: hospitalId,
      scheduledStart: { $gte: now },
      status: 'scheduled',
    })
      .sort({ scheduledStart: 1 })
      .limit(8)
      .populate('patientId', 'firstName lastName')
      .lean();

    // Monthly volume — last 6 months
    const monthlyData = await Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const startOfMonth = new Date(d);
        const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
        return HospitalAppointment.countDocuments({
          facilityId: hospitalId,
          scheduledStart: { $gte: startOfMonth, $lte: endOfMonth },
        }).then(count => ({
          month: d.toLocaleString('default', { month: 'short' }),
          consultations: count,
        }));
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        isNewUser: false,
        name: user.firstName,
        kpi: { consultationsToday, revenueToday, staffOnDuty, totalStaff },
        upcomingAppointments,
        monthlyData,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/hospital/dashboard]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
