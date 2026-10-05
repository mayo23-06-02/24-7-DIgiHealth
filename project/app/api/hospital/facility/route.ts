import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { resolveHospitalId } from '@/lib/hospital/resolveHospitalId';
import Facility from '@/lib/models/Facility';

import { apiError } from "@/lib/api/errors";

export async function GET(_req: NextRequest) {
  try {
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const facilityId = await resolveHospitalId(user.userId, user.email);
    if (!facilityId) {
      return NextResponse.json({ success: false, error: 'No facility linked to this account.' }, { status: 404 });
    }

    const facility = await Facility.findById(facilityId).lean();
    if (!facility) {
      return NextResponse.json({ success: false, error: 'Facility not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: facility });
  } catch (error: any) {
    console.error('[GET /api/hospital/facility]', error);
    return apiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const facilityId = await resolveHospitalId(user.userId, user.email);
    if (!facilityId) {
      return NextResponse.json({ success: false, error: 'No facility linked to this account.' }, { status: 404 });
    }

    const body = await req.json();
    const $set: Record<string, unknown> = {};
    if (typeof body.name === 'string') $set.name = body.name;
    if (['Public', 'Private', 'NGO'].includes(body.facilityType)) $set.facilityType = body.facilityType;
    if (body.address && typeof body.address === 'object') {
      for (const k of ['street', 'city', 'province'] as const) {
        if (body.address[k] !== undefined) $set[`address.${k}`] = body.address[k];
      }
    }
    if (body.contactInfo && typeof body.contactInfo === 'object') {
      for (const k of ['phone', 'emergencyPhone', 'email'] as const) {
        if (body.contactInfo[k] !== undefined) $set[`contactInfo.${k}`] = body.contactInfo[k];
      }
    }
    if (body.bedCapacity && typeof body.bedCapacity === 'object') {
      $set['bedCapacity.total'] = Number(body.bedCapacity.total) || 0;
      $set['bedCapacity.generalAvailable'] = Number(body.bedCapacity.generalAvailable) || 0;
      $set['bedCapacity.icuAvailable'] = Number(body.bedCapacity.icuAvailable) || 0;
    }
    if (typeof body.isOpen === 'boolean') $set.isOpen = body.isOpen;
    if (typeof body.emergencyServices === 'boolean') $set.emergencyServices = body.emergencyServices;
    if (Array.isArray(body.specialties)) {
      $set.specialties = body.specialties.filter((s: unknown) => typeof s === 'string');
    }

    const updated = await Facility.findOneAndUpdate({ _id: facilityId }, { $set }, { new: true }).lean();

    return NextResponse.json({ success: true, data: updated ?? null });
  } catch (error: any) {
    console.error('[PUT /api/hospital/facility]', error);
    return apiError(error);
  }
}
