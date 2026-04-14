import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { EMTProfile } from '@/lib/models/RoleProfiles';
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

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const emtUserId = await getEmtId(req);
    const body = await req.json();
    const { items } = body; // Array of { item: string, status: boolean }

    const profile = await EMTProfile.findOneAndUpdate(
      { userId: emtUserId },
      { 
        $set: { 
          equipmentChecklist: items.map((i: any) => ({ ...i, updatedAt: new Date() })) 
        } 
      },
      { new: true, upsert: true }
    );

    return NextResponse.json({ success: true, data: profile.equipmentChecklist });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
