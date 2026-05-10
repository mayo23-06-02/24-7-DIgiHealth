import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Staff from '@/lib/models/Staff';
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
      return NextResponse.json({
        success: false,
        error: 'No facility linked to this account. Please complete your facility profile first.',
      }, { status: 404 });
    }

    const staffList = await Staff.find({ facilityId: hospitalId })
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: staffList });
  } catch (error: any) {
    console.error('[GET /api/hospital/staff]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const hospitalId = await resolveHospitalId(user.userId, user.email);
    if (!hospitalId) {
      return NextResponse.json({
        success: false,
        error: 'No facility linked to this account. Please complete your facility profile first.',
      }, { status: 404 });
    }

    const body = await req.json();
    const newStaff = await Staff.create({ ...body, facilityId: hospitalId });

    return NextResponse.json({ success: true, data: newStaff });
  } catch (error: any) {
    console.error('[POST /api/hospital/staff]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { staffId, ...updates } = body;

    const updated = await Staff.findByIdAndUpdate(staffId, updates, { new: true })
      .populate('userId', 'firstName lastName email');

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[PATCH /api/hospital/staff]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get('id');
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'staffId is required' }, { status: 400 });
    }

    await Staff.findByIdAndDelete(staffId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/hospital/staff]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
