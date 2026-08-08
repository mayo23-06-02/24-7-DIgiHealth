import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Review } from '@/lib/models/ReviewsDocs';
import Staff from '@/lib/models/Staff';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { resolveHospitalId } from '@/lib/hospital/resolveHospitalId';

export async function GET() {
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

    // Reviews aren't tagged with facilityId directly — scope via this
    // facility's doctor roster (same pattern as buildHospitalOverview).
    const doctorStaff = await Staff.find({ facilityId: hospitalId, role: 'doctor' })
      .select('userId')
      .lean();
    const doctorUserIds = doctorStaff.map((s: any) => s.userId).filter(Boolean);

    const reviews = doctorUserIds.length
      ? await Review.find({ practitionerId: { $in: doctorUserIds } })
          .populate('patientId', 'firstName lastName')
          .sort({ createdAt: -1 })
          .limit(100)
          .lean()
      : [];

    // Normalise to a flat structure for the frontend
    const data = reviews.map((r: any) => {
      const p = r.patientId;
      const name = p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : '';
      return {
        _id: r._id.toString(),
        patientName: name || 'Anonymous',
        rating: r.rating ?? 0,
        comment: r.comment ?? '',
        createdAt: r.createdAt ?? new Date().toISOString(),
        status: r.isVerified ? 'approved' : 'pending',
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/hospital/reviews error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch reviews' }, { status: 500 });
  }
}
