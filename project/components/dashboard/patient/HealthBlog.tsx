"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BiTime,
  BiBookmark,
  BiShareAlt,
  BiChevronLeft,
  BiChevronRight,
  BiLoaderAlt,
  BiX,
  BiCheck,
  BiCopy,
  BiLink,
  BiLogoTwitter,
  BiEnvelope,
  BiRefresh,
  BiFilterAlt,
  BiRss,
  BiSolidBulb,
  BiFilter,
  BiNews,
} from "react-icons/bi";
import { FaWhatsapp } from "react-icons/fa";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Carousel from "@/components/ui/Carousel";

interface HealthTip {
  _id: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  readTime?: string;
  image?: string;
  tag?: string;
  category: "tip" | "news" | "blog";
}

const CATEGORY_FILTERS = [
  { label: "All", value: "" },
  { label: "Tips", value: "tip" },
  { label: "News", value: "news" },
  { label: "Blog", value: "blog" },
];

const CATEGORY_COLORS: Record<string, string> = {
  tip: "premium",
  news: "info",
  blog: "success",
};

// ─── Full Article Modal ────────────────────────────────────────────────────────

function ArticleModal({
  article,
  onClose,
  onBookmark,
  isBookmarked,
}: {
  article: HealthTip;
  onClose: () => void;
  onBookmark: (id: string) => void;
  isBookmarked: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [shareToast, setShareToast] = useState("");

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/health-tips/${article._id}`
      : `https://digihealth.co.za/health-tips/${article._id}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setShareToast("Link copied!");
    setTimeout(() => {
      setCopied(false);
      setShareToast("");
    }, 2500);
  };

  const shareVia = (via: "whatsapp" | "twitter" | "email") => {
    const text = encodeURIComponent(`${article.title} — ${shareUrl}`);
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${text}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}`,
      email: `mailto:?subject=${encodeURIComponent(article.title)}&body=${text}`,
    };
    window.open(urls[via], "_blank", "noopener,noreferrer");
    setShareToast(`Shared via ${via}!`);
    setTimeout(() => setShareToast(""), 2500);
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-3xl bg-white rounded-lg overflow-hidden animate-in zoom-in-95 fade-in duration-400 max-h-[90vh] flex flex-col">
        {/* Hero Image */}
        {article.image && (
          <div className="relative h-56 shrink-0 overflow-hidden">
            <img
              src={article.image}
              alt={article.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            {/* Close button over image */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-lg bg-black/30 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/50 transition-all"
            >
              <BiX size={22} />
            </button>
            {article.tag && (
              <div className="absolute bottom-4 left-6">
                <span className="text-[10px] font-black uppercase tracking-widest bg-primary text-white px-3 py-1 rounded-lg">
                  {article.tag}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Header (when no image) */}
        {!article.image && (
          <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              {article.tag && (
                <span className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-lg">
                  {article.tag}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
            >
              <BiX size={22} />
            </button>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="overflow-y-auto custom-scrollbar flex-1 px-8 py-7 space-y-6">
          {/* Title */}
          <h2 className="text-2xl font-black text-slate-800 leading-tight tracking-tight">
            {article.title}
          </h2>

          {/* Author row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-[10px] font-black text-white uppercase">
                {article.author
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div>
                <p className="text-xs font-black text-slate-700 leading-none">
                  {article.author}
                </p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  {article.date}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-300 uppercase tracking-widest">
              <BiTime size={14} className="text-primary" />
              {article.readTime ?? "Quick read"}
            </div>
          </div>

          {/* Excerpt / body */}
          <div className="bg-slate-50/80 rounded-lg p-5 border border-slate-100">
            <p className="text-sm text-slate-600 leading-relaxed">
              {article.excerpt}
            </p>
          </div>

          {/* Extended dummy body paragraphs for richness */}
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              Understanding your health starts with consistent, evidence-based
              habits. The research behind this topic continues to evolve, with
              new clinical studies highlighting the role of lifestyle
              modification in long-term disease prevention and wellness
              optimization.
            </p>
            <p>
              Healthcare professionals at DigiHealth recommend integrating these
              principles into your daily routine: tracking vitals, maintaining
              open communication with your care team, and attending scheduled
              follow-ups. Small, consistent steps lead to lasting results.
            </p>
            <p className="text-[11px] text-slate-400 italic border-l-2 border-primary/30 pl-4">
              "The best investment you can make is in your own health." —
              Evidenced clinical wisdom
            </p>
          </div>

          {/* Shareable link box */}
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <BiLink size={12} /> Shareable Article Link
            </p>
            <div className="flex gap-2">
              <div className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-bold text-slate-400 truncate">
                {shareUrl}
              </div>
              <button
                onClick={copyLink}
                className={`px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shrink-0 ${
                  copied
                    ? "bg-emerald-500 text-white"
                    : "bg-primary text-white hover:bg-primary/80"
                }`}
              >
                {copied ? <BiCheck size={14} /> : <BiCopy size={14} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Share Buttons */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
              Share via
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => shareVia("whatsapp")}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white rounded-lg text-xs font-black transition-all"
              >
                <FaWhatsapp size={16} /> WhatsApp
              </button>
              <button
                onClick={() => shareVia("twitter")}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#1DA1F2]/10 hover:bg-[#1DA1F2] text-[#1DA1F2] hover:text-white rounded-lg text-xs font-black transition-all"
              >
                <BiTwitter size={16} /> X / Twitter
              </button>
              <button
                onClick={() => shareVia("email")}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-700 text-slate-600 hover:text-white rounded-lg text-xs font-black transition-all"
              >
                <BiEnvelope size={16} /> Email
              </button>
            </div>
          </div>

          {/* Archive/Bookmark action */}
          <button
            onClick={() => onBookmark(article._id)}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all border ${
              isBookmarked
                ? "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
                : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-primary/5 hover:text-primary hover:border-primary/30"
            }`}
          >
            <BiBookmark size={16} />
            {isBookmarked
              ? "Archived — Remove from Reading List"
              : "Archive & Save to Reading List"}
          </button>
        </div>

        {/* Toast */}
        {shareToast && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
            {shareToast}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Article Card ──────────────────────────────────────────────────────────────

function ArticleCard({
  article,
  isBookmarked,
  onClick,
  onQuickBookmark,
}: {
  article: HealthTip;
  isBookmarked: boolean;
  onClick: () => void;
  onQuickBookmark: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="px-3 pb-4 h-full select-none">
      <Card
        className="group flex flex-col h-full cursor-pointer hover:border-primary/30 transition-all duration-300"
        variant="solid"
        noPadding
        onClick={onClick}
      >
        {/* Image */}
        <div className="relative h-44 overflow-hidden shrink-0">
          {article.image ? (
            <img
              src={article.image}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-5xl">
              {article.category === "news"
                ? "📰"
                : article.category === "blog"
                  ? "📝"
                  : "💡"}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Tag badge */}
          {article.tag && (
            <div className="absolute top-3 left-3">
              <Badge
                label={article.tag}
                status={(CATEGORY_COLORS[article.category] as any) ?? "premium"}
                variant="solid"
              />
            </div>
          )}

          {/* Quick bookmark */}
          <button
            onClick={onQuickBookmark}
            className={`absolute top-3 right-3 w-9 h-9 backdrop-blur-md rounded-lg flex items-center justify-center transition-all duration-300 ${
              isBookmarked
                ? "bg-amber-400 text-white opacity-100"
                : "bg-white/20 text-white opacity-0 group-hover:opacity-100 hover:bg-primary"
            }`}
          >
            <BiBookmark size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col p-5">
          <h4 className="text-sm font-black text-slate-800 leading-tight mb-2 tracking-tight group-hover:text-primary transition-colors line-clamp-2">
            {article.title}
          </h4>
          <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 mb-auto">
            {article.excerpt}
          </p>

          <div className="mt-4 pt-4 flex items-center justify-between border-t border-slate-50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-[9px] font-black text-white uppercase">
                {article.author
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-600 leading-none">
                  {article.author}
                </p>
                <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">
                  {article.date}
                </p>
              </div>
            </div>
            {article.readTime && (
              <div className="flex items-center gap-1 text-[9px] font-black text-slate-300 uppercase tracking-widest">
                <BiTime size={12} className="text-primary" />
                {article.readTime}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Main HealthBlog Component ─────────────────────────────────────────────────

export default function HealthBlog() {
  const [articles, setArticles] = useState<HealthTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [selectedArticle, setSelectedArticle] = useState<HealthTip | null>(
    null,
  );
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      return new Set(
        JSON.parse(localStorage.getItem("health-bookmarks") || "[]"),
      );
    } catch {
      return new Set();
    }
  });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchArticles = useCallback(async (category: string) => {
    setLoading(true);
    setError(false);
    try {
      const url = category
        ? `/api/health-tips?category=${category}`
        : "/api/health-tips";
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setArticles(data.data || []);
      setCarouselIndex(0);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles(activeCategory);
  }, [activeCategory, fetchArticles]);

  const toggleBookmark = (id: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem("health-bookmarks", JSON.stringify([...next]));
      return next;
    });
  };

  // Visible article count for carousel
  const visibleCount = isClient
    ? window.innerWidth >= 1280
      ? 3
      : window.innerWidth >= 768
        ? 2
        : 1
    : 3;
  const slidePercent = Math.round(100 / visibleCount);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Category Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveCategory(f.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black transition-all border ${
                activeCategory === f.value
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-slate-500 border-slate-200 hover:border-primary/30 hover:text-primary"
              }`}
            >
              <BiFilter size={13} />
              {f.label}
            </button>
          ))}
        </div>

        {/* Nav controls + refresh */}
        <div className="flex items-center gap-2">
          {bookmarks.size > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
              <BiBookmark size={12} /> {bookmarks.size} Saved
            </span>
          )}
          <button
            onClick={() => fetchArticles(activeCategory)}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-primary hover:border-primary/30 transition-all"
            title="Refresh"
          >
            <BiRefresh size={18} />
          </button>
          <button
            onClick={() => setCarouselIndex((p) => Math.max(0, p - 1))}
            disabled={carouselIndex === 0}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-primary hover:border-primary/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <BiChevronLeft size={20} />
          </button>
          <button
            onClick={() =>
              setCarouselIndex((p) => Math.min(articles.length - 1, p + 1))
            }
            disabled={carouselIndex >= articles.length - 1}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-primary hover:border-primary/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <BiChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
          <BiLoaderAlt size={24} className="animate-spin text-primary" />
          <span className="text-sm font-bold">Loading articles...</span>
        </div>
      ) : error ? (
        <div className="text-center py-16 space-y-3">
          <BiNews size={36} className="mx-auto text-slate-200" />
          <p className="text-sm font-bold text-slate-400">
            Could not load articles.
          </p>
          <button
            onClick={() => fetchArticles(activeCategory)}
            className="text-xs font-black text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <BiNews size={36} className="mx-auto text-slate-200" />
          <p className="text-sm font-bold text-slate-400">
            No articles in this category yet.
          </p>
        </div>
      ) : (
        <Carousel
          selectedItem={carouselIndex}
          onChange={setCarouselIndex}
          centerMode={true}
          centerSlidePercentage={slidePercent}
          showArrows={false}
          showIndicators={false}
        >
          {articles.map((article) => (
            <ArticleCard
              key={article._id}
              article={article}
              isBookmarked={bookmarks.has(article._id)}
              onClick={() => setSelectedArticle(article)}
              onQuickBookmark={(e) => {
                e.stopPropagation();
                toggleBookmark(article._id);
              }}
            />
          ))}
        </Carousel>
      )}

      {/* Dot indicators */}
      {articles.length > 1 && !loading && !error && (
        <div className="flex items-center justify-center gap-2 pt-2">
          {articles.map((_, i) => (
            <button
              key={i}
              onClick={() => setCarouselIndex(i)}
              className={`transition-all duration-300 rounded-full ${
                i === carouselIndex
                  ? "w-5 h-2 bg-primary"
                  : "w-2 h-2 bg-slate-200 hover:bg-slate-300"
              }`}
            />
          ))}
        </div>
      )}

      {/* Full Article Modal */}
      {selectedArticle && (
        <ArticleModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          onBookmark={toggleBookmark}
          isBookmarked={bookmarks.has(selectedArticle._id)}
        />
      )}
    </div>
  );
}
