import { NextResponse } from 'next/server';
import User from '@/lib/models/User';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { escapeRegex } from '@/lib/escapeRegex';
import { resolveHospitalId } from '@/lib/hospital/resolveHospitalId';
import { getFacilityPatientIds } from '@/lib/facility/membership';

import { apiError } from "@/lib/api/errors";
export async function GET(req: Request) {
  try {
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = escapeRegex(searchParams.get('search') || '');

    // Only people this hospital holds a file for are searchable.
    const hospitalId = await resolveHospitalId(user.userId, user.email);
    if (!hospitalId) return NextResponse.json({ success: true, data: [] });
    const fileIds = await getFacilityPatientIds(hospitalId);
    if (fileIds.length === 0) return NextResponse.json({ success: true, data: [] });

    const patients = await User.find({
      role: 'patient',
      _id: { $in: fileIds },
      $or: [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ],
    }).limit(10).select('firstName lastName email _id');

    return NextResponse.json({ success: true, data: patients });
  } catch (error: any) {
    return apiError(error);
  }
}
