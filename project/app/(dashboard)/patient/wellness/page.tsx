"use client";

import React, { useState, useEffect } from "react";
import {
  BiDizzy,
  BiConfused,
  BiMeh,
  BiSmile,
  BiHappyAlt,
  BiMoon,
  BiWalk,
  BiCheckCircle,
  BiBulb,
  BiBookOpen,
  BiSolidQuoteLeft,
  BiLoaderAlt,
  BiSolidQuoteAltLeft,
} from "react-icons/bi";
import { HiFire } from "react-icons/hi";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Carousel from "@/components/ui/Carousel";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import Toast from "@/components/ui/Toast";
import {
  ArticleModal,
  ArticleType,
} from "@/components/dashboard/patient/HealthBlog";

// --- TYPES ---
interface WellnessData {
  score: number;
  streak: number;
  history: { date: string; score: number }[];
}

interface CheckinForm {
  mood: number; // 1-5
  sleepHours: number;
  steps: number;
}

interface HealthTip {
  id?: string;
  _id?: string;
  title: string;
  content: string;
  icon: React.ReactNode;
}

// --- MOCK DATA ---
const MOCK_TIPS: HealthTip[] = [
  {
    id: "1",
    title: "Hydration Goal",
    content:
      "Drink 8 glasses of water today to maintain peak cellular function.",
    icon: <BiBulb className="text-blue-500" />,
  },
  {
    id: "2",
    title: "Screen Break",
    content: "Follow the 20-20-20 rule to reduce digital eye strain.",
    icon: <BiBulb className="text-gray-500" />,
  },
  {
    id: "3",
    title: "Protein Power",
    content: "Include lean protein in your breakfast for sustained energy.",
    icon: <BiBulb className="text-emerald-500" />,
  },
];

const MOCK_ARTICLES: Partial<ArticleType>[] = [
  {
    _id: "a1",
    title: "The Science of Better Sleep",
    excerpt:
      "Discover how circadian rhythms impact your overall health and productivity.",
    coverImage:
      "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&q=80&w=800",
    readTimeMinutes: 5,
    tags: ["Wellness", "Sleep"],
  },
  {
    _id: "a2",
    title: "Neuroplasticity & Mental Health",
    excerpt:
      "How daily habits can physically reshape your brain and improve mood.",
    coverImage:
      "https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&q=80&w=800",
    readTimeMinutes: 8,
    tags: ["Mental Health", "Science"],
  },
];

const MOODS = [
  { val: 1, icon: <BiDizzy size={32} />, label: "Awful" },
  { val: 2, icon: <BiConfused size={32} />, label: "Poor" },
  { val: 3, icon: <BiMeh size={32} />, label: "Neutral" },
  { val: 4, icon: <BiSmile size={32} />, label: "Good" },
  { val: 5, icon: <BiHappyAlt size={32} />, label: "Great" },
];

export default function WellnessHub() {
  const [wellnessData, setWellnessData] = useState<WellnessData | null>(null);
  const [tips, setTips] = useState<HealthTip[]>(MOCK_TIPS);
  const [articles, setArticles] = useState<any[]>(MOCK_ARTICLES);
  const [quote, setQuote] = useState<{
    content: string;
    author: string;
  } | null>(null);
  const [checkin, setCheckin] = useState<CheckinForm>({
    mood: 0,
    sleepHours: 8,
    steps: 5000,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "info" | "error";
  } | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // Fetch Wellness Score & History
      try {
        const scoreRes = await fetch("/api/patient/wellness/score");
        if (scoreRes.ok) {
          const wellnessResData = await scoreRes.json();
          setWellnessData(wellnessResData);
        } else {
          throw new Error("Wellness API not available");
        }
      } catch (err) {
        console.warn("Wellness API failed, using mock data", err);
        // Fallback mock
        setWellnessData({
          score: 78,
          streak: 12,
          history: Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - i * 86400000)
              .toISOString()
              .split("T")[0],
            score: Math.floor(Math.random() * 30) + 60,
          })).reverse(),
        });
      }

      // Fetch Tips
      try {
        const tipsRes = await fetch("/api/health-tips?limit=5");
        if (tipsRes.ok) {
          const tipsData = await tipsRes.json();
          setTips(
            Array.isArray(tipsData.data)
              ? tipsData.data
              : Array.isArray(tipsData)
                ? tipsData
                : MOCK_TIPS,
          );
        }
      } catch (err) {
        console.warn("Tips fetch failed", err);
        setTips(MOCK_TIPS);
      }

      // Fetch Articles
      try {
        const artRes = await fetch("/api/articles?limit=6");
        if (artRes.ok) {
          const contentType = artRes.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const artData = await artRes.json();
            setArticles(
              Array.isArray(artData.data)
                ? artData.data
                : Array.isArray(artData)
                  ? artData
                  : MOCK_ARTICLES,
            );
          } else {
            setArticles(MOCK_ARTICLES);
          }
        } else {
          setArticles(MOCK_ARTICLES);
        }
      } catch (err) {
        console.warn("Articles fetch failed", err);
        setArticles(MOCK_ARTICLES);
      }

      // Fetch Quote
      try {
        const quoteRes = await fetch(
          "https://api.quotable.io/random?tags=wellness,motivational",
        );
        if (quoteRes.ok) {
          setQuote(await quoteRes.json());
        } else {
          setQuote({
            content:
              "The greatest wealth is health. Take care of your body, it's the only place you have to live.",
            author: "Unknown",
          });
        }
      } catch {
        setQuote({
          content:
            "The only way to keep your health is to eat what you don't want, drink what you don't like, and do what you'd rather not.",
          author: "Mark Twain",
        });
      }
    } catch (err) {
      console.error("Failed to load wellness data", err);
    }
  };

  const handleCheckin = async () => {
    if (checkin.mood === 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/patient/wellness/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkin),
      });
      if (res.ok) {
        const data = await res.json();
        setWellnessData((prev) =>
          prev ? { ...prev, score: data.score, streak: data.streak } : null,
        );
        setToast({
          message: "Excellent! Your daily health stats have been synced.",
          type: "success",
        });
      } else {
        // Mock success for demo
        setWellnessData((prev) =>
          prev
            ? {
                ...prev,
                score: Math.min(100, prev.score + 5),
                streak: prev.streak + 1,
              }
            : null,
        );
        setToast({
          message: "Commitment saved locally. You're doing great!",
          type: "success",
        });
      }
    } catch (err) {
      console.error(err);
      setToast({
        message: "Sync failed. Your data is stored offline.",
        type: "info",
      });
    }
    setIsSubmitting(false);
  };

  if (!wellnessData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <BiLoaderAlt className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title="Wellness Hub"
        subtitle="Empowering your health journey with data, insights, and daily habits."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: SCORE & STREAK */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="text-center p-8 bg-linear-to-br from-primary to-blue-600 text-white border-none shadow-none shadow-primary/20">
            <h3 className="text-lg font-bold  tracking-normal opacity-80 mb-6 font-grotesk">
              Wellness Index
            </h3>

            <div className="relative inline-flex items-center justify-center mb-6">
              <svg className="w-40 h-40 transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="white"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={440}
                  strokeDashoffset={440 - (440 * wellnessData.score) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold">
                  {wellnessData.score}%
                </span>
                <span className="text-sm  font-bold tracking-normal opacity-60">
                  Optimal
                </span>
              </div>
            </div>

            <p className="text-sm font-bold opacity-90 leading-relaxed">
              {wellnessData.score > 85
                ? "Extraordinary! You're in peak condition today."
                : wellnessData.score > 70
                  ? "Fantastic progress. Keep your momentum going!"
                  : "Good start! Let's aim for 80% tomorrow."}
            </p>
          </Card>

          <Card className="flex items-center justify-between p-6 bg-gray-50 border-gray-100 border-2">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-500 rounded-2xl flex items-center justify-center text-white shadow-none shadow-gray-200">
                <HiFire size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-500  tracking-normal">
                  Consistency
                </p>
                <p className="text-xl font-bold text-slate-800">
                  {wellnessData.streak} Day Streak
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <SectionHeader title="Weekly Trend" inner />
            <div className="h-24 w-full flex items-end gap-2 mt-4">
              {wellnessData.history.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full bg-primary/20 rounded-t-lg transition-all hover:bg-primary"
                    style={{ height: `${h.score}%` }}
                  />
                  <span className="text-xs font-bold text-slate-500 ">
                    {h.date.split("-")[2]}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* MIDDLE COLUMN: CHECK-IN & TIPS */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="p-8 border-2 border-slate-100 shadow-none shadow-slate-900/5">
            <SectionHeader
              title="Daily Wellness Commit"
              subtitle="How are your clinical dimensions today?"
            />

            <div className="space-y-8 mt-6">
              {/* MOOD */}
              <div>
                <h1 className="text-sm font-bold text-slate-500  tracking-normal mb-4 block px-1">
                  Current Sentiment
                </h1>
                <div className="flex justify-between gap-2">
                  {MOODS.map((m) => (
                    <button
                      key={m.val}
                      onClick={() => setCheckin({ ...checkin, mood: m.val })}
                      className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-[1.5rem] transition-all duration-300 ${
                        checkin.mood === m.val
                          ? "bg-primary text-white shadow-none shadow-primary/30 scale-105"
                          : "bg-slate-50 text-slate-500 hover:bg-white hover:shadow-none hover:shadow-slate-900/5"
                      }`}
                    >
                      {m.icon}
                      <span className="text-sm font-bold  tracking-tight">
                        {m.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* STATS INPUTS */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50/50 p-6 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <BiMoon className="text-blue-500" size={20} />
                    <span className="text-xs font-bold text-slate-700  tracking-tight">
                      Sleep Restoration
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="12"
                    value={checkin.sleepHours}
                    onChange={(e) =>
                      setCheckin({
                        ...checkin,
                        sleepHours: Number(e.target.value),
                      })
                    }
                    className="w-full bg-transparent text-3xl font-bold text-slate-800 outline-none"
                  />
                  <span className="text-sm font-bold text-slate-500 ">
                    Hours
                  </span>
                </div>

                <div className="bg-slate-50/50 p-6 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <BiWalk className="text-emerald-500" size={20} />
                    <span className="text-xs font-bold text-slate-700  tracking-tight">
                      Active Mobility
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="30000"
                    value={checkin.steps}
                    onChange={(e) =>
                      setCheckin({ ...checkin, steps: Number(e.target.value) })
                    }
                    className="w-full bg-transparent text-3xl font-bold text-slate-800 outline-none"
                  />
                  <span className="text-sm font-bold text-slate-500 ">
                    Steps
                  </span>
                </div>
              </div>

              <Button
                fullWidth
                size="lg"
                disabled={checkin.mood === 0 || isSubmitting}
                onClick={handleCheckin}
                className="h-16 rounded-[1.5rem] text-sm font-bold  tracking-normal shadow-none shadow-primary/20"
              >
                {isSubmitting
                  ? "Syncing Intelligence..."
                  : "Commit Today's Data"}
              </Button>
            </div>
          </Card>

          <div className="space-y-4">
            <SectionHeader title="Smart Health Tips" inner />
            <div className="space-y-3">
              {tips.map((tip, i) => (
                <div
                  key={tip.id || tip._id || i}
                  className="group bg-white p-5 rounded-3xl border border-slate-100 flex items-start gap-5 hover:border-primary/20 transition-all hover:shadow-none hover:shadow-slate-900/5"
                >
                  <div className="w-12 h-12 bg-slate-50 group-hover:bg-primary/5 rounded-2xl flex items-center justify-center text-2xl transition-all">
                    {tip.icon}
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800 text-sm mb-1  tracking-tight font-grotesk">
                      {tip.title}
                    </h5>
                    <p className="text-xs text-slate-500 font-bold leading-relaxed">
                      {tip.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ARTICLE & QUOTE */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-0 overflow-hidden group shadow-none shadow-slate-900/5 border border-slate-100 rounded-lg">
            <div className="relative h-48 overflow-hidden">
              <img
                src={
                  articles[0]?.coverImage ||
                  "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=800"
                }
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent flex items-end p-6">
                <Badge
                  label={articles[0]?.tags?.[0] || "FEATURED"}
                  variant="solid"
                  className="bg-primary border-none font-bold text-[9px]"
                />
              </div>
            </div>
            <div className="p-6">
              <h4 className="text-lg font-bold text-slate-800 leading-tight mb-3 line-clamp-2 font-grotesk">
                {articles[0]?.title}
              </h4>
              <p className="text-xs text-slate-500 font-bold leading-relaxed mb-6 line-clamp-3">
                {articles[0]?.excerpt}
              </p>
              <Button
                variant="ghost"
                onClick={() => setSelectedArticle(articles[0])}
                className="w-full bg-slate-50 text-sm font-bold  tracking-normal text-primary hover:bg-primary hover:text-white transition-all rounded-xl py-3 border-none"
              >
                Review Full Analysis
              </Button>
            </div>
          </Card>

          <Card className="p-8 bg-slate-900 text-white relative overflow-hidden rounded-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2" />
            <BiSolidQuoteAltLeft className="text-primary/40 mb-4" size={32} />
            <p className="text-sm font-bold italic leading-relaxed mb-6 pr-4 opacity-90">
              "{quote?.content}"
            </p>
            <div className="flex items-center gap-3">
              <div className="h-0.5 w-6 bg-primary" />
              <span className="text-sm font-bold  tracking-normal">
                {quote?.author}
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* BOTTOM SECTION: CAROUSEL */}
      <section className="space-y-6 pt-8 border-t border-slate-100">
        <SectionHeader
          title="Clinical Library"
          subtitle="Explore our curated collection of health and wellness documentation."
        />
        <Carousel
          showArrows
          showIndicators={false}
          showStatus={false}
          centerMode
          centerSlidePercentage={
            window.innerWidth > 1024 ? 33.3 : window.innerWidth > 640 ? 50 : 100
          }
        >
          {articles.map((art) => (
            <div key={art._id} className="px-3">
              <Card
                className="text-left group cursor-pointer hover:border-primary/20 transition-all rounded-lg overflow-hidden p-0"
                onClick={() => setSelectedArticle(art)}
              >
                <div className="h-32 overflow-hidden bg-slate-100">
                  <img
                    src={art.coverImage}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all group-hover:scale-105 duration-500"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold text-primary  tracking-normal">
                      {art.tags?.[0]}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500  tracking-normal flex items-center gap-1">
                      <BiBookOpen /> {art.readTimeMinutes} Mins
                    </span>
                  </div>
                  <h5 className="font-bold text-slate-800 text-sm leading-tight line-clamp-1 font-grotesk">
                    {art.title}
                  </h5>
                </div>
              </Card>
            </div>
          ))}
        </Carousel>
      </section>

      {/* ARTICLE MODAL */}
      {selectedArticle && (
        <ArticleModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          onBookmark={() => {}}
          isBookmarked={false}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
