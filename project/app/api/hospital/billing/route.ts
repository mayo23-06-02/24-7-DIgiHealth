import { NextRequest, NextResponse } from 'next/server';
import HospitalTransaction from '@/lib/models/HospitalTransaction';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { resolveHospitalId } from '@/lib/hospital/resolveHospitalId';

import { apiError } from "@/lib/api/errors";
import { toId } from '@/lib/db';
export async function GET(req: NextRequest) {
  try {
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const hospitalId = await resolveHospitalId(user.userId, user.email);
    if (!hospitalId) {
      return NextResponse.json({ success: false, error: 'No facility linked to this account.' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const filter: any = { facilityId: hospitalId };
    if (status) filter.status = status;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const transactions = await HospitalTransaction.find(filter)
      .populate('patientId', 'firstName lastName email')
      .sort({ timestamp: -1 })
      .lean();

    const hId = (toId(hospitalId.toString()) as string);

    const totalRevenue = await HospitalTransaction.aggregate([
      { $match: { facilityId: hId, status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const pendingAmount = await HospitalTransaction.aggregate([
      { $match: { facilityId: hId, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const medicalAid = await HospitalTransaction.aggregate([
      { $match: { facilityId: hId, paymentMethod: 'medical_aid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    return NextResponse.json({
      success: true,
      data: transactions,
      summary: {
        totalRevenue: totalRevenue[0]?.total || 0,
        pendingAmount: pendingAmount[0]?.total || 0,
        medicalAidClaims: medicalAid[0]?.total || 0
      }
    });
  } catch (error: any) {
    console.error('[GET /api/hospital/billing]', error);
    return apiError(error);
  }
}
