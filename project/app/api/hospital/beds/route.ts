import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Bed from '@/lib/models/Bed';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ward = searchParams.get('ward');
    const status = searchParams.get('status');

    await connectToDatabase();
    
    const filter: any = {};
    if (ward) filter.ward = ward;
    if (status) filter.status = status;

    const beds = await Bed.find(filter).populate('patientId', 'firstName lastName dateOfBirth').sort({ bedNumber: 1 });

    return NextResponse.json({ success: true, data: beds });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
