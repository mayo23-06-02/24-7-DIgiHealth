import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import HospitalTransaction from '@/lib/models/HospitalTransaction';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { HospitalAdminProfile } from '@/lib/models/RoleProfiles';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const profile = await HospitalAdminProfile.findOne({ userId: user.userId }).lean();
    if (!profile || !profile.hospitalId) {
       return new NextResponse('Hospital profile not found', { status: 404 });
    }
    const hospitalId = profile.hospitalId;

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format');

    const transactions = await HospitalTransaction.find({ facilityId: hospitalId })
      .populate('patientId', 'firstName lastName email')
      .sort({ timestamp: -1 })
      .lean();

    if (format === 'csv') {
      const headers = ['Date', 'Patient', 'Type', 'Amount', 'Status', 'Method'];
      const rows = transactions.map(t => [
        new Date(t.timestamp).toISOString(),
        t.patientId ? `${(t.patientId as any).firstName} ${(t.patientId as any).lastName}` : 'Unknown',
        t.type,
        t.amount,
        t.status,
        t.paymentMethod
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=financial_report.csv'
        }
      });
    }

    return NextResponse.json({ success: true, data: transactions });
  } catch (error: any) {
    console.error('[GET /api/hospital/reports/financial]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
