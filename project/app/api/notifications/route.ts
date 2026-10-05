import { NextResponse } from 'next/server';
import { Notification } from '@/lib/models/Communications';
import { toId, isValidId } from '@/lib/db';

function userMatch(userId: string) {
  const oid = (toId(userId) as string);
  // Match both ObjectId and legacy string storage
  return { $or: [{ userId: oid }, { userId }] };
}

export async function GET(req: Request) {
  try {
    // Email nudge for messages that have sat unread for 5+ hours (throttled, idempotent)
    const { sendDueMessageReminders } = await import('@/lib/email/reminders');
    void sendDueMessageReminders();

    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // Postgres-native accounts have no Mongo identity — this collection is
    // still Mongo-only, so there's nothing for them to have (see lib/utils/mongoId.ts).
    if (!isValidId(userId)) return NextResponse.json([]);

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
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isValidId(userId)) return NextResponse.json({ success: true });

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
