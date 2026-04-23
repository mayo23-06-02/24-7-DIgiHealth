import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import HospitalTransaction from '@/lib/models/HospitalTransaction';
import Staff from '@/lib/models/Staff';
import HospitalAppointment from '@/lib/models/HospitalAppointment';

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Revenue today from paid transactions
    const transactions = await HospitalTransaction.find({
      timestamp: { $gte: today },
      status: 'paid'
    });
    const revenueToday = transactions.reduce((acc, curr) => acc + curr.amount, 0);

    // Staff on duty
    const staffOnDuty = await Staff.countDocuments({ isOnDuty: true });

    // Total staff
    const totalStaff = await Staff.countDocuments({});

    // Upcoming appointments
    const upcomingAppointments = await HospitalAppointment.find({
      scheduledStart: { $gte: new Date() },
      status: 'scheduled'
    })
      .limit(8)
      .populate('patientId', 'firstName lastName')
      .lean();

    // Consultations today
    const consultationsToday = await HospitalAppointment.countDocuments({
      scheduledStart: { $gte: today },
    });

    return NextResponse.json({
      success: true,
      data: {
        kpi: {
          consultationsToday,
          revenueToday,
          staffOnDuty,
          totalStaff,
        },
        upcomingAppointments,
      }
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
