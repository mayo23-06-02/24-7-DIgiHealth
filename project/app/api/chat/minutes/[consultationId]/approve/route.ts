import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Conversation } from '@/lib/models/Conversation';

import { apiError } from "@/lib/api/errors";
export async function POST(req: Request, { params }: { params: Promise<{ consultationId: string }> }) {
  try {
    await connectToDatabase();
    const { consultationId } = await params;
    
    const conversation = await Conversation.findOne({ consultationId });
    if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    conversation.minutesApproved += conversation.minutesRequested;
    conversation.minutesRequested = 0;
    await conversation.save();

    return NextResponse.json({ success: true, conversation });
  } catch (error: any) {
    return apiError(error);
  }
}
