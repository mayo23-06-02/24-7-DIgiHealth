import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { AIChatLog } from '@/lib/models/AIChatLog';
import { getChatResponse, type ChatMessage } from '@/lib/ai/anthropic';

import { apiError } from "@/lib/api/errors";
/** POST — general clinical chat, not tied to a specific patient. Appends to
 * (or creates) an AIChatLog for audit purposes. */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || (user.role !== 'practitioner' && user.role !== 'mega_admin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const message = String(body.message || '').trim();
    if (!message) {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
    }
    const chatLogId = body.chatLogId as string | undefined;

    let log = null;
    if (chatLogId && mongoose.Types.ObjectId.isValid(chatLogId)) {
      log = await AIChatLog.findOne({ _id: chatLogId, practitionerId: user.userId });
    }

    const priorMessages: ChatMessage[] = log
      ? log.messages.map((m: any) => ({ role: m.role, content: m.content }))
      : [];

    const result = await getChatResponse({
      messages: [...priorMessages, { role: 'user', content: message }],
    });

    const now = new Date();
    if (log) {
      log.messages.push({ role: 'user', content: message, at: now });
      log.messages.push({ role: 'assistant', content: result.content, at: now });
      log.modelUsed = result.modelUsed;
      await log.save();
    } else {
      log = await AIChatLog.create({
        practitionerId: user.userId,
        messages: [
          { role: 'user', content: message, at: now },
          { role: 'assistant', content: result.content, at: now },
        ],
        modelUsed: result.modelUsed,
      });
    }

    return NextResponse.json({
      success: true,
      data: { chatLogId: log._id.toString(), reply: result.content },
    });
  } catch (err: any) {
    console.error('[POST /api/practitioner/ai-chat]', err);
    return apiError(err);
  }
}
