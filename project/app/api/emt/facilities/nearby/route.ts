import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Facility } from '@/lib/models/Facility';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Geo-spatial search if coordinates provided, otherwise return all
    let facilities;
    if (lat && lng) {
      facilities = await Facility.find({
        'address.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            $maxDistance: 50000 // 50km
          }
        }
      }).limit(limit).lean();
    } else {
      facilities = await Facility.find().limit(limit).lean();
    }

    return NextResponse.json({ success: true, data: facilities });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
