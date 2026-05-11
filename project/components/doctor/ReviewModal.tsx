"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { BiStar, BiX, BiSend, BiLoaderAlt } from "react-icons/bi";
import { toast } from "react-hot-toast";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string;
  doctorName: string;
  onSuccess: () => void;
}

export default function ReviewModal({
  isOpen,
  onClose,
  doctorId,
  doctorName,
  onSuccess,
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    if (comment.length < 10) {
      toast.error("Please write a bit more about your experience");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/practitioners/${doctorId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rating, comment }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Review submitted successfully!");
        onSuccess();
        onClose();
        setRating(0);
        setComment("");
      } else {
        toast.error(result.error || "Failed to submit review");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Review ${doctorName}`}>
      <div className="space-y-8 p-1">
        <div className="text-center space-y-2">
          <p className="text-sm text-slate-500 font-medium">
            How was your experience with {doctorName}?
          </p>
          <div className="flex justify-center gap-2 pt-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="transition-all duration-200 transform hover:scale-125 focus:outline-none"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
              >
                <BiStar
                  className={`text-4xl ${
                    (hoverRating || rating) >= star
                      ? "text-amber-400 fill-current"
                      : "text-slate-200"
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest animate-in fade-in zoom-in duration-300">
              {rating === 5
                ? "Excellent"
                : rating === 4
                ? "Very Good"
                : rating === 3
                ? "Good"
                : rating === 2
                ? "Fair"
                : "Poor"}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
            Your Feedback
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us about the consultation, the doctor's professionalism, etc..."
            className="w-full h-32 p-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all outline-none text-slate-700 text-sm font-medium resize-none"
          />
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] text-slate-400 font-bold">
              {comment.length} characters (min 10)
            </span>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            className="flex-1 rounded-xl h-12"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-[2] rounded-xl h-12 bg-primary shadow-lg shadow-primary/20"
            onClick={handleSubmit}
            disabled={submitting}
            icon={submitting ? <BiLoaderAlt className="animate-spin" /> : <BiSend />}
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
