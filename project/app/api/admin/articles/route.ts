import { NextRequest, NextResponse } from "next/server";
import { Article } from "@/lib/models/Article";
import { requirePlatformAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/logAdminAction";
import { parseArticleInput } from "@/lib/content/articleInput";
import { markArticleCover } from "@/lib/supabase/media";
import { isDuplicateKeyError } from "@/lib/db";
import { apiError } from "@/lib/api/errors";

export const runtime = "nodejs";

/** All articles, drafts included, newest first. Platform admins only. */
export async function GET(req: NextRequest) {
  try {
    const gate = await requirePlatformAdmin();
    if (gate.error) return gate.error;
    const q = (req.nextUrl.searchParams.get("search") || "").trim().toLowerCase();
    const rows = await Article.find({}).sort({ publishedAt: -1 }).limit(500).lean();
    const data = q
      ? rows.filter((a: any) => [a.title, a.author, ...(a.tags ?? [])].some((x) => String(x ?? "").toLowerCase().includes(q)))
      : rows;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return apiError(err);
  }
}

/** Create an article. Published straight away unless saved as a draft. */
export async function POST(req: NextRequest) {
  try {
    const gate = await requirePlatformAdmin();
    if (gate.error) return gate.error;
    const parsed = parseArticleInput(await req.json(), "create");
    if (!parsed.ok) return NextResponse.json({ success: false, errors: parsed.errors }, { status: 400 });
    const v = parsed.value;

    let article;
    try {
      article = await Article.create({
        ...v,
        tags: v.tags ?? [],
        isPublished: v.isPublished ?? true,
        publishedAt: v.publishedAt ?? new Date(),
        likes: 0,
        saves: 0,
        shares: 0,
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        return NextResponse.json({ success: false, errors: ["slug is already used by another article"] }, { status: 409 });
      }
      throw err;
    }
    await markArticleCover(gate.user.userId, v.coverImage).catch(() => false);
    await logAdminAction({ actor: gate.user, action: "article.create", targetType: "article", targetId: String(article._id), metadata: { title: v.title } });
    return NextResponse.json({ success: true, data: { id: String(article._id), slug: v.slug } }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
