import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Review } from '@/lib/models/ReviewsDocs';
import { PractitionerProfile } from '@/lib/models/RoleProfiles';
import mongoose from 'mongoose';
import { isMongoObjectId } from '@/lib/utils/mongoId';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: practitionerId } = await params;
    const userId = req.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!isMongoObjectId(userId)) {
      return NextResponse.json(
        { success: false, error: 'Reviews are not yet available for this account.' },
        { status: 400 },
      );
    }

    const { rating, comment } = await req.json();

    if (!rating || !comment) {
      return NextResponse.json({ success: false, error: 'Rating and comment are required' }, { status: 400 });
    }

    await connectToDatabase();

    // Create the review
    const newReview = await Review.create({
      patientId: userId,
      practitionerId: practitionerId,
      rating,
      comment,
      isVerified: true // Assuming all reviews from profile are verified for now
    });

    // Update practitioner profile aggregate rating and count
    const allReviews = await Review.find({ practitionerId: practitionerId });
    const reviewCount = allReviews.length;
    const avgRating = allReviews.reduce((acc, rev) => acc + rev.rating, 0) / reviewCount;

    await PractitionerProfile.findOneAndUpdate(
      { userId: practitionerId },
      { 
        $set: { rating: avgRating, reviewCount: reviewCount },
        $push: { 
          reviews: { 
            reviewer: userId, // We might want to store name here too, but for now just ID
            rating, 
            comment, 
            date: new Date() 
          } 
        }
      }
    );

    return NextResponse.json({ success: true, data: newReview });
  } catch (err: any) {
    console.error('[POST /api/practitioners/[id]/reviews]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: practitionerId } = await params;
    await connectToDatabase();

    const reviews = await Review.find({ practitionerId: practitionerId })
      .sort({ createdAt: -1 })
      .populate('patientId', 'firstName lastName avatarUrl')
      .lean();

    return NextResponse.json({ success: true, data: reviews });
  } catch (err: any) {
    console.error('[GET /api/practitioners/[id]/reviews]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
