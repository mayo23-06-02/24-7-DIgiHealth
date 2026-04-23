import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { PractitionerProfile } from '@/lib/models/RoleProfiles';
import { Facility } from '@/lib/models/Facility';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    const { id } = await params;
    
    const user = await User.findById(id);
    if (!user || user.role !== 'practitioner') {
      return NextResponse.json({ error: 'Practitioner not found' }, { status: 404 });
    }
    
    const profile = await PractitionerProfile.findOne({ userId: id })
      .populate({ path: 'affiliatedFacilityIds', model: Facility, select: 'name' });

    if (!profile) {
      return NextResponse.json({ error: 'Practitioner profile not found' }, { status: 404 });
    }

    const doc = {
      id: user._id.toString(),
      name: `${user.firstName} ${user.lastName}`,
      specialisation: profile.specialisation,
      hpcsNumber: profile.hpcsaNumber,
      rating: parseFloat((4.5 + Math.random() * 0.5).toFixed(1)),
      reviewCount: Math.floor(Math.random() * 200) + 20,
      nextAvailableMinutes: Math.floor(Math.random() * 60) + 10,
      languages: profile.languages || ['English'],
      avatarUrl: `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=0052cc&color=fff`,
      isOnline: profile.isOnline,
      consultationFee: profile.consultationFee,
      experienceYears: profile.experienceYears,
      practicePhone: user.mobile,
      practiceEmail: user.email,
      facilityName: profile.affiliatedFacilityIds?.[0]?.name || 'Independent Practice',
      facilityId: profile.affiliatedFacilityIds?.[0]?._id?.toString(),
      about: profile.bio,
      clinicalInterests: ['General Care', profile.specialisation],
      acceptsMedicalAid: profile.acceptedMedicalAids || ['Cash']
    };

    return NextResponse.json(doc);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch practitioner' }, { status: 500 });
  }
}
