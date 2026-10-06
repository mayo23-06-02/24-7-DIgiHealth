/** Validation for News & Articles written by platform admins. */
import { articleTextToHtml } from "./articleFormat";

export interface ArticleInput {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  coverImage?: string;
  author?: string;
  tags?: string[];
  isPublished?: boolean;
  publishedAt?: Date;
  readTimeMinutes?: number;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** About 200 words a minute, never less than 1. */
export function readTimeFor(content: string): number {
  const words = content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function parseArticleInput(
  body: Record<string, any>,
  mode: "create" | "update",
): { ok: true; value: ArticleInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const v: ArticleInput = {};
  const has = (k: string) => body[k] !== undefined;
  const need = (k: string) => mode === "create" || has(k);

  if (need("title")) {
    const t = str(body.title, 200);
    if (!t || t.length < 3) errors.push("title is required");
    else v.title = t;
  }
  if (need("excerpt")) {
    const e = str(body.excerpt, 400);
    if (!e) errors.push("summary is required");
    else v.excerpt = e;
  }
  if (need("content")) {
    const c = str(body.content, 100_000);
    if (!c || c.length < 20) errors.push("content must be at least 20 characters");
    else {
      // Editors write plain text; readers get escaped HTML (see articleFormat.ts).
      v.content = articleTextToHtml(c);
      v.readTimeMinutes = readTimeFor(c);
    }
  }
  if (need("coverImage")) {
    const c = str(body.coverImage, 1000);
    if (!c) errors.push("cover image is required");
    else if (!/^(https:\/\/|\/api\/media\/file\/)/.test(c)) errors.push("cover image must be an uploaded image or an https link");
    else v.coverImage = c;
  }
  if (need("author")) {
    const a = str(body.author, 120);
    if (!a) errors.push("author is required");
    else v.author = a;
  }
  if (has("slug") || mode === "create") {
    const s = slugify(str(body.slug, 120) || v.title || "");
    if (!s) errors.push("slug is required");
    else v.slug = s;
  }
  if (has("tags")) {
    const list = Array.isArray(body.tags) ? body.tags : String(body.tags ?? "").split(/[;,]/);
    v.tags = list.map((t: unknown) => String(t).trim()).filter(Boolean).slice(0, 12);
  }
  if (typeof body.isPublished === "boolean") v.isPublished = body.isPublished;
  if (has("publishedAt") && body.publishedAt) {
    const d = new Date(body.publishedAt);
    if (Number.isNaN(d.getTime())) errors.push("publish date is invalid");
    else v.publishedAt = d;
  }
  return errors.length ? { ok: false, errors } : { ok: true, value: v };
}
