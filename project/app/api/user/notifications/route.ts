import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';

async function getUserId(req: NextRequest): Promise<string | null> {
  return req.headers.get('x-user-id') || null;
}

// Notification preferences are stored as a subdocument on User.
// Since the field doesn't exist yet on the schema, we use $set with
// the "notifications" key and let mongoose accept unknown keys via strict:false
// OR we just store them on a generic map field.

// GET /api/user/notifications
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await User.findById(userId).lean();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const prefs = (user as any).notificationPrefs || {
      email: true,
      push: true,
      sms: false,
    };

    return NextResponse.json({ success: true, data: prefs });
  } catch (err: any) {
    console.error('[GET /api/user/notifications]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/user/notifications
export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { email, push, sms } = body;

    // Use strict:false workaround: update on the raw collection
    await (User as any).collection.updateOne(
      { _id: require('mongoose').Types.ObjectId.createFromHexString(userId) },
      { $set: { notificationPrefs: { email: !!email, push: !!push, sms: !!sms } } }
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[PUT /api/user/notifications]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
