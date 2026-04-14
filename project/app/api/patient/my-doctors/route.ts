import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { PractitionerProfile, PatientProfile } from '@/lib/models/RoleProfiles';
import Consultation from '@/lib/models/Consultation';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Get doctors from past consultations
    const consultations = await Consultation.find({ patientId: userId }).select('practitionerId');
    const consultedDoctorIds = consultations.map(c => c.practitionerId.toString());

    // 2. Get favorite doctors from patient profile
    const profile = await PatientProfile.findOne({ userId });
    const favoriteDoctorIds = profile?.favoritePractitionerIds?.map(id => id.toString()) || [];

    // Combine and unique
    const uniqueDoctorIds = [...new Set([...consultedDoctorIds, ...favoriteDoctorIds])];

    if (uniqueDoctorIds.length === 0) return NextResponse.json([]);

    const doctorUsers = await User.find({ _id: { $in: uniqueDoctorIds } });
    const doctorProfiles = await PractitionerProfile.find({ userId: { $in: uniqueDoctorIds } });

    const docs = doctorUsers.map(u => {
      const p = doctorProfiles.find(profile => profile.userId.toString() === u._id.toString());
      if (!p) return null;
      return {
        id: u._id.toString(),
        name: `${u.firstName} ${u.lastName}`,
        specialisation: p.specialisation,
        avatarUrl: `https://ui-avatars.com/api/?name=${u.firstName}+${u.lastName}&background=0052cc&color=fff`,
        isOnline: p.isOnline,
        rating: 4.8, // Static for now as in practitioners API
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
