import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Staff from '@/lib/models/Staff';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    // In a real application, filter by authenticated user's facility ID.
    const staffList = await Staff.find().populate('userId', 'firstName lastName email').sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: staffList });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();

    // Create staff
    const newStaff = await Staff.create(body);

    return NextResponse.json({ success: true, data: newStaff });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
