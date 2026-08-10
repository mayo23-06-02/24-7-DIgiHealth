import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Review } from '@/lib/models/ReviewsDocs';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { isMongoObjectId } from '@/lib/utils/mongoId';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { consultationId, practitionerId, rating, comment } = body;

    await connectToDatabase();
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { payload } = await jwtVerify(token, SECRET);
    const userId = payload.userId as string;
    if (!isMongoObjectId(userId)) {
      return NextResponse.json(
        { error: 'Reviews are not yet available for this account.' },
        { status: 400 },
      );
    }

    const review = await Review.create({
      consultationId,
      patientId: userId,
      practitionerId,
      rating,
      comment,
      isVerified: true
    });

    return NextResponse.json({ success: true, review });
  } catch (err) {
    console.error('Failed to submit review', err);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
