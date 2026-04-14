import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';
import User from '@/lib/models/User';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

async function getPractitionerId(req: NextRequest): Promise<string> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (token) {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');
      const { payload } = await jwtVerify(token, secret);
      const user = await User.findById(payload.userId as string).lean();
      if (user && (user as any).role === 'practitioner') return (user as any)._id.toString();
    }
  } catch {}
  return req.headers.get('x-practitioner-id') || process.env.MOCK_PRACTITIONER_ID || '000000000000000000000000';
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const practitionerId = await getPractitionerId(req);
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Risk distribution from clinicalRisk.color
    const riskDist = await Consultation.aggregate([
      { $match: { practitionerId: new (require('mongoose').Types.ObjectId)(practitionerId), status: 'completed' } },
      { $group: { _id: '$clinicalRisk.color', count: { $sum: 1 } } }
    ]);

    // Consultation volume trend
    const consultTrend = await Consultation.aggregate([
      { $match: { practitionerId: new (require('mongoose').Types.ObjectId)(practitionerId), scheduledStartTime: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$scheduledStartTime' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top chief complaints (diagnoses)
    const topReasons = await Consultation.aggregate([
      { $match: { practitionerId: new (require('mongoose').Types.ObjectId)(practitionerId), chiefComplaint: { $exists: true, $ne: null } } },
      { $group: { _id: '$chiefComplaint', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);

    // Patient adherence
    const adherenceAgg = await Consultation.aggregate([
      { $match: { practitionerId: new (require('mongoose').Types.ObjectId)(practitionerId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const totalConsults = adherenceAgg.reduce((s, a) => s + a.count, 0);
    const completedConsults = adherenceAgg.find((a) => a._id === 'completed')?.count || 0;
    const adherencePercent = totalConsults > 0 ? Math.round((completedConsults / totalConsults) * 100) : 0;

    // Unique patient count
    const patientIds = await Consultation.find({ practitionerId }).distinct('patientId');

    // Chronic conditions from MedicalContext if available
    let conditions: { name: string; value: number }[] = [];
    try {
      const mongoose = require('mongoose');
      if (mongoose.models.MedicalContext) {
        const ctxs = await mongoose.models.MedicalContext.find({ patientId: { $in: patientIds } }).lean();
        const condMap: Record<string, number> = {};
        ctxs.forEach((c: any) => {
          (c.chronicConditions || []).forEach((cond: string) => {
            condMap[cond] = (condMap[cond] || 0) + 1;
          });
        });
        conditions = Object.entries(condMap)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8);
      }
    } catch {}

    return NextResponse.json({
      success: true,
      data: {
        riskDist: riskDist.map((r) => ({ name: r._id || 'unknown', value: r.count })),
        consultTrend: consultTrend.map((c) => ({ date: c._id, count: c.count })),
        topReasons: topReasons.map((r) => ({ name: r._id || 'Unspecified', count: r.count })),
        conditions,
        adherencePercent,
        totalPatients: patientIds.length,
        totalConsults,
      },
    });
  } catch (err: any) {
    console.error('[GET /api/practitioner/insights]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
