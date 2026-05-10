import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PractitionerProfile } from '@/lib/models/RoleProfiles';
import User from '@/lib/models/User';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const specialisation = searchParams.get('specialisation');
    const search = searchParams.get('search');
    const gender = searchParams.get('gender');
    const languages = searchParams.get('languages');
    const maxPrice = searchParams.get('maxPrice');
    const rating = searchParams.get('rating');
    const sortBy = searchParams.get('sortBy');

    await connectToDatabase();

    const query: any = {};
    if (specialisation && specialisation !== 'All') {
      query.specialisation = { $regex: specialisation, $options: 'i' };
    }
    
    // In a real app, we'd filter by user gender if it's on the profile
    // For now we assume gender filter would match some criteria
    
    const profiles = await PractitionerProfile.find(query).populate({
      path: 'userId',
      model: User,
      select: 'firstName lastName email avatarUrl'
    });

    const slots = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

    let availablePractitioners = profiles.map(p => {
      const u = p.userId as any;
      return {
        id: u._id.toString(),
        name: `Dr. ${u.firstName} ${u.lastName}`,
        avatar: u.avatarUrl || `https://ui-avatars.com/api/?name=${u.firstName}+${u.lastName}&background=0052cc&color=fff`,
        specialisation: p.specialisation,
        availableSlots: slots.filter(() => Math.random() > 0.3),
        bio: p.bio,
        rating: 4.5 + Math.random() * 0.5,
        reviewCount: Math.floor(Math.random() * 100) + 20,
        consultationFee: (p as any).consultationFee || 750,
        languages: (p.languages && p.languages.length > 0) ? p.languages : ['English'],
        availabilityBadge: Math.random() > 0.5 ? 'Available Today' : 'Next: Tomorrow',
        experienceYears: p.experienceYears || 5
      };
    });

    if (search) {
      const q = search.toLowerCase();
      availablePractitioners = availablePractitioners.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.specialisation.toLowerCase().includes(q)
      );
    }

    if (maxPrice) {
      availablePractitioners = availablePractitioners.filter(p => p.consultationFee <= parseInt(maxPrice));
    }
    if (languages && languages !== 'All') {
      availablePractitioners = availablePractitioners.filter(p => p.languages.includes(languages));
    }

    if (sortBy) {
      if (sortBy === 'rating') availablePractitioners.sort((a,b) => b.rating - a.rating);
      if (sortBy === 'price_asc') availablePractitioners.sort((a,b) => a.consultationFee - b.consultationFee);
      if (sortBy === 'price_desc') availablePractitioners.sort((a,b) => b.consultationFee - a.consultationFee);
      if (sortBy === 'experience') availablePractitioners.sort((a,b) => b.experienceYears - a.experienceYears);
    }

    return NextResponse.json(availablePractitioners);
  } catch (error) {
    console.error('Available Practitioners API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
  }
}
