import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { EmergencyDispatch } from '@/lib/models/TelehealthCore';
import User from '@/lib/models/User';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

async function getEmtId(req: NextRequest): Promise<string> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (token) {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');
      const { payload } = await jwtVerify(token, secret);
      const user = await User.findById(payload.userId as string).lean() as any;
      if (user && user.role === 'emt') return user._id.toString();
    }
  } catch (err) {}
  const devEmt = await User.findOne({ role: 'emt' }).lean() as any;
  return devEmt?._id.toString() || '000000000000000000000000';
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const emtId = await getEmtId(req);
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const history = await EmergencyDispatch.find({
      emtId,
      status: { $in: ['completed', 'cancelled'] }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('patientId', 'firstName lastName')
    .populate('targetFacilityId', 'name')
    .lean();

    const total = await EmergencyDispatch.countDocuments({
      emtId,
      status: { $in: ['completed', 'cancelled'] }
    });

    return NextResponse.json({
      success: true,
      data: history,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
