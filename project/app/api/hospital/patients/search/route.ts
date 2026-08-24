import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { escapeRegex } from '@/lib/escapeRegex';

import { apiError } from "@/lib/api/errors";
export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = escapeRegex(searchParams.get('search') || '');

    const patients = await User.find({
      role: 'patient',
      $or: [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ],
    }).limit(10).select('firstName lastName email _id');

    return NextResponse.json({ success: true, data: patients });
  } catch (error: any) {
    return apiError(error);
  }
}
