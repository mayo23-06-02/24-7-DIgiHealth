import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import BedOccupancy from '@/lib/models/BedOccupancy';
import HospitalTransaction from '@/lib/models/HospitalTransaction';
import Staff from '@/lib/models/Staff';
import EmergencyIncident from '@/lib/models/EmergencyIncident';
import HospitalAppointment from '@/lib/models/HospitalAppointment';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    // In a real app we'd get the exact facilityId from the authenticated admin.
    // Assuming we just fetch the aggregate for now or use a mock logic.

    const bedOccupancy = await BedOccupancy.findOne().sort({ timestamp: -1 });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const transactions = await HospitalTransaction.find({
      timestamp: { $gte: today },
      status: 'paid'
    });
    const revenueToday = transactions.reduce((acc, curr) => acc + curr.amount, 0);

    const staffOnDuty = await Staff.countDocuments({ isOnDuty: true });

    // Mock wait time since it's complex to calculate real time without checkin/checkout tracking
    const waitTime = 15; 

    // Additional data for real-time widgets
    const recentEmergencies = await EmergencyIncident.find({ status: 'en_route' }).limit(5);
    const upcomingAppointments = await HospitalAppointment.find({
      scheduledStart: { $gte: new Date() },
      status: 'scheduled'
    }).limit(5).populate('patientId', 'firstName lastName');

    return NextResponse.json({
      success: true,
      data: {
        kpi: {
          bedOccupancyPercent: bedOccupancy ? Math.round((bedOccupancy.occupiedBeds / bedOccupancy.totalBeds) * 100) : 0,
          currentWaitTime: waitTime,
          revenueToday,
          staffOnDuty
        },
        bedOccupancyStats: bedOccupancy || { general: 0, icu: 0, emergency: 0 },
        recentEmergencies,
        upcomingAppointments
      }
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
