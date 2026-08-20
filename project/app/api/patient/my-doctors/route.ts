import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { PractitionerProfile, PatientProfile } from '@/lib/models/RoleProfiles';
import Consultation from '@/lib/models/Consultation';
import { Facility } from '@/lib/models/Facility';

import { getRequestUser } from '@/lib/auth/getRequestUser';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = user.userId;
    const { searchParams } = new URL(req.url);
    const favoriteOnly = searchParams.get('favorite') === 'true';

    // Patient/Consultation records are still Mongo-keyed; a Postgres-native
    // user (uuid identity) has no possible Mongo counterpart, so skip these
    // lookups rather than let Mongoose throw a CastError.
    const hasMongoIdentity = mongoose.Types.ObjectId.isValid(userId);

    const consultedDoctorIds = hasMongoIdentity
      ? (await Consultation.find({ patientId: userId }).select('practitionerId')).map(c => c.practitionerId.toString())
      : [];

    const profile = hasMongoIdentity ? await PatientProfile.findOne({ userId }) : null;
    const favoriteDoctorIds = profile?.favoritePractitionerIds?.map(id => id.toString()) || [];
    const explicitlyAddedDoctorIds = profile?.myDoctorIds?.map(id => id.toString()) || [];

    // When asked for favorites only, don't fall back to consulted/explicit doctors
    const uniqueDoctorIds = favoriteOnly
      ? [...new Set(favoriteDoctorIds)]
      : [...new Set([...consultedDoctorIds, ...favoriteDoctorIds, ...explicitlyAddedDoctorIds])];

    if (uniqueDoctorIds.length === 0) return NextResponse.json([]);

    const doctorUsers = await User.find({ _id: { $in: uniqueDoctorIds } });
    const doctorProfiles = await PractitionerProfile.find({ userId: { $in: uniqueDoctorIds } })
      .populate({ path: 'affiliatedFacilityIds', model: Facility, select: 'name' });

    const docs = doctorUsers.map(u => {
      const p = doctorProfiles.find(profile => profile.userId.toString() === u._id.toString());
      if (!p) return null;
      const avatarUrl = `https://ui-avatars.com/api/?name=${u.firstName}+${u.lastName}&background=4493b8&color=fff`;
      return {
        id: u._id.toString(),
        name: `${u.firstName} ${u.lastName}`,
        specialisation: p.specialisation,
        hpcsNumber: p.hpcsaNumber,
        rating: p.rating || 4.8,
        reviewCount: p.reviewCount || 0,
        languages: p.languages || ['English'],
        avatar: avatarUrl,
        avatarUrl,
        isOnline: p.isOnline,
        experienceYears: p.experienceYears,
        practicePhone: u.mobile,
        practiceEmail: u.email,
        facilityName: (p.affiliatedFacilityIds?.[0] as any)?.name || 'Independent Practice',
        facilityId: (p.affiliatedFacilityIds?.[0] as any)?._id?.toString(),
        location: p.address?.province || (p.affiliatedFacilityIds?.[0] as any)?.address?.province || 'Telehealth / Online',
        city: p.address?.city || (p.affiliatedFacilityIds?.[0] as any)?.address?.city || 'South Africa',
        about: p.bio,
        bio: p.bio,
        clinicalInterests: ['General Care', p.specialisation],
        acceptsMedicalAid: p.acceptedMedicalAids || ['Cash'],
        isFavorite: favoriteDoctorIds.includes(u._id.toString()),
        hasConsulted: consultedDoctorIds.includes(u._id.toString())
      };
    }).filter(Boolean);

    return NextResponse.json(docs);
  } catch (error) {
    console.error('My Doctors API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch my doctors' }, { status: 500 });
  }
}
