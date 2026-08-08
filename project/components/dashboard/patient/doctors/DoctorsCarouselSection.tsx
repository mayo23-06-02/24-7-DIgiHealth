import React from "react";
import Carousel from "@/components/ui/Carousel";
import DoctorCard from "@/components/doctor/DoctorCard";
import { useNavigate } from "@/hooks/useNavigate";

interface DoctorsCarouselSectionProps {
  title: string;
  doctors: any[];
  onBook: (doc: any) => void;
  onMessage: (doc: any) => void;
}

export default function DoctorsCarouselSection({
  title,
  doctors,
  onBook,
  onMessage,
}: DoctorsCarouselSectionProps) {
  const { navigate } = useNavigate();

  if (doctors.length === 0) return null;

  return (
    <section className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-ink-900 text-h3 font-grotesk">
          {title}
        </h3>
        <p className="text-xs text-slate-500">{doctors.length} found</p>
      </div>

      {/* For desktop, maybe 3 or 4 cards per view, for mobile 1 or 2 */}
      <Carousel
        centerMode={true}
        centerSlidePercentage={window?.innerWidth < 768 ? 85 : 33.33}
        className="-mx-4 px-4 pb-4" // add some padding for hover effects
      >
        {doctors.map((doc) => (
          <div key={doc.id} className="p-2 h-full">
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
            />
          </div>
        ))}
      </Carousel>
    </section>
  );
}
