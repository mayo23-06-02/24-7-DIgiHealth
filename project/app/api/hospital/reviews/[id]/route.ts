import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Review } from '@/lib/models/ReviewsDocs';
import Staff from '@/lib/models/Staff';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { resolveHospitalId } from '@/lib/hospital/resolveHospitalId';

async function assertReviewInFacility(reviewId: string, hospitalId: string) {
  const review = await Review.findById(reviewId).lean();
  if (!review) return null;

  const doctorStaff = await Staff.findOne({
    facilityId: hospitalId,
    role: 'doctor',
    userId: (review as any).practitionerId,
  }).lean();

  return doctorStaff ? review : null;
}

/** PATCH — approve a review (marks it verified) */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const review = await assertReviewInFacility(id, hospitalId);
    if (!review) {
      return NextResponse.json({ success: false, error: 'Review not found' }, { status: 404 });
    }

    await Review.findByIdAndUpdate(id, { isVerified: true });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[PATCH /api/hospital/reviews/[id]]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/** DELETE — dismiss a review */
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
    const review = await assertReviewInFacility(id, hospitalId);
    if (!review) {
      return NextResponse.json({ success: false, error: 'Review not found' }, { status: 404 });
    }

    await Review.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/hospital/reviews/[id]]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
