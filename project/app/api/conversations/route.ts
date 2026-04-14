import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Conversation from '@/lib/models/Conversation';
import { Consultation } from '@/lib/models/Consultation';
import User from '@/lib/models/User';
import Message from '@/lib/models/Message';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-for-dev-only');

async function getUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.userId as string;
  } catch { return null; }
}

/** GET /api/conversations — list all conversations for the logged-in user */
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectToDatabase();

  const convs = await Conversation.find({
    $or: [{ patientId: userId }, { practitionerId: userId }]
  })
    .populate({ path: 'patientId', model: User, select: 'firstName lastName' })
    .populate({ path: 'practitionerId', model: User, select: 'firstName lastName' })
    .sort({ lastActivityAt: -1 })
    .lean();

  // Get the last message for each conversation
  const result = await Promise.all(
    convs.map(async (conv: any) => {
      const lastMsg = await Message.findOne({ conversationId: conv._id }).sort({ sentAt: -1 }).lean();
      const other = conv.patientId?._id?.toString() === userId
        ? conv.practitionerId
        : conv.patientId;
      return {
        id: conv._id,
        consultationId: conv.consultationId,
        doctor: other ? `${other.firstName} ${other.lastName}` : 'Unknown',
        avatar: other ? `https://ui-avatars.com/api/?name=${other.firstName}+${other.lastName}&background=0052cc&color=fff` : '',
        lastMessage: lastMsg?.content || 'No messages yet.',
        timestamp: conv.lastActivityAt
          ? new Date(conv.lastActivityAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
          : '',
        online: false,  // real-time presence handled separately
        unread: 0,      // unread count (can be enriched later)
        status: conv.status,
      };
    })
  );

  return NextResponse.json(result);
}

/** POST /api/conversations/initiate — start or retrieve a conversation */
export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectToDatabase();
  const { practitionerId, consultationId } = await request.json();

  if (!practitionerId) {
    return NextResponse.json({ error: 'practitionerId is required' }, { status: 400 });
  }

  // Check for existing persistent conversation (no consultationId)
  let conv = await Conversation.findOne({ 
    patientId: userId, 
    practitionerId, 
    consultationId: consultationId || { $exists: false } 
  });

  if (!conv) {
    conv = await Conversation.create({
      consultationId: consultationId || undefined,
      patientId: userId,
      practitionerId,
      status: 'active',
      minutesAllocated: 600, // Large default for persistent channels
    });
  }

  return NextResponse.json({ 
    conversationId: conv._id, 
    consultationId: conv.consultationId 
  });
}
