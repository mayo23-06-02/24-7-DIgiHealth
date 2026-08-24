import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import BedOccupancy from '@/lib/models/BedOccupancy';
import HospitalTransaction from '@/lib/models/HospitalTransaction';
import Staff from '@/lib/models/Staff';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { resolveHospitalId } from '@/lib/hospital/resolveHospitalId';

import { apiError } from "@/lib/api/errors";
export async function GET(req: Request, { params }: { params: Promise<{ type: string }> }) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const hospitalId = await resolveHospitalId(user.userId, user.email);
    if (!hospitalId) {
      return NextResponse.json({ success: false, error: 'No facility linked to this account' }, { status: 404 });
    }

    const { type } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'csv';

    let reportData: any[] = [];
    let headers: string[] = [];
    let filename = `report_${type}_${new Date().toISOString().split('T')[0]}`;

    if (type === 'occupancy') {
      const records = await BedOccupancy.find({ facilityId: hospitalId }).sort({ timestamp: -1 }).limit(100).lean();
      headers = ['Date', 'Total Beds', 'Occupied', 'ICU Occupied', 'Emergency Occupied', 'Occupancy %'];
      reportData = records.map(r => [
        r.timestamp?.toISOString().split('T')[0],
        r.totalBeds,
        r.occupiedBeds,
        r.icuOccupied,
        r.emergencyOccupied,
        Math.round((r.occupiedBeds / r.totalBeds) * 100) + '%'
      ]);
    } else if (type === 'financial') {
      const records = await HospitalTransaction.find({ facilityId: hospitalId }).sort({ timestamp: -1 }).limit(500).lean();
      headers = ['Date', 'Type', 'Amount', 'Status', 'Payment Method'];
      reportData = records.map(r => [
        r.timestamp?.toISOString().split('T')[0],
        r.type,
        `R ${r.amount}`,
        r.status,
        r.paymentMethod
      ]);
    } else if (type === 'staff') {
      const records = await Staff.find({ facilityId: hospitalId }).lean();
      headers = ['Role', 'Department', 'Shift Start', 'Shift End', 'On Duty', 'Hourly Rate'];
      reportData = records.map(r => [
        r.role,
        r.department,
        (r.shiftSchedule as any)?.start,
        (r.shiftSchedule as any)?.end,
        r.isOnDuty ? 'Yes' : 'No',
        `R ${r.hourlyRate}`
      ]);
    } else {
      return NextResponse.json({ success: false, error: 'Unknown report type' }, { status: 400 });
    }

    if (format === 'csv') {
      const csvLines = [headers.join(','), ...reportData.map(row => row.join(','))];
      const csvContent = csvLines.join('\n');
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`
        }
      });
    }

    // JSON fallback
    return NextResponse.json({ success: true, data: { headers, rows: reportData } });

  } catch (error: any) {
    return apiError(error);
  }
}
