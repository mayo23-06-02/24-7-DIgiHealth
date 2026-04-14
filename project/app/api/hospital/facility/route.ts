import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Facility from '@/lib/models/Facility';
import User from '@/lib/models/User';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    // In actual implementation, we might read from token:
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    let facilityId = null;
    
    if (token) {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');
        const { payload } = await jwtVerify(token, secret);
        const user = await User.findById(payload.userId as string);
        facilityId = user?.facilityId;
    }

    if (!facilityId) {
        // Fallback to the first available facility for demo
        const fallback = await Facility.findOne();
        return NextResponse.json({ success: true, data: fallback });
    }

    const facility = await Facility.findById(facilityId);
    return NextResponse.json({ success: true, data: facility });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    
    // Similarly, find facility based on authenticated admin.
    const facilityId = body._id; // assume the frontend passes ID
    const updatedFacility = await Facility.findByIdAndUpdate(facilityId, body, { new: true });

    return NextResponse.json({ success: true, data: updatedFacility });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
