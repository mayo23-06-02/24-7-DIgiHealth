import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { HealthTip } from '@/lib/models/HealthTip';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const query = category ? { category } : {};
    const tips = await HealthTip.find(query).sort({ createdAt: -1 }).lean();

    return NextResponse.json(tips);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
