import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Message from '@/lib/models/Message';

export async function GET(req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    await connectToDatabase();
    const { conversationId } = await params;
    const { searchParams } = new URL(req.url);
    const after = searchParams.get('after');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query: any = { conversationId };
    if (after) {
      query.createdAt = { $gt: new Date(after) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    return NextResponse.json(messages);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
