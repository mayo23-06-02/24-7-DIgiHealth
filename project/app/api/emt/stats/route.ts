import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { EmergencyDispatch } from '@/lib/models/TelehealthCore';
import { EMTProfile } from '@/lib/models/RoleProfiles';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const activeEmergencies = await EmergencyDispatch.countDocuments({ 
      status: { $in: ['pending', 'en_route', 'on_scene', 'transporting'] } 
    });

    const unitsOnline = await EMTProfile.countDocuments({ 
      currentStatus: { $ne: 'offline' } 
    });

    const completedToday = await EmergencyDispatch.countDocuments({
      status: 'completed',
      updatedAt: { $gte: new Date(new Date().setHours(0,0,0,0)) }
    });

    // Mock response time for now
    const avgResponseTime = "12.4m";

    return NextResponse.json({
      success: true,
      data: {
        activeEmergencies,
        unitsOnline,
        completedToday,
        avgResponseTime
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
