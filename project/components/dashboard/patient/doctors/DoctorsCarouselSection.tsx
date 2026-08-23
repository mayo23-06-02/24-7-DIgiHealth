"use client";
import React, { useState } from "react";
import Link from "next/link";
import Carousel from "@/components/ui/Carousel";
import DoctorCard from "@/components/doctor/DoctorCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "@/hooks/useNavigate";
import { useTodaySlots } from "@/hooks/useTodaySlots";

interface DoctorsCarouselSectionProps {
  title: string;
  doctors: any[];
  onBook: (doc: any) => void;
  onMessage: (doc: any) => void;
  onFavoriteChange?: (doctorId: string, isFavorite: boolean) => void;
  viewAllHref?: string;
}

export default function DoctorsCarouselSection({
  title,
  doctors,
  onBook,
  onMessage,
  onFavoriteChange,
  viewAllHref = "/patient/doctors",
}: DoctorsCarouselSectionProps) {
  const { navigate } = useNavigate();
  const [carouselIndex, setCarouselIndex] = useState(0);
  // One batched request for the whole carousel, not one per card.
  const slotsByDoctor = useTodaySlots(doctors.map((d) => d.id));

  if (doctors.length === 0) return null;

  const maxIndex = Math.max(0, doctors.length - 1);

  return (
    <section className="w-full animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Header row – minimal vertical spacing */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-ink-900 text-lg md:text-xl lg:text-lg md:text-h3 font-grotesk leading-tight">
            {title}
          </h3>
          <span className="text-xs bg-primary text-white px-2.5 py-0.5 rounded-full font-semibold">
            {doctors.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCarouselIndex((prev) => Math.max(0, prev - 1))}
            aria-label="Previous"
            className="w-11 h-11 hover:bg-primary bg-surface-soft hover:text-white rounded-lg transition-all duration-200 border border-border flex items-center justify-center text-ink-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"

          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCarouselIndex((prev) => Math.min(maxIndex, prev + 1))}
            aria-label="Next"
            className="w-11 h-11 hover:bg-primary bg-surface-soft hover:text-white rounded-lg transition-all duration-200 border border-border flex items-center justify-center text-ink-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"

          >
            <ChevronRight size={18} />
          </button>

        </div>
      </div>

      {/* Carousel – reduced vertical padding */}
      <Carousel
        selectedItem={carouselIndex}
        onChange={setCarouselIndex}
        showArrows={false}
        infiniteLoop={true}
        centerMode={true}
        slideClassName="w-[90%] sm:w-[45.25%] lg:w-[28.57%] xl:w-[28.57%]"
        showStatus={false}
        showIndicators={false}
      >
        {doctors.map((doc) => (
          <div key={doc.id} className="px-2 h-full">
            <DoctorCard
              doctor={doc}
              onBook={(id, e) => {
                e.stopPropagation();
                onBook(doc);
              }}
              onMessage={(id, e) => {
                e.stopPropagation();
                onMessage(doc);
              }}
              onClick={() => navigate(`/patient/doctors/${doc.id}`)}
              onFavoriteChange={onFavoriteChange}
              slots={slotsByDoctor[doc.id]}
            />
          </div>
        ))}
      </Carousel>
    </section>
  );
}