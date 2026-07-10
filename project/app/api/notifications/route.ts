import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { Notification } from '@/lib/models/Communications';

function userMatch(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) return { userId };
  const oid = new mongoose.Types.ObjectId(userId);
  // Match both ObjectId and legacy string storage
  return { $or: [{ userId: oid }, { userId }] };
}

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const notifications = await Notification.find(userMatch(userId))
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Notifications API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await connectToDatabase();
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, readAll } = await req.json();
    const match = userMatch(userId);

    if (readAll) {
      await Notification.updateMany(match, { isRead: true });
    } else if (id) {
      await Notification.updateOne(
        { _id: id, ...match },
        { isRead: true },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notifications API Error:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}
