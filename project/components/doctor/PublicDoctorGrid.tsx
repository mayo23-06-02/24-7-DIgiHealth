"use client";

import React, { useEffect, useState } from "react";
import Carousel from "@/components/ui/Carousel";
import DoctorCard from "./DoctorCard";
import { useTodaySlots } from "@/hooks/useTodaySlots";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

interface Doctor {
  id: string;
  name: string;
  specialisation: string;
  rating: number;
  reviewCount: number;
  languages: string[];
  isOnline: boolean;
  nextAvailable: string;
  avatar?: string;
  bio?: string;
}

/**
 * Public-facing doctor carousel for marketing pages (Home, /doctors) — no
 * patient session required. Pulls real practitioners from the same
 * unauthenticated /api/hospital/doctors endpoint the in-app carousel uses,
 * but skips the patient-only bits (my-doctors linking, messaging, booking
 * modal) since an anonymous visitor can't do any of that yet. Cards route
 * straight to /register instead.
 */
export default function PublicDoctorGrid({ limit = 8 }: { limit?: number }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  // One batched request for the whole list, not one per card.
  const slotsByDoctor = useTodaySlots(doctors.map((d) => d.id));

  useEffect(() => {
    fetch("/api/hospital/doctors")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setDoctors(json.data.slice(0, limit));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [limit]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (doctors.length === 0) return null;

  const maxIndex = Math.max(0, doctors.length - 1);

  return (
    <div className="space-y-3">
      {doctors.length > 1 && (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
            aria-label="Previous doctors"
            className="w-10 h-10 hover:bg-primary bg-surface-soft hover:text-white rounded-lg transition-all duration-200 border border-border flex items-center justify-center text-ink-600"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setIndex((prev) => Math.min(maxIndex, prev + 1))}
            aria-label="Next doctors"
            className="w-10 h-10 hover:bg-primary bg-surface-soft hover:text-white rounded-lg transition-all duration-200 border border-border flex items-center justify-center text-ink-600"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
      <Carousel
        selectedItem={index}
        onChange={setIndex}
        showArrows={false}
        infiniteLoop
        centerMode
        slideClassName="w-[90%] sm:w-[45.25%] lg:w-[28.57%]"
        showStatus={false}
        showIndicators={false}
      >
        {doctors.map((doctor) => (
          <div key={doctor.id} className="px-2 h-full">
            <DoctorCard doctor={doctor} showPrice slots={slotsByDoctor[doctor.id]} />
          </div>
        ))}
      </Carousel>
    </div>
  );
}
