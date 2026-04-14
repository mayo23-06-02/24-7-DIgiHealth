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
  
  // Dev Fallback
  const devEmt = await User.findOne({ role: 'emt' }).lean() as any;
  return devEmt?._id.toString() || '000000000000000000000000';
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const emtId = await getEmtId(req);

    const activeDispatch = await EmergencyDispatch.findOne({
      emtId,
      status: { $in: ['pending', 'en_route', 'on_scene', 'transporting', 'at_facility'] }
    }).populate('patientId', 'firstName lastName avatar mobile').populate('targetFacilityId', 'name address currentWaitTimeMins').lean();

    return NextResponse.json({ success: true, data: activeDispatch });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
