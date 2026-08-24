import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Article } from '@/lib/models/Article';

import { apiError } from "@/lib/api/errors";
export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);
    const category = searchParams.get('category');

    let query: any = { isPublished: true };
    if (category) {
      query.tags = { $in: [category] };
    }

    const articles = await Article.find(query)
      .sort({ publishedAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ success: true, data: articles });
  } catch (error: any) {
    console.error('[GET /api/articles]', error);
    return apiError(error);
  }
}
