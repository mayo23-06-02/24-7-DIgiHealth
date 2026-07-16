"use client";

import React, { useMemo, useState } from "react";
import { BiStar, BiChevronDown, BiPlus, BiLoaderAlt } from "react-icons/bi";
import { toast } from "react-hot-toast";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

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
    <div className="flex text-amber-400 gap-0.5 shrink-0">
      {[...Array(5)].map((_, idx) => (
        <BiStar
          key={idx}
          className={idx < Math.round(rating) ? "fill-current" : "text-slate-200"}
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftRating, setDraftRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [draftComment, setDraftComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, ReviewItem[]>();
    for (const rev of reviews) {
      const key = rev.patientId || rev.patientName;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(rev);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      items: items.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    }));
  }, [reviews]);

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
        <h4 className="text-sm font-bold text-slate-500 tracking-normal font-grotesk">
          Patient Feedback
        </h4>
        <Button
          variant="outline"
          className="!h-auto !py-2 !px-3 text-xs"
          icon={<BiPlus size={14} />}
          iconPosition="left"
          onClick={() => setIsModalOpen(true)}
        >
          Add Review
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {groups.length > 0 ? (
          groups.map(({ key, items }) => {
            const primary = items[0];
            const isGroup = items.length > 1;
            const isOpen = !!expanded[key];
            const avgRating =
              items.reduce((sum, r) => sum + (r.rating || 0), 0) / items.length;

            return (
              <Card
                key={key}
                className="p-6 transition-all hover:border-primary/20"
                variant="solid"
              >
                <button
                  type="button"
                  className={`w-full text-left ${isGroup ? "cursor-pointer" : "cursor-default"}`}
                  onClick={() =>
                    isGroup &&
                    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
                  }
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 font-bold text-xs uppercase overflow-hidden shrink-0">
                        {primary.patientAvatar ? (
                          <img
                            src={primary.patientAvatar}
                            alt={primary.patientName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          primary.patientName?.charAt(0) || "P"
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 leading-none mb-1 truncate">
                          {primary.patientName}
                        </p>
                        <p className="text-[9px] text-slate-500 font-bold tracking-normal">
                          {isGroup
                            ? `${items.length} reviews · latest ${new Date(primary.date).toLocaleDateString()}`
                            : new Date(primary.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StarRow rating={isGroup ? avgRating : primary.rating} />
                      {isGroup && (
                        <BiChevronDown
                          size={16}
                          className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 font-bold leading-relaxed italic">
                    "{primary.comment}"
                  </p>
                </button>

                {isGroup && isOpen && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                    {items.slice(1).map((rev) => (
                      <div key={rev.id} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <StarRow rating={rev.rating} size={11} />
                          <p className="text-[9px] text-slate-500 font-bold tracking-normal">
                            {new Date(rev.date).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500 font-bold leading-relaxed italic">
                          "{rev.comment}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })
        ) : (
          <div className="col-span-2 text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <p className="text-xs font-bold text-slate-500">
              No patient feedback yet.
            </p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Rate Your Consultation"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Your Rating
            </h1>
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
                  <BiStar
                    size={28}
                    className={
                      star <= (hoverRating || draftRating)
                        ? "text-amber-400 fill-current"
                        : "text-slate-200"
                    }
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Your Comment
            </h1>
            <textarea
              className="w-full h-28 p-4 rounded-lg border border-slate-200 bg-slate-50 focus:border-primary focus:bg-white transition-all outline-none text-sm font-medium"
              placeholder="Share your experience with this practitioner..."
              value={draftComment}
              onChange={(e) => setDraftComment(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={submitting}
              icon={submitting ? <BiLoaderAlt className="animate-spin" /> : undefined}
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
