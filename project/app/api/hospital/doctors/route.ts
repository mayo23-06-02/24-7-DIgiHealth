// app/api/doctors/route.ts
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

    // Get practitioner profiles
    const practitionerIds = users.map(u => u._id);
    const profiles = await PractitionerProfile.find({ userId: { $in: practitionerIds } }).lean();

    // Merge data
    const doctors = users.map(user => {
      const profile = profiles.find(p => p.userId.toString() === user._id.toString()) || {};
      return {
        id: user._id,
        name: `Dr. ${user.firstName} ${user.lastName}`,
        email: user.email,
        specialisation: profile.specialisation || 'General Practitioner',
        rating: profile.rating || 4.5,
        reviewCount: profile.reviewCount || 0,
        languages: profile.languages || ['English'],
        isOnline: profile.isOnline || false,
        avatar: profile.avatarUrl || null,
        experienceYears: profile.experienceYears || 0,
        bio: profile.bio || '',
        achievements: profile.achievements || [],
        reviews: profile.reviews || [],
        schedule: ['09:00 AM', '10:30 AM', '02:15 PM'] // Mock quick schedule view
      };
    });

    return NextResponse.json({ success: true, data: doctors });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}