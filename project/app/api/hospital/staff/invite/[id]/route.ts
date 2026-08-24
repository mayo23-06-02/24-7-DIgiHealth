import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import StaffInvite from '@/lib/models/StaffInvite';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { resolveHospitalId } from '@/lib/hospital/resolveHospitalId';
import { updateStaffInviteByMongoId } from '@/lib/postgres/facility';

import { apiError } from "@/lib/api/errors";
/** DELETE — cancel a pending invite */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const hospitalId = await resolveHospitalId(user.userId, user.email);
    if (!hospitalId) {
      return NextResponse.json({ success: false, error: 'No facility linked to this account' }, { status: 404 });
    }

    const { id } = await params;
    const invite = await StaffInvite.findOneAndUpdate(
      { _id: id, facilityId: hospitalId },
      { status: 'cancelled' },
      { new: true },
    );
    if (!invite) {
      return NextResponse.json({ success: false, error: 'Invite not found' }, { status: 404 });
    }
    await updateStaffInviteByMongoId(id, { status: 'cancelled' });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/hospital/staff/invite/[id]]', error);
    return apiError(error);
  }
}
