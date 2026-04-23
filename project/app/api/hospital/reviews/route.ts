import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Review } from '@/lib/models/ReviewsDocs';

export async function GET() {
  try {
    await connectToDatabase();

    const reviews = await ReviewsDoc.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Normalise to a flat structure for the frontend
    const data = reviews.map((r: any) => ({
      _id: r._id.toString(),
      patientName: r.patientId?.toString() ? 'Patient' : 'Anonymous',
      rating: r.rating ?? 0,
      comment: r.comment ?? '',
      createdAt: r.createdAt ?? new Date().toISOString(),
      status: r.status ?? 'pending',
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/hospital/reviews error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch reviews' }, { status: 500 });
  }
}
