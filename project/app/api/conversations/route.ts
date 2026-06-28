import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Conversation from '@/lib/models/Conversation';
import { Consultation } from '@/lib/models/Consultation';
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
    const user = await User.findById(payload.userId).lean();
    return user ? { userId: user._id.toString(), role: user.role } : null;
  } catch (err) { 
    console.error('getUserInfo Auth Error:', err);
    return null; 
  }
}

/** GET /api/conversations — list all conversations for the logged-in user */
export async function GET() {
  const userInfo = await getUserInfo();
  if (!userInfo) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId } = userInfo;

  await connectToDatabase();

  const convs = await Conversation.find({
    $and: [
      {
        $or: [
          { patientId: new mongoose.Types.ObjectId(userId) },
          { practitionerId: new mongoose.Types.ObjectId(userId) }
        ]
      },
      {
        $or: [
          { consultationId: { $exists: false } },
          { consultationId: null }
        ]
      }
    ]
  })
    .populate({ path: 'patientId', model: User, select: 'firstName lastName role' })
    .populate({ path: 'practitionerId', model: User, select: 'firstName lastName role' })
    .sort({ lastActivityAt: -1 })
    .lean();

  // Get the last message for each conversation
  const result = await Promise.all(
    convs.map(async (conv: any) => {
      const lastMsg = await Message.findOne({ conversationId: conv._id }).sort({ createdAt: -1 }).lean();
      
      const unreadCount = await Message.countDocuments({
        conversationId: conv._id,
        receiverId: new mongoose.Types.ObjectId(userId),
        isRead: false
      });

      const other = conv.patientId?._id?.toString() === userId
        ? conv.practitionerId
        : conv.patientId;

      const contactName = other 
        ? (other.role === 'practitioner' 
            ? `Dr. ${other.firstName} ${other.lastName}` 
            : `${other.firstName} ${other.lastName}`)
        : 'Unknown';

      return {
        id: conv._id,
        consultationId: conv.consultationId,
        contactId: other?._id?.toString() || '',
        contactName,
        practitionerId: conv.practitionerId?._id || conv.practitionerId,
        doctor: contactName, // Backwards compatibility
        avatar: other ? `https://ui-avatars.com/api/?name=${other.firstName}+${other.lastName}&background=0052cc&color=fff` : '',
        lastMessage: lastMsg?.content || 'No messages yet.',
        timestamp: conv.lastActivityAt
          ? new Date(conv.lastActivityAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
          : '',
        online: false,  // real-time presence handled separately
        unread: unreadCount,
        status: conv.status,
      };
    })
  );

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

  // If using the generic `contactId` approach
  if (contactId) {
    if (role === 'patient') {
      targetPractitionerId = contactId;
      targetPatientId = userId;
    } else {
      targetPractitionerId = userId;
      targetPatientId = contactId;
    }
  } else {
    // Backwards compatibility
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

  // Check for existing persistent conversation
  let conv;
  if (consultationId) {
    conv = await Conversation.findOne({ consultationId });
  } else {
    conv = await Conversation.findOne({ 
      patientId: targetPatientId, 
      practitionerId: targetPractitionerId, 
      $or: [
        { consultationId: { $exists: false } },
        { consultationId: null }
      ]
    });
  }

  if (!conv) {
    conv = await Conversation.create({
      consultationId: consultationId || undefined,
      patientId: targetPatientId,
      practitionerId: targetPractitionerId,
      status: 'active',
      minutesAllocated: 600, // Large default for persistent channels
    });
  }

  return NextResponse.json({ 
    conversationId: conv._id, 
    consultationId: conv.consultationId 
  });
}
