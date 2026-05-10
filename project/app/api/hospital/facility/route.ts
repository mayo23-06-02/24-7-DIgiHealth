import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Facility from '@/lib/models/Facility';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { resolveHospitalId } from '@/lib/hospital/resolveHospitalId';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const hospitalId = await resolveHospitalId(user.userId, user.email);
    if (!hospitalId) {
      return NextResponse.json({ success: false, error: 'No facility linked to this account.' }, { status: 404 });
    }

    const facility = await Facility.findById(hospitalId).lean();
    if (!facility) {
      return NextResponse.json({ success: false, error: 'Facility not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: facility });
  } catch (error: any) {
    console.error('[GET /api/hospital/facility]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const hospitalId = await resolveHospitalId(user.userId, user.email);
    if (!hospitalId) {
      return NextResponse.json({ success: false, error: 'No facility linked to this account.' }, { status: 404 });
    }

    const body = await req.json();
    const updatedFacility = await Facility.findByIdAndUpdate(
      hospitalId, 
      { ...body }, 
      { new: true }
    ).lean();

    return NextResponse.json({ success: true, data: updatedFacility });
  } catch (error: any) {
    console.error('[PUT /api/hospital/facility]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
