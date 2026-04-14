import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { EMTProfile } from '@/lib/models/RoleProfiles';
import User from '@/lib/models/User';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const responders = await EMTProfile.find({
      currentStatus: { $ne: 'offline' }
    })
    .populate('userId', 'firstName lastName avatar mobile')
    .lean();

    return NextResponse.json({
      success: true,
      data: responders
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
