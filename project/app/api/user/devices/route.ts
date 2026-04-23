import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';

async function getUserId(req: NextRequest): Promise<string | null> {
  return req.headers.get('x-user-id') || null;
}

// GET /api/user/devices – returns list of trusted device sessions
// In a real production system these would be stored in a sessions collection.
// Here we store them on the user document under "trustedDevices".
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await User.findById(userId).lean();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const devices = (user as any).trustedDevices || [];

    // If no devices, seed a placeholder representing the current session
    if (devices.length === 0) {
      const ua = req.headers.get('user-agent') || 'Unknown Browser';
      const browserName = ua.includes('Chrome') ? 'Chrome Browser'
        : ua.includes('Firefox') ? 'Firefox Browser'
        : ua.includes('Safari') ? 'Safari Browser'
        : 'Current Browser';

      const seeded = [
        { id: 'session-current', name: browserName, lastUsed: 'Active now', active: true },
      ];

      await (User as any).collection.updateOne(
        { _id: (user as any)._id },
        { $set: { trustedDevices: seeded } }
      );

      return NextResponse.json({ success: true, data: seeded });
    }

    return NextResponse.json({ success: true, data: devices });
  } catch (err: any) {
    console.error('[GET /api/user/devices]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
