"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Loader2, Newspaper, Plus, RefreshCw, Search } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import UploadDropzone from "@/components/media/UploadDropzone";
import { ChipInput, Field, Modal, Section, Toggle, ghostBtn, inputClass, primaryBtn } from "./formKit";

interface ArticleRow {
  _id: string;
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  author: string;
  coverImage: string;
  tags: string[];
  isPublished: boolean;
  publishedAt: string;
  readTimeMinutes: number;
}

const TAG_SUGGESTIONS = ["Wellness", "Nutrition", "Mental Health", "Chronic Care", "Maternal Health", "Fitness", "News"];

const rowId = (a: ArticleRow) => String(a.id ?? a._id);
const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "—");

/** News & Articles: platform admins write, publish and retire the articles patients read. */
export default function AdminArticlesPage() {
  const [rows, setRows] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");
  const [editing, setEditing] = useState<{ id: string | null } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ArticleRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/articles");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load articles");
      setRows(json.data ?? []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((a) => (status === "all" ? true : status === "published" ? a.isPublished : !a.isPublished))
      .filter((a) => !q || [a.title, a.author, ...(a.tags ?? [])].some((x) => String(x).toLowerCase().includes(q)));
  }, [rows, search, status]);

  const togglePublish = async (a: ArticleRow) => {
    setBusyId(rowId(a));
    try {
      const res = await fetch(`/api/admin/articles/${rowId(a)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !a.isPublished }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || json.errors?.[0] || "Failed");
      toast.success(a.isPublished ? "Moved to drafts" : "Published");
      void load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const doDelete = async () => {
    const a = confirmDelete;
    if (!a) return;
    setBusyId(rowId(a));
    try {
      const res = await fetch(`/api/admin/articles/${rowId(a)}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not delete");
      toast.success("Article deleted");
      setConfirmDelete(null);
      void load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const published = rows.filter((r) => r.isPublished).length;

  return (
    <div className="mx-auto flex w-full max-w-350 flex-col gap-6 pb-16">
      <PageHeader
        title="News & Articles"
        subtitle={`${published} published, ${rows.length - published} drafts. Patients read these in their Health Blog.`}
        right={
          <div className="flex gap-2">
            <button className={primaryBtn} onClick={() => setEditing({ id: null })}>
              <Plus size={16} /> New article
            </button>
            <button className={ghostBtn} onClick={() => void load()}>
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        }
      />

      <Card className="!rounded-lg">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={`${inputClass} pl-9`} placeholder="Search by title, author or tag" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className={`${inputClass} sm:w-44`} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="all">All</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
        </div>
      </Card>

      <Card noPadding className="!rounded-lg !p-0 overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            title={rows.length ? "No match" : "No articles yet"}
            description={rows.length ? "No article matches these filters." : "Write the first article for patients' Health Blog."}
            icon={<Newspaper size={32} />}
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map((a) => (
              <li key={rowId(a)} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="h-16 w-full shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:w-28">
                  {a.coverImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.coverImage} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-bold text-slate-900">{a.title}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        a.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {a.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p className="line-clamp-1 text-xs text-slate-500">{a.excerpt}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {a.author} · {fmtDate(a.publishedAt)} · {a.readTimeMinutes} min read
                    {a.tags?.length ? ` · ${a.tags.join(", ")}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50" onClick={() => setEditing({ id: rowId(a) })}>
                    Edit
                  </button>
                  <button
                    className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    disabled={busyId === rowId(a)}
                    onClick={() => void togglePublish(a)}
                  >
                    {a.isPublished ? "Unpublish" : "Publish"}
                  </button>
                  <button className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50" onClick={() => setConfirmDelete(a)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editing && (
        <ArticleEditor
          articleId={editing.id}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}

      {confirmDelete && (
        <Modal
          title="Delete article?"
          subtitle={confirmDelete.title}
          onClose={() => setConfirmDelete(null)}
          footer={
            <>
              <button className={ghostBtn} onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
              <button
                className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                disabled={busyId === rowId(confirmDelete)}
                onClick={() => void doDelete()}
              >
                Delete permanently
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            Patients will no longer see this article. To hide it without losing it, use <strong>Unpublish</strong> instead.
          </p>
        </Modal>
      )}
    </div>
  );
}

const EMPTY = {
  title: "",
  excerpt: "",
  content: "",
  coverImage: "",
  author: "",
  tags: [] as string[],
  isPublished: true,
  publishedAt: "",
};

function ArticleEditor({ articleId, onClose, onSaved }: { articleId: string | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ ...EMPTY });
  const [loading, setLoading] = useState(!!articleId);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!articleId) return;
    fetch(`/api/admin/articles/${articleId}`)
      .then((r) => r.json())
      .then((j) => {
        const a = j?.data;
        if (!a) throw new Error(j?.error || "Could not load article");
        setF({
          title: a.title ?? "",
          excerpt: a.excerpt ?? "",
          content: a.contentText ?? "",
          coverImage: a.coverImage ?? "",
          author: a.author ?? "",
          tags: a.tags ?? [],
          isPublished: !!a.isPublished,
          publishedAt: a.publishedAt ? String(a.publishedAt).slice(0, 10) : "",
        });
      })
      .catch((e) => {
        toast.error(e.message);
        onClose();
      })
      .finally(() => setLoading(false));
    // Load once per article; onClose is a fresh closure on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  const save = async () => {
    setBusy(true);
    setErrors([]);
    try {
      const body: Record<string, unknown> = { ...f };
      if (!f.publishedAt) delete body.publishedAt;
      const res = await fetch(articleId ? `/api/admin/articles/${articleId}` : "/api/admin/articles", {
        method: articleId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors(json.errors ?? [json.error ?? "Could not save"]);
        return;
      }
      toast.success(articleId ? "Article updated" : f.isPublished ? "Article published" : "Draft saved");
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      wide
      title={articleId ? "Edit article" : "New article"}
      subtitle="Shown to patients in their Health Blog."
      onClose={onClose}
      footer={
        <>
          <button className={ghostBtn} onClick={onClose}>
            Cancel
          </button>
          <button className={primaryBtn} disabled={busy || loading} onClick={() => void save()}>
            {busy && <Loader2 size={16} className="animate-spin" />}
            {busy ? "Saving…" : f.isPublished ? (articleId ? "Save and publish" : "Publish") : "Save draft"}
          </button>
        </>
      }
    >
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {errors.length > 0 && (
            <ul role="alert" className="list-disc rounded-lg border border-red-200 bg-red-50 p-3 pl-7 text-sm text-red-700">
              {errors.map((m, i) => (
                <li key={i}>{m.charAt(0).toUpperCase() + m.slice(1)}</li>
              ))}
            </ul>
          )}
          <Section title="Article">
            <Field label="Title" required full>
              <input className={inputClass} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Five habits for better sleep" autoFocus={!articleId} />
            </Field>
            <Field label="Summary" required full hint="One or two sentences shown on the article card.">
              <textarea className={inputClass} rows={2} maxLength={400} value={f.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
            </Field>
            <Field label="Content" required full hint="Blank line for a new paragraph. Start a line with ## for a heading or - for a bullet. Wrap words in **double stars** for bold.">
              <textarea className={`${inputClass} font-mono text-[13px]`} rows={14} value={f.content} onChange={(e) => set("content", e.target.value)} />
            </Field>
          </Section>
          <Section title="Cover image">
            <div className="sm:col-span-2">
              <UploadDropzone
                purpose="other"
                accept="image/*"
                label="Upload a cover image"
                value={f.coverImage.startsWith("/api/media/file/") ? f.coverImage : null}
                onUploaded={(asset) => set("coverImage", asset.url)}
                onClear={() => set("coverImage", "")}
              />
            </div>
            <Field label="…or image link" full hint="An https:// link to an image you have the right to use.">
              <input
                className={inputClass}
                value={f.coverImage.startsWith("/api/media/file/") ? "" : f.coverImage}
                onChange={(e) => set("coverImage", e.target.value.trim())}
                placeholder="https://"
              />
            </Field>
          </Section>
          <Section title="Details">
            <Field label="Author" required>
              <input className={inputClass} value={f.author} onChange={(e) => set("author", e.target.value)} placeholder="e.g. Dr Thandi Nkosi" />
            </Field>
            <Field label="Publish date" hint="Leave blank to use today.">
              <input type="date" className={inputClass} value={f.publishedAt} onChange={(e) => set("publishedAt", e.target.value)} />
            </Field>
            <Field label="Tags" full hint="Patients filter the Health Blog by these.">
              <ChipInput value={f.tags} onChange={(v) => set("tags", v)} placeholder="Type and press Enter" suggestions={TAG_SUGGESTIONS} />
            </Field>
            <Toggle checked={f.isPublished} onChange={(v) => set("isPublished", v)} label="Published" hint="Off keeps it as a draft that patients cannot see." />
          </Section>
        </div>
      )}
    </Modal>
  );
}
