import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { PatientProfile } from '@/lib/models/RoleProfiles';
import { getRequestUser } from '@/lib/auth/getRequestUser';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: practitionerId } = await params;
    if (!mongoose.Types.ObjectId.isValid(user.userId) || !mongoose.Types.ObjectId.isValid(practitionerId)) {
      return NextResponse.json({ error: 'Unsupported account type for favorites' }, { status: 400 });
    }

    await PatientProfile.updateOne(
      { userId: user.userId },
      { $addToSet: { favoritePractitionerIds: practitionerId } },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Add favorite doctor error:', error);
    return NextResponse.json({ error: 'Failed to add favorite doctor' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: practitionerId } = await params;
    if (!mongoose.Types.ObjectId.isValid(user.userId) || !mongoose.Types.ObjectId.isValid(practitionerId)) {
      return NextResponse.json({ error: 'Unsupported account type for favorites' }, { status: 400 });
    }

    await PatientProfile.updateOne(
      { userId: user.userId },
      { $pull: { favoritePractitionerIds: practitionerId } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove favorite doctor error:', error);
    return NextResponse.json({ error: 'Failed to remove favorite doctor' }, { status: 500 });
  }
}
