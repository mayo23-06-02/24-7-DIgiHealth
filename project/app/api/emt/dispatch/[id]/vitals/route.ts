import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { EmergencyDispatch } from '@/lib/models/TelehealthCore';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { vitals } = body;

    const dispatch = await EmergencyDispatch.findById(params.id);
    if (!dispatch) return NextResponse.json({ success: false, error: 'Dispatch not found' }, { status: 404 });

    if (vitals) {
        dispatch.vitals.push({
            timestamp: new Date(),
            ...vitals
        });
    }

    await dispatch.save();

    return NextResponse.json({ success: true, data: dispatch });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
