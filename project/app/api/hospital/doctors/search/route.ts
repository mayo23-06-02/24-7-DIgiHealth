import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { PractitionerProfile } from '@/lib/models/RoleProfiles';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { escapeRegex } from '@/lib/escapeRegex';

// Staff management is doctor-only — search always targets practitioner accounts.
export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    const searchRe = escapeRegex(search);
    const doctors = await User.find({
      role: 'practitioner',
      $or: [
        { firstName: { $regex: searchRe, $options: 'i' } },
        { lastName: { $regex: searchRe, $options: 'i' } },
        { email: { $regex: searchRe, $options: 'i' } }
      ]
    }).limit(10).select('firstName lastName email _id').lean();

    // Enrich with specialisation so the Add Staff form can auto-fill Department.
    const userIds = doctors.map((d: any) => d._id);
    const profiles = userIds.length
      ? await PractitionerProfile.find({ userId: { $in: userIds } })
          .select('userId specialisation')
          .lean()
      : [];
    const specialisationByUser = new Map(
      profiles.map((p: any) => [p.userId.toString(), p.specialisation]),
    );

    const data = doctors.map((d: any) => ({
      ...d,
      _id: d._id.toString(),
      specialisation: specialisationByUser.get(d._id.toString()) || '',
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
