import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { resolvePostgresHospitalId } from '@/lib/postgres/resolveId';

export async function GET(request: Request) {
  try {
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const facilityId = await resolvePostgresHospitalId(user.userId, user.email);
    if (!facilityId) {
      return NextResponse.json({ error: 'No facility linked' }, { status: 404 });
    }

    const occupancyTrend = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (11 - i));
      return {
        month: date.toLocaleString('default', { month: 'short' }),
        occupancy: Math.floor(Math.random() * 40) + 55,
        capacity: 100,
      };
    });

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

    const appointmentDistribution = [
      { type: 'Consultation', count: 3400 },
      { type: 'Procedure', count: 1200 },
      { type: 'Follow-up', count: 2100 },
      { type: 'Lab', count: 1800 },
    ];

    return NextResponse.json({
      success: true,
      data: {
        occupancyTrend,
        revenueByDept,
        patientDemographics,
        appointmentDistribution,
        summary: {
          avgOccupancy: 72,
          totalRevenue: 275000,
          totalPatients: 16700,
          totalAppointments: 8500,
        },
      },
    });
  } catch (error: any) {
    console.error('[GET /api/hospital/analytics]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
