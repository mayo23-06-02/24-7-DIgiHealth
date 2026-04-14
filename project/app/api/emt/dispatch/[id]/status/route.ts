import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { EmergencyDispatch } from '@/lib/models/TelehealthCore';
import { EMTProfile } from '@/lib/models/RoleProfiles';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { status, location, targetFacilityId, handoffNotes, distanceDriven } = body;

    const dispatch = await EmergencyDispatch.findById(params.id);
    if (!dispatch) return NextResponse.json({ success: false, error: 'Dispatch not found' }, { status: 404 });

    if (status) {
      dispatch.status = status;
      dispatch.timeline.push({ status, timestamp: new Date(), location });
      
      // Sync EMT profile status
      await EMTProfile.findOneAndUpdate(
        { userId: dispatch.emtId },
        { currentStatus: status === 'completed' ? 'available' : status }
      );
    }

    if (targetFacilityId) dispatch.targetFacilityId = targetFacilityId;
    if (handoffNotes) dispatch.handoffNotes = handoffNotes;
    if (distanceDriven) dispatch.distanceDriven = distanceDriven;

    await dispatch.save();

    return NextResponse.json({ success: true, data: dispatch });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
