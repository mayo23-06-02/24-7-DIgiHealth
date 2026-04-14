import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import HospitalTransaction from '@/lib/models/HospitalTransaction';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const filter: any = {};
    if (status) filter.status = status;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const transactions = await HospitalTransaction.find(filter)
      .populate('patientId', 'firstName lastName email')
      .sort({ timestamp: -1 });

    const totalRevenue = await HospitalTransaction.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const pendingAmount = await HospitalTransaction.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const medicalAid = await HospitalTransaction.aggregate([
      { $match: { paymentMethod: 'medical_aid' } },
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
