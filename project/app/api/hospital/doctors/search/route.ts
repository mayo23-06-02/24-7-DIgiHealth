import { NextResponse } from 'next/server';
import User from '@/lib/models/User';
import { PractitionerProfile } from '@/lib/models/RoleProfiles';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { escapeRegex } from '@/lib/escapeRegex';
import { resolveHospitalId } from '@/lib/hospital/resolveHospitalId';
import Staff from '@/lib/models/Staff';

import { apiError } from "@/lib/api/errors";
// Staff management is doctor-only — search always targets practitioner accounts.
export async function GET(req: Request) {
  try {
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    // Only doctors on this hospital's own staff list are searchable.
    const hospitalId = await resolveHospitalId(user.userId, user.email);
    if (!hospitalId) return NextResponse.json({ success: true, data: [] });
    const staffRows = await Staff.find({ facilityId: hospitalId }).select('userId').lean();
    const staffUserIds = staffRows.map((s: any) => s.userId).filter(Boolean);
    if (staffUserIds.length === 0) return NextResponse.json({ success: true, data: [] });

    const searchRe = escapeRegex(search);
    const doctors = await User.find({
      role: 'practitioner',
      _id: { $in: staffUserIds },
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
    return apiError(error);
  }
}
