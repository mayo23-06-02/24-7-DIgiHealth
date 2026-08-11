import React from "react";
import Carousel from "@/components/ui/Carousel";
import DoctorCard from "@/components/doctor/DoctorCard";
import { useNavigate } from "@/hooks/useNavigate";

interface DoctorsCarouselSectionProps {
  title: string;
  doctors: any[];
  onBook: (doc: any) => void;
  onMessage: (doc: any) => void;
  onFavoriteChange?: (doctorId: string, isFavorite: boolean) => void;
}

export default function DoctorsCarouselSection({
  title,
  doctors,
  onBook,
  onMessage,
  onFavoriteChange,
}: DoctorsCarouselSectionProps) {
  const { navigate } = useNavigate();

  if (doctors.length === 0) return null;

  return (
    <section className="space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center justify-between px-0.5">
        <h3 className="font-bold text-ink-900 text-base sm:text-lg md:text-h3 font-grotesk leading-tight">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 ml-2 shrink-0">{doctors.length} found</p>
      </div>

      {/* Carousel: full width on mobile (85% per slide), 3-column grid layout on desktop */}
      <Carousel
        centerMode={true}
        centerSlidePercentage={window?.innerWidth < 768 ? 85 : 33.33}
        className="-mx-4 sm:-mx-6 md:mx-0 px-4 sm:px-6 md:px-0 pb-2 sm:pb-3 md:pb-4"
      >
        {doctors.map((doc) => (
          <div key={doc.id} className="p-1 sm:p-2 h-full">
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
            />
          </div>
        ))}
      </Carousel>
    </section>
  );
}
