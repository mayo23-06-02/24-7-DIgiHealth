import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Conversation from '@/lib/models/Conversation';
import User from '@/lib/models/User';
import Message from '@/lib/models/Message';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import mongoose from 'mongoose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');

async function getUserInfo() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    await connectToDatabase();
    const user = await User.findById(payload.userId).select('_id role').lean();
    return user ? { userId: user._id.toString(), role: user.role } : null;
  } catch (err) {
    console.error('getUserInfo Auth Error:', err);
    return null;
  }
}

/** GET /api/conversations — list conversations (batched last-message + unread) */
export async function GET() {
  const userInfo = await getUserInfo();
  if (!userInfo) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId } = userInfo;
  const userOid = new mongoose.Types.ObjectId(userId);

  await connectToDatabase();

  const convs = await Conversation.find({
    $and: [
      {
        $or: [{ patientId: userOid }, { practitionerId: userOid }],
      },
      {
        $or: [
          { consultationId: { $exists: false } },
          { consultationId: null },
        ],
      },
    ],
  })
    .populate({ path: 'patientId', model: User, select: 'firstName lastName role' })
    .populate({ path: 'practitionerId', model: User, select: 'firstName lastName role' })
    .sort({ lastActivityAt: -1 })
    .limit(100)
    .lean();

  if (convs.length === 0) {
    return NextResponse.json([]);
  }

  const convOids = convs.map((c: any) => c._id);
  const convIdStrs = convOids.map((id: any) => id.toString());

  // Batch last messages + unread counts (avoids 2N queries)
  const [lastMessages, unreadCounts] = await Promise.all([
    Message.aggregate([
      {
        $match: {
          $or: [
            { conversationId: { $in: convOids } },
            { conversationId: { $in: convIdStrs } },
          ],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { $toString: '$conversationId' },
          content: { $first: '$content' },
          createdAt: { $first: '$createdAt' },
        },
      },
    ]),
    Message.aggregate([
      {
        $match: {
          isRead: false,
          $and: [
            {
              $or: [
                { conversationId: { $in: convOids } },
                { conversationId: { $in: convIdStrs } },
              ],
            },
            {
              $or: [{ receiverId: userOid }, { receiverId: userId }],
            },
          ],
        },
      },
      {
        $group: {
          _id: { $toString: '$conversationId' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const lastByConv = new Map(
    lastMessages.map((m: any) => [String(m._id), m]),
  );
  const unreadByConv = new Map(
    unreadCounts.map((u: any) => [String(u._id), u.count as number]),
  );

  const result = convs.map((conv: any) => {
    const idStr = conv._id.toString();
    const lastMsg = lastByConv.get(idStr);
    const unreadCount = unreadByConv.get(idStr) || 0;

    const other =
      conv.patientId?._id?.toString() === userId
        ? conv.practitionerId
        : conv.patientId;

    const contactName = other
      ? other.role === 'practitioner'
        ? `Dr. ${other.firstName} ${other.lastName}`
        : `${other.firstName} ${other.lastName}`
      : 'Unknown';

    return {
      id: conv._id,
      consultationId: conv.consultationId,
      contactId: other?._id?.toString() || '',
      contactName,
      practitionerId: conv.practitionerId?._id || conv.practitionerId,
      doctor: contactName,
      avatar: other
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(other.firstName || '')}+${encodeURIComponent(other.lastName || '')}&background=4493b8&color=fff`
        : '',
      lastMessage: lastMsg?.content || 'No messages yet.',
      timestamp: conv.lastActivityAt
        ? new Date(conv.lastActivityAt).toLocaleTimeString('en-ZA', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '',
      online: false,
      unread: unreadCount,
      status: conv.status,
    };
  });

  return NextResponse.json(result);
}

/** POST /api/conversations — start or retrieve a conversation */
export async function POST(request: Request) {
  const userInfo = await getUserInfo();
  if (!userInfo) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, role } = userInfo;

  await connectToDatabase();
  const { practitionerId, patientId, consultationId, contactId } = await request.json();

  let targetPractitionerId = practitionerId;
  let targetPatientId = patientId;

  if (contactId) {
    if (role === 'patient') {
      targetPractitionerId = contactId;
      targetPatientId = userId;
    } else {
      targetPractitionerId = userId;
      targetPatientId = contactId;
    }
  } else {
    if (role === 'patient') {
      targetPractitionerId = practitionerId;
      targetPatientId = userId;
    } else {
      targetPractitionerId = userId;
      targetPatientId = patientId;
    }
  }

  if (!targetPractitionerId || !targetPatientId) {
    return NextResponse.json({ error: 'Missing required participant IDs' }, { status: 400 });
  }

  let conv;
  if (consultationId) {
    conv = await Conversation.findOne({ consultationId });
  } else {
    conv = await Conversation.findOne({
      patientId: targetPatientId,
      practitionerId: targetPractitionerId,
      $or: [{ consultationId: { $exists: false } }, { consultationId: null }],
    });
  }

  if (!conv) {
    conv = await Conversation.create({
      consultationId: consultationId || undefined,
      patientId: targetPatientId,
      practitionerId: targetPractitionerId,
      status: 'active',
      minutesAllocated: 600,
    });
  }

  return NextResponse.json({
    conversationId: conv._id,
    consultationId: conv.consultationId,
  });
}
