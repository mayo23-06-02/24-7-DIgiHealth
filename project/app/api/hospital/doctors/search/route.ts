import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    
    // Search for practitioners by name or email
    const doctors = await User.find({
      role: 'practitioner',
      $or: [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }).limit(10).select('firstName lastName email _id');

    return NextResponse.json({ success: true, data: doctors });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
