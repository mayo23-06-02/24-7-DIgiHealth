"use client";

import React, { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { BadgeStatus } from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { Star, Loader2, User, Check, Trash2 } from "lucide-react";

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
        <Star
          key={s}
          size={16}
          className={
            s <= rating ? "text-gray-400 fill-gray-400" : "text-slate-200"
          }
        />
      ))}
    </div>
  );
}

export default function HospitalReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [moderatingId, setModeratingId] = useState<string | null>(null);

  const fetchReviews = () => {
    fetch("/api/hospital/reviews")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setReviews(d.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleApprove = async (id: string) => {
    setModeratingId(id);
    try {
      const res = await fetch(`/api/hospital/reviews/${id}`, { method: "PATCH" });
      const json = await res.json();
      if (json.success) {
        setReviews((prev) =>
          prev.map((r) => (r._id === id ? { ...r, status: "approved" } : r)),
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setModeratingId(null);
    }
  };

  const handleDismiss = async (id: string) => {
    setModeratingId(id);
    try {
      const res = await fetch(`/api/hospital/reviews/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setReviews((prev) => prev.filter((r) => r._id !== id));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setModeratingId(null);
    }
  };

  const moderated = reviews.filter((r) =>
    filter === "all" ? true : r.status === filter,
  );
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  const reviewStatusMap: Record<string, BadgeStatus> = {
    pending: "neutral",
    approved: "success",
    rejected: "error",
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );

  return (
    <div className="w-full pb-10 flex flex-col gap-6">
      <div className="lg:px-0 px-4">
        <PageHeader
        title="Patient Reviews"
        subtitle="Moderate and view all patient feedback"
        right={
          <div className="flex items-center gap-2 bg-primary/10 text-primary font-bold px-4 py-2 rounded-lg">
            <Star size={20} className="text-gray-400" />
            <span className="text-xl">{avgRating}</span>
            <span className="text-sm font-medium text-slate-500">/ 5.0</span>
          </div>
        }
      />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 items-center px-4 lg:px-0">
        {(["all", "pending", "approved"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "primary" : "outline"}
            onClick={() => setFilter(f)}
            className="!rounded-lg !max-w-none normal-case !tracking-normal capitalize"
          >
            {f}
          </Button>
        ))}
        <span className="ml-auto text-sm text-slate-500 self-center">
          {moderated.length} review{moderated.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Reviews Grid */}
      {moderated.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            title="No reviews found"
            description="Try adjusting your filter."
            className="py-16"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {moderated.map((rev) => (
            <Card key={rev._id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <User size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {rev.patientName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(rev.createdAt).toLocaleDateString("en-ZA")}
                    </p>
                  </div>
                </div>
                <Badge
                  label={rev.status}
                  status={reviewStatusMap[rev.status] ?? "neutral"}
                  size="sm"
                  className="capitalize"
                />
              </div>
              <StarRating rating={rev.rating} />
              <p className="text-sm text-slate-600 leading-relaxed">
                {rev.comment}
              </p>
              {rev.status === "pending" && (
                <div className="flex gap-2 mt-1 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleApprove(rev._id)}
                    disabled={moderatingId === rev._id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50"
                  >
                    {moderatingId === rev._id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}{" "}
                    Approve
                  </button>
                  <button
                    onClick={() => handleDismiss(rev._id)}
                    disabled={moderatingId === rev._id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100 transition-colors disabled:opacity-50"
                  >
                    {moderatingId === rev._id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}{" "}
                    Dismiss
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
