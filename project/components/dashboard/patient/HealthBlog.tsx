"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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

export interface ArticleType {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  publishedAt: string;
  readTimeMinutes: number;
  coverImage: string;
  tags: string[];
  likes: number;
  saves: number;
  shares: number;
}

// Category filters – match tags from seed data
const CATEGORY_FILTERS = [
  { label: "All", value: "" },
  { label: "Wellness", value: "Wellness" },
  { label: "Nutrition", value: "Nutrition" },
  { label: "Mental Health", value: "Mental Health" },
  { label: "Telehealth", value: "Telehealth" },
];

// ─── Full Article Modal ────────────────────────────────────────────────────────

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";

export function ArticleModal({
  article,
  onClose,
  onBookmark,
  isBookmarked,
}: {
  article: ArticleType;
  onClose: () => void;
  onBookmark: (id: string) => void;
  isBookmarked: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [shareToast, setShareToast] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/articles/${article.slug}`
      : `https://247digihealth.co.za/articles/${article.slug}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setShareToast("Link copied to clipboard");
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
    <Modal
      isOpen={!!article}
      onClose={onClose}
      noPadding
      width="lg"
      title={article.title}
      hideHeader
    >
      <div className="relative w-full bg-white flex flex-col ">
        {/* Hero Image */}
        <div className="relative h-64 shrink-0 overflow-hidden">
          {article.coverImage ? (
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-6xl">
              💡
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          <Button
            onClick={onClose}
            variant="white"
            className="absolute top-6 right-6 w-12 h-12 p-0 rounded-2xl bg-black/20 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-black/40 hover:scale-105 active:scale-95 transition-all shadow-none !min-w-0"
          >
            <BiX size={28} />
          </Button>

          <div className="absolute bottom-8 left-8 right-8">
            <div className="flex flex-wrap gap-2 mb-4">
              {article.tags?.map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-bold  tracking-normal bg-primary text-white px-4 py-2 rounded-full shadow-none border border-white/20"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h2 className="text-xl md:text-3xl font-bold text-white leading-tight tracking-tight drop- font-grotesk">
              {article.title}
            </h2>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto custom-scrollbar flex-1 px-8 py-8 space-y-8">
          <div className="flex items-center justify-between py-4 border-b border-slate-50">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-lg bg-primary flex items-center justify-center text-xs font-bold text-white  ">
                <Avatar name={article.author} size="sm" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800 leading-none">
                  {article.author}
                </p>
                <p className="text-xs font-bold text-slate-400  mt-1.5 flex items-center gap-2">
                  <BiTime size={14} className="text-primary" />
                  {new Date(article.publishedAt).toLocaleDateString("en-ZA", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  <span className="text-slate-200">|</span>
                  {article.readTimeMinutes} MIN READ
                </p>
              </div>
            </div>
            <Button
              onClick={() => onBookmark(article._id)}
              variant="ghost"
              className={`w-11 h-11 p-0 rounded-2xl flex items-center justify-center transition-all min-w-0 ${
                isBookmarked
                  ? "bg-gray-100 text-gray-600 shadow-inner"
                  : "bg-slate-50 text-slate-400 hover:bg-primary/10 hover:text-primary border border-slate-100"
              }`}
            >
              <BiBookmark size={22} />
            </Button>
          </div>

          <Card className="bg-primary/5  p-6 border border-primary/10 relative overflow-hidden">
            <p className="text-[15px] text-slate-600 leading-relaxed italic">
              "{article.excerpt}"
            </p>
          </Card>

          <div
            className="article-content text-slate-600 space-y-5 text-[15px] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          <div className="pt-8 border-t border-slate-50">
            <p className="text-xs  text-slate-400  mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Share
              with others
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button variant="ghost" onClick={() => shareVia("whatsapp")}>
                <FaWhatsapp size={18} /> WhatsApp
              </Button>
              <Button variant="ghost" onClick={() => shareVia("twitter")}>
                <BiLogoTwitter size={18} /> X (Twitter)
              </Button>
              <Button variant="ghost" onClick={copyLink}>
                {copied ? <BiCheck size={18} /> : <BiLink size={18} />}
                {copied ? "Copied" : "Copy Link"}
              </Button>
            </div>
          </div>
        </div>

        {shareToast && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xl text-white text-xs font-bold  tracking-normal px-6 py-3 rounded-full  animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            {shareToast}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Article Card ──────────────────────────────────────────────────────────────

function ArticleCard({
  article,
  isBookmarked,
  onClick,
  onQuickBookmark,
}: {
  article: ArticleType;
  isBookmarked: boolean;
  onClick: () => void;
  onQuickBookmark: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="px-3 pb-6 h-full select-none">
      <Card
        className="group flex flex-col h-full cursor-pointer transition-all duration-500 hover: hover:shadow-primary/10 hover:-translate-y-1 relative overflow-hidden"
        variant="gradient"
        noPadding
        onClick={onClick}
      >
        <div className="relative h-48 overflow-hidden shrink-0">
          {article.coverImage ? (
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-5xl group-hover:scale-110 transition-transform duration-700">
              💡
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {article.tags?.[0] && (
            <div className="absolute top-4 left-4">
              <span className="text-[9px] font-bold  tracking-normal bg-primary/90 backdrop-blur-md text-white px-3 py-1 rounded-full shadow-none ">
                {article.tags[0]}
              </span>
            </div>
          )}

          <Button
            onClick={onQuickBookmark}
            variant="ghost"
            className={`absolute top-4 right-4 w-10 h-10 backdrop-blur-md rounded-xl flex items-center justify-center transition-all duration-300 shadow-none border border-white/20 !min-w-0 p-0 ${
              isBookmarked
                ? "bg-gray-400 text-white scale-100 opacity-100"
                : "bg-white/30 text-white opacity-0 group-hover:opacity-100 hover:bg-primary scale-90 group-hover:scale-100"
            }`}
          >
            <BiBookmark size={20} />
          </Button>
        </div>

        <div className="p-6 flex flex-col ">
          <div className="flex flex-col items-start">
            <h4 className="text-[15px] font-bold text-slate-800 leading-tight mb-3 tracking-tight group-hover:text-primary transition-colors line-clamp-2 font-grotesk">
              {article.title}
            </h4>
            <p className="text-xs text-slate-500 text-start  line-clamp-2 mb-6 opacity-80">
              {article.excerpt}
            </p>
          </div>

          <div className="mt-auto pt-5 flex items-center justify-between border-t border-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-xs font-bold text-white  shadow-none shadow-primary/20">
                {article.author
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 leading-none">
                  {article.author}
                </p>
                <p className="text-[9px] font-bold text-slate-400  tracking-normal mt-1">
                  {new Date(article.publishedAt).toLocaleDateString("en-ZA", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">
              <BiTime size={14} className="text-primary" />
              <span className="text-xs font-bold text-slate-400  tracking-normal">
                {article.readTimeMinutes} MIN
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Main HealthBlog Component ─────────────────────────────────────────────────

export default function HealthBlog() {
  const [articles, setArticles] = useState<ArticleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [selectedArticle, setSelectedArticle] = useState<ArticleType | null>(
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

  const visibleCount = isClient
    ? window.innerWidth >= 1200
      ? 4
      : window.innerWidth >= 800
        ? 2
        : 1
    : 3;

  const fetchArticles = useCallback(async (category: string) => {
    setLoading(true);
    setError(false);
    try {
      let url = "/api/health-tips";
      if (category) {
        url += `?category=${encodeURIComponent(category)}`;
      }
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

  const slidePercent = 100 / visibleCount;

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center justify-between w-full gap-2">
          <div className="mb-4 px-2">
            <h3 className="font-bold text-2xl text-slate-900 font-grotesk">
              Health Insights
            </h3>
            <p className="text-base text-slate-600">
              Latest medical news and wellness articles
            </p>
          </div>
          <div className="flex">
            <div className="text-xs text-white flex items-center justify-center gap-1 bg-primary px-3 h-8 rounded-full border border-emerald-100 font-bold whitespace-nowrap">
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <h1>{articles.length} Available Articles</h1>
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={() =>
                  setCarouselIndex((prev) => Math.max(0, prev - 1))
                }
                className="w-10 h-10 hover:bg-primary bg-slate-200 hover:text-white rounded-xl transition-all border border-slate-100 flex items-center justify-center text-slate-400"
              >
                <BiChevronLeft size={24} />
              </button>
              <button
                onClick={() =>
                  setCarouselIndex((prev) =>
                    Math.min(articles.length - 1, prev + 1),
                  )
                }
                className="w-10 h-10 hover:bg-primary bg-slate-200 hover:text-white rounded-xl transition-all border border-slate-100 flex items-center justify-center text-slate-400"
              >
                <BiChevronRight size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-2 flex-wrap">
          {CATEGORY_FILTERS.map((f) => (
            <Button
              key={f.value}
              onClick={() => setActiveCategory(f.value)}
              variant={activeCategory === f.value ? "primary" : "ghost"}
              className={`flex items-center gap-1.5 px-4 py-2 !h-auto rounded-lg text-xs font-bold transition-all border !min-w-0 ${
                activeCategory === f.value
                  ? "border-primary"
                  : "bg-white text-slate-500 border-slate-200 hover:border-primary/30 hover:text-primary"
              }`}
            >
              <BiFilter size={13} />
              {f.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {bookmarks.size > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg">
              <BiBookmark size={12} /> {bookmarks.size} Saved
            </span>
          )}
          <Button
            variant="ghost"
            onClick={() => fetchArticles(activeCategory)}
            className="w-9 h-9 p-0 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-primary hover:border-primary/30 transition-all !min-w-0"
            title="Refresh"
          >
            <BiRefresh size={18} />
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center pt-20 gap-3 text-slate-400">
          <BiLoaderAlt size={24} className="animate-spin text-primary" />
          <span className="text-sm font-bold">Loading articles...</span>
        </div>
      ) : error ? (
        <div className="text-center py-16 space-y-3">
          <BiNews size={36} className="mx-auto text-slate-200" />
          <p className="text-sm font-bold text-slate-400">
            Could not load articles.
          </p>
          <Button
            variant="ghost"
            onClick={() => fetchArticles(activeCategory)}
            className="text-xs font-bold text-primary hover:underline bg-transparent !p-0 !min-w-0 !h-auto"
          >
            Try again
          </Button>
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
          showStatus={false}
          infiniteLoop={true}
        >
          {articles.map((article) => (
            <div key={article._id} onClick={() => setSelectedArticle(article)}>
              <ArticleCard
                article={article}
                isBookmarked={bookmarks.has(article._id)}
                onClick={() => setSelectedArticle(article)}
                onQuickBookmark={(e) => {
                  e.stopPropagation();
                  toggleBookmark(article._id);
                }}
              />
            </div>
          ))}
        </Carousel>
      )}

      {/* Modal */}
      {selectedArticle && (
        <ArticleModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          onBookmark={toggleBookmark}
          isBookmarked={bookmarks.has(selectedArticle._id)}
        />
      )}

      <style jsx global>{`
        .article-content h3 {
          font-size: 1.125rem;
          font-weight: 800;
          color: #1e293b;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          letter-spacing: -0.025em;
        }
        .article-content h4 {
          font-size: 1rem;
          font-weight: 700;
          color: #334155;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .article-content p {
          margin-bottom: 1rem;
        }
        .article-content ul {
          list-style-type: disc;
          padding-left: 1.25rem;
          margin-bottom: 1rem;
        }
        .article-content li {
          margin-bottom: 0.25rem;
        }
      `}</style>
    </div>
  );
}
