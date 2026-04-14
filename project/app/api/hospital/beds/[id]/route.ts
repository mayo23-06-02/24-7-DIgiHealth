import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Bed from '@/lib/models/Bed';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const bedId = params.id;

    const updatedBed = await Bed.findByIdAndUpdate(bedId, body, { new: true }).populate('patientId', 'firstName lastName dateOfBirth');

    if (!updatedBed) {
      return NextResponse.json({ success: false, error: 'Bed not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedBed });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
