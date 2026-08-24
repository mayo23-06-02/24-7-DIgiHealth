import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';

import { apiError } from "@/lib/api/errors";
async function getUserId(req: NextRequest): Promise<string | null> {
  return req.headers.get('x-user-id') || null;
}

// DELETE /api/user/devices/[id] – revokes a trusted device by ID
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await User.findById(userId).lean();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const deviceId = id;
    const existing = (user as any).trustedDevices || [];
    const updated = existing.filter((d: any) => d.id !== deviceId);

    await (User as any).collection.updateOne(
      { _id: (user as any)._id },
      { $set: { trustedDevices: updated } }
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/user/devices/:id]', err);
    return apiError(err);
  }
}
