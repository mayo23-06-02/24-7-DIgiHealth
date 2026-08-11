"use client";

import React, { useMemo, useState } from "react";
import { Star, Plus } from "lucide-react";
import { toast } from "react-hot-toast";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";

export interface ReviewItem {
  id: string;
  patientId: string;
  patientName: string;
  patientAvatar?: string | null;
  rating: number;
  comment: string;
  date: string;
}

interface PatientFeedbackSectionProps {
  practitionerId: string;
  reviews: ReviewItem[];
  onReviewsUpdated?: (reviews: ReviewItem[]) => void;
}

function StarRow({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5 shrink-0">
      {[...Array(5)].map((_, idx) => (
        <Star
          key={idx}
          className={
            idx < Math.round(rating)
              ? "fill-accent stroke-accent"
              : "fill-transparent stroke-border"
          }
          size={size}
        />
      ))}
    </div>
  );
}

export default function PatientFeedbackSection({
  practitionerId,
  reviews,
  onReviewsUpdated,
}: PatientFeedbackSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftRating, setDraftRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [draftComment, setDraftComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const sortedReviews = useMemo(
    () =>
      [...reviews].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [reviews],
  );

  const handleSubmit = async () => {
    if (!draftRating) {
      toast.error("Please select a star rating.");
      return;
    }
    if (!draftComment.trim()) {
      toast.error("Please share a few words about your experience.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/practitioners/${practitionerId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: draftRating, comment: draftComment.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to submit review");
      }

      const refreshed = await fetch(`/api/practitioners/${practitionerId}/reviews`)
        .then((r) => r.json())
        .catch(() => null);

      if (refreshed?.success) {
        const mapped: ReviewItem[] = refreshed.data.map((r: any) => ({
          id: r._id?.toString() || r.id,
          patientId: r.patientId?._id?.toString() || r.patientId?.toString() || "",
          patientName: r.patientId
            ? `${r.patientId.firstName || "Patient"} ${r.patientId.lastName?.charAt(0) || ""}.`
            : "Patient",
          patientAvatar: r.patientId?.avatarUrl || null,
          rating: r.rating,
          comment: r.comment,
          date: r.createdAt || r.date,
        }));
        onReviewsUpdated?.(mapped);
      }

      toast.success("Thanks — your review has been posted.");
      setIsModalOpen(false);
      setDraftRating(0);
      setDraftComment("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-h3 font-bold text-ink-900 font-grotesk">
          Patient Feedback
        </h2>
        <Button
          variant="outline"
          size="sm"
          icon={<Plus size={14} />}
          iconPosition="left"
          onClick={() => setIsModalOpen(true)}
        >
          Add Review
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sortedReviews.length > 0 ? (
          sortedReviews.map((rev) => (
            <Card
              key={rev.id}
              className="p-6 transition-all hover:border-primary/20"
              variant="solid"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-surface-soft rounded-lg flex items-center justify-center text-ink-500 font-bold text-xs uppercase overflow-hidden shrink-0">
                    {rev.patientAvatar ? (
                      <img
                        src={rev.patientAvatar}
                        alt={rev.patientName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      rev.patientName?.charAt(0) || "P"
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink-900 leading-none mb-1 truncate">
                      {rev.patientName}
                    </p>
                    <p className="text-[11px] text-ink-500 font-medium">
                      {new Date(rev.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StarRow rating={rev.rating} />
                </div>
              </div>
              <p className="text-sm text-ink-600 leading-relaxed italic">
                "{rev.comment}"
              </p>
            </Card>
          ))
        ) : (
          <div className="col-span-2 text-center py-10 bg-surface-soft rounded-lg border border-dashed border-border">
            <p className="text-sm font-semibold text-ink-500">
              No patient feedback yet.
            </p>
          </div>
        )}
      </div>

      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Rate Your Consultation"
        size="sm"
        onConfirm={handleSubmit}
        confirmLabel="Submit Review"
        confirmLoading={submitting}
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-label text-ink-500">Your Rating</p>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setDraftRating(star)}
                  className="p-1"
                  aria-label={`${star} star${star > 1 ? "s" : ""}`}
                >
                  <Star
                    size={28}
                    className={
                      star <= (hoverRating || draftRating)
                        ? "fill-accent stroke-accent"
                        : "fill-transparent stroke-border"
                    }
                  />
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Your Comment"
            isTextArea
            rows={4}
            placeholder="Share your experience with this practitioner..."
            value={draftComment}
            onChange={(e) => setDraftComment(e.target.value)}
          />
        </div>
      </Dialog>
    </div>
  );
}
