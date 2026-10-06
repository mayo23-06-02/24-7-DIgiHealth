import { NextRequest, NextResponse } from "next/server";
import { Article } from "@/lib/models/Article";
import { requirePlatformAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/logAdminAction";
import { parseArticleInput } from "@/lib/content/articleInput";
import { articleHtmlToText } from "@/lib/content/articleFormat";
import { markArticleCover } from "@/lib/supabase/media";
import { isDuplicateKeyError, isValidId } from "@/lib/db";
import { apiError } from "@/lib/api/errors";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const gate = await requirePlatformAdmin();
    if (gate.error) return gate.error;
    const { id } = await params;
    if (!isValidId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const article = await Article.findById(id).lean();
    if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: { ...article, contentText: articleHtmlToText((article as any).content) } });
  } catch (err) {
    return apiError(err);
  }
}

/** Edit, publish or unpublish. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const gate = await requirePlatformAdmin();
    if (gate.error) return gate.error;
    const { id } = await params;
    if (!isValidId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const parsed = parseArticleInput(await req.json(), "update");
    if (!parsed.ok) return NextResponse.json({ success: false, errors: parsed.errors }, { status: 400 });
    const article = await Article.findById(id);
    if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const wasPublished = !!article.isPublished;
    Object.assign(article, parsed.value);
    // Publishing a draft dates it now, unless a date was chosen.
    if (!wasPublished && parsed.value.isPublished && !parsed.value.publishedAt) article.publishedAt = new Date();
    try {
      await article.save();
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        return NextResponse.json({ success: false, errors: ["slug is already used by another article"] }, { status: 409 });
      }
      throw err;
    }
    if (parsed.value.coverImage) await markArticleCover(gate.user.userId, parsed.value.coverImage).catch(() => false);
    await logAdminAction({ actor: gate.user, action: "article.update", targetType: "article", targetId: id, metadata: { fields: Object.keys(parsed.value) } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const gate = await requirePlatformAdmin();
    if (gate.error) return gate.error;
    const { id } = await params;
    if (!isValidId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const article = await Article.findById(id).select("title").lean();
    if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await Article.deleteOne({ _id: id });
    await logAdminAction({ actor: gate.user, action: "article.delete", targetType: "article", targetId: id, metadata: { title: (article as any).title } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
