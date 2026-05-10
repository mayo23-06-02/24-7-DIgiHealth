import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { PractitionerProfile } from '@/lib/models/RoleProfiles';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    // Find practitioners
    const users = await User.find({
      role: 'practitioner',
      $or: [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }).select('firstName lastName email _id').lean();

    // Get practitioner profiles to ensure they have one
    const practitionerIds = users.map(u => u._id);
    const profiles = await PractitionerProfile.find({ userId: { $in: practitionerIds } }).lean();

    // Filter to only users with profiles and map to expected format
    const doctors = users.map(user => {
      const profile = profiles.find(p => p.userId.toString() === user._id.toString());
      if (!profile) return null;
      
      return {
        id: user._id.toString(),
        name: `Dr. ${user.firstName} ${user.lastName}`,
        specialisation: (profile as any).specialisation || 'General Practitioner',
        rating: (profile as any).rating || 0,
        reviewCount: (profile as any).reviewCount || 0,
        languages: (profile as any).languages || [],
        isOnline: (profile as any).isOnline || false,
        avatar: (profile as any).profilePhoto || null,
        nextAvailable: 'Available Now' // Fallback for UI
      };
    }).filter(Boolean);

    return NextResponse.json({ success: true, data: doctors });
  } catch (error: any) {
    console.error('[GET /api/hospital/doctors]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}