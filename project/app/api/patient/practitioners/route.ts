import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { PractitionerProfile } from '@/lib/models/RoleProfiles';
import { Facility } from '@/lib/models/Facility';

export async function GET() {
  try {
    await connectToDatabase();
    
    const users = await User.find({ role: 'practitioner' });
    const profiles = await PractitionerProfile.find({ userId: { $in: users.map(u => u._id) } })
      .populate({ path: 'affiliatedFacilityIds', model: Facility, select: 'name' });

    const docs = profiles.map(p => {
      const u = users.find(user => user._id.toString() === p.userId.toString());
      if (!u) return null;
      return {
        id: u._id.toString(),
        name: `${u.firstName} ${u.lastName}`,
        specialisation: p.specialisation,
        hpcsNumber: p.hpcsaNumber,
        rating: p.rating || 5.0,
        reviewCount: p.reviewCount || 0,
        nextAvailableMinutes: Math.floor(Math.random() * 60) + 10,
        languages: p.languages || ['English'],
        avatarUrl: `https://ui-avatars.com/api/?name=${u.firstName}+${u.lastName}&background=4493b8&color=fff`,
        isOnline: p.isOnline,
        consultationFee: 0,
        experienceYears: p.experienceYears,
        practicePhone: u.mobile,
        practiceEmail: u.email,
        facilityName: (p.affiliatedFacilityIds?.[0] as any)?.name || 'Independent Practice',
        facilityId: (p.affiliatedFacilityIds?.[0] as any)?._id?.toString(),
        location: p.address?.province || (p.affiliatedFacilityIds?.[0] as any)?.address?.province || 'Telehealth / Online',
        city: p.address?.city || (p.affiliatedFacilityIds?.[0] as any)?.address?.city || 'South Africa',
        about: p.bio,
        clinicalInterests: ['General Care', p.specialisation],
        acceptsMedicalAid: p.acceptedMedicalAids || ['Cash']
      }
    }).filter(Boolean);

    return NextResponse.json(docs);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch practitioners' }, { status: 500 });
  }
}
