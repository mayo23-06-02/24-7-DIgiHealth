import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PractitionerProfile } from '@/lib/models/RoleProfiles';
import User from '@/lib/models/User';
import { Review } from '@/lib/models/ReviewsDocs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();

    // Fetch practitioner profile and populate user data
    const profile = await PractitionerProfile.findOne({ userId: id }).populate({
      path: 'userId',
      model: User,
      select: 'firstName lastName email avatarUrl'
    }).lean();

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Practitioner not found' }, { status: 404 });
    }

    // Fetch reviews
    const reviews = await Review.find({ practitionerId: id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('patientId', 'firstName lastName')
      .lean();

    const formattedReviews = reviews.map((r: any) => ({
      id: r._id.toString(),
      patientName: `${r.patientId?.firstName} ${r.patientId?.lastName?.charAt(0)}.`,
      rating: r.rating,
      comment: r.comment,
      date: r.createdAt
    }));

    const user = profile.userId as any;
    const data = {
      id: user._id.toString(),
      name: `Dr. ${user.firstName} ${user.lastName}`,
      avatar: user.avatarUrl,
      specialisation: profile.specialisation,
      bio: profile.bio,
      experienceYears: profile.experienceYears || 5,
      languages: profile.languages || ['English'],
      consultationFee: (profile as any).consultationFee || 750,
      rating: profile.rating || 5.0,
      reviewCount: profile.reviewCount || formattedReviews.length,
      isOnline: true, // This could be dynamic with a socket/status check
      reviews: formattedReviews,
      clinicalFocus: (profile as any).clinicalFocus || ["Preventative Care", "Diagnostic Excellence", "Systemic Recovery"],
      medicalAids: (profile as any).medicalAids || ["Discovery", "Bonitas", "Momentum", "Medishield"]
    };

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('[GET /api/practitioners/[id]]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
