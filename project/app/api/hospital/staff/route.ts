import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { resolveHospitalId } from '@/lib/hospital/resolveHospitalId';
import Staff from '@/lib/models/Staff';
import { isValidId } from '@/lib/db';

import { apiError } from "@/lib/api/errors";

const NO_FACILITY = 'No facility linked to this account. Please complete your facility profile first.';

async function requireHospitalAdmin() {
  const user = await getRequestUser();
  if (!user || user.role !== 'hospital_admin') return null;
  return user;
}

export async function GET(_req: NextRequest) {
  try {
    const user = await requireHospitalAdmin();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const facilityId = await resolveHospitalId(user.userId, user.email);
    if (!facilityId) return NextResponse.json({ success: false, error: NO_FACILITY }, { status: 404 });

    const staffList = await Staff.find({ facilityId })
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: staffList });
  } catch (error: any) {
    console.error('[GET /api/hospital/staff]', error);
    return apiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireHospitalAdmin();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const facilityId = await resolveHospitalId(user.userId, user.email);
    if (!facilityId) return NextResponse.json({ success: false, error: NO_FACILITY }, { status: 404 });

    const body = await req.json();
    const staffUserId = body.userId && isValidId(String(body.userId)) ? String(body.userId) : undefined;

    const created = await Staff.create({
      userId: staffUserId,
      facilityId,
      role: body.role,
      department: body.department,
      shiftSchedule: {
        start: body.shiftSchedule?.start || undefined,
        end: body.shiftSchedule?.end || undefined,
        days: body.shiftSchedule?.days || [],
      },
      isOnDuty: !!body.isOnDuty,
      hourlyRate: Number(body.hourlyRate) || 0,
      qualifications: body.qualifications || [],
    });
    await created.populate('userId', 'firstName lastName email');

    return NextResponse.json({ success: true, data: created.toObject() });
  } catch (error: any) {
    console.error('[POST /api/hospital/staff]', error);
    return apiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireHospitalAdmin();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const facilityId = await resolveHospitalId(user.userId, user.email);
    if (!facilityId) {
      return NextResponse.json({ success: false, error: 'No facility linked to this account' }, { status: 404 });
    }

    const { staffId, ...updates } = await req.json();

    const $set: Record<string, unknown> = {};
    if (typeof updates.role === 'string') $set.role = updates.role;
    if (typeof updates.department === 'string') $set.department = updates.department;
    if (typeof updates.isOnDuty === 'boolean') $set.isOnDuty = updates.isOnDuty;
    if (typeof updates.hourlyRate === 'number') $set.hourlyRate = updates.hourlyRate;
    if (Array.isArray(updates.qualifications)) $set.qualifications = updates.qualifications;
    if (updates.shiftSchedule && typeof updates.shiftSchedule === 'object') {
      if (updates.shiftSchedule.start) $set['shiftSchedule.start'] = updates.shiftSchedule.start;
      if (updates.shiftSchedule.end) $set['shiftSchedule.end'] = updates.shiftSchedule.end;
      if (Array.isArray(updates.shiftSchedule.days)) $set['shiftSchedule.days'] = updates.shiftSchedule.days;
    }

    const updated = await Staff.findOneAndUpdate(
      { _id: staffId, facilityId },
      { $set },
      { new: true },
    )
      .populate('userId', 'firstName lastName email')
      .lean();
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Staff not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[PATCH /api/hospital/staff]', error);
    return apiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireHospitalAdmin();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const facilityId = await resolveHospitalId(user.userId, user.email);
    if (!facilityId) {
      return NextResponse.json({ success: false, error: 'No facility linked to this account' }, { status: 404 });
    }

    const staffId = new URL(req.url).searchParams.get('id');
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'staffId is required' }, { status: 400 });
    }

    const deleted = await Staff.findOneAndDelete({ _id: staffId, facilityId }).lean();
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Staff not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/hospital/staff]', error);
    return apiError(error);
  }
}
