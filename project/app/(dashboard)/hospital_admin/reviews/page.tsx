"use client";

import React, { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { BiStar, BiLoaderAlt, BiUser, BiCheck, BiTrash } from "react-icons/bi";

interface Review {
  _id: string;
  patientName: string;
  rating: number;
  comment: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <BiStar
          key={s}
          size={16}
          className={s <= rating ? "text-amber-400 fill-amber-400" : "text-slate-200"}
        />
      ))}
    </div>
  );
}

export default function HospitalReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");

  useEffect(() => {
    fetch("/api/hospital/reviews")
      .then((r) => r.json())
      .then((d) => { if (d.success) setReviews(d.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const moderated = reviews.filter((r) => filter === "all" ? true : r.status === filter);
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  function badge(status: string) {
    const map: Record<string, string> = {
      pending: "bg-amber-50 text-amber-600 border-amber-200",
      approved: "bg-emerald-50 text-emerald-600 border-emerald-200",
      rejected: "bg-rose-50 text-rose-600 border-rose-200",
    };
    return map[status] || "";
  }

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <BiLoaderAlt className="animate-spin text-primary text-4xl" />
      </div>
    );

  return (
    <div className="w-full pb-10 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Patient Reviews</h1>
          <p className="text-sm text-slate-500 mt-1">Moderate and view all patient feedback</p>
        </div>
        <div className="flex items-center gap-2 bg-primary/10 text-primary font-bold px-4 py-2 rounded-xl">
          <BiStar size={20} className="text-amber-400" />
          <span className="text-xl">{avgRating}</span>
          <span className="text-sm font-medium text-slate-500">/ 5.0</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(["all", "pending", "approved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize border transition-all ${
              filter === f
                ? "bg-primary text-white border-primary"
                : "bg-white text-slate-500 border-slate-200 hover:border-primary/50"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-sm text-slate-400 self-center">
          {moderated.length} review{moderated.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Reviews Grid */}
      {moderated.length === 0 ? (
        <Card className="text-center py-16 text-slate-400">No reviews found.</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {moderated.map((rev) => (
            <Card key={rev._id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <BiUser size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{rev.patientName}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(rev.createdAt).toLocaleDateString("en-ZA")}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg border capitalize ${badge(rev.status)}`}>
                  {rev.status}
                </span>
              </div>
              <StarRating rating={rev.rating} />
              <p className="text-sm text-slate-600 leading-relaxed">{rev.comment}</p>
              {rev.status === "pending" && (
                <div className="flex gap-2 mt-1 pt-3 border-t border-slate-100">
                  <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors">
                    <BiCheck size={16} /> Approve
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100 transition-colors">
                    <BiTrash size={16} /> Dismiss
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
