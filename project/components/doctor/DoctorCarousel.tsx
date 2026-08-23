"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Carousel from "@/components/ui/Carousel";
import DoctorCard from "./DoctorCard";
import DoctorModal from "./DoctorModal";
import BookingModal from "./BookingModal";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { useNavigate } from "@/hooks/useNavigate";
import { useTodaySlots } from "@/hooks/useTodaySlots";

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

export default function DoctorCarousel() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [myDoctorIds, setMyDoctorIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const { navigate, beginNavigation } = useNavigate();
  // One batched request for the whole carousel, not one per card.
  const slotsByDoctor = useTodaySlots(doctors.map((d) => d.id));

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resAll, resMy] = await Promise.all([
        fetch("/api/hospital/doctors"),
        fetch("/api/patient/my-doctors"),
      ]);
      const jsonAll = await resAll.json();
      const jsonMy = await resMy.json();
      if (jsonAll.success) setDoctors(jsonAll.data);
      if (Array.isArray(jsonMy)) setMyDoctorIds(jsonMy.map((d: any) => d.id));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLinkDoctor = async (docId: string, action: "link" | "unlink") => {
    try {
      const res = await fetch("/api/patient/my-doctors/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practitionerId: docId, action }),
      });
      if (res.ok) {
        fetchData(); // Refresh links
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBook = (doctorId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const dr = doctors.find((d) => d.id === doctorId);
    if (dr) {
      setBookingDoctor(dr);
    }
  };

  const handleMessage = async (doctorId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!doctorId) return;
    beginNavigation();
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practitionerId: doctorId, contactId: doctorId }),
      });
      const data = res.ok ? await res.json() : null;
      if (data?.conversationId) {
        navigate(`/patient/messages?chatId=${data.conversationId}`);
        return;
      }
    } catch {
      /* fall through */
    }
    navigate(`/patient/messages?doctorId=${doctorId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-primary" size={36} />
      </div>
    );
  }

  if (doctors.length === 0) {
    return (
      <EmptyState
        title="No doctors available"
        description="Check back soon — new practitioners are added regularly."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with title, badge, arrows, and View All link */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-2">
        <div>
          <h3 className="font-bold lg:text-h2 text-h4 text-ink-900 font-grotesk">
            Available Doctors
          </h3>
          <p className="text-small text-ink-600">
            Connect with our medical professionals for expert advice and care.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-3 w-full sm:w-auto">
          <div className="text-label text-white flex items-center justify-center gap-1 bg-primary px-3 h-8 rounded-full font-bold whitespace-nowrap">
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span>{doctors.length} Available</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setCarouselIndex((prev) => Math.max(0, prev - 1))
              }
              aria-label="Previous doctors"
              className="w-11 h-11 hover:bg-primary bg-surface-soft hover:text-white rounded-lg transition-all duration-200 border border-border flex items-center justify-center text-ink-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={() =>
                setCarouselIndex((prev) =>
                  Math.min(doctors.length - 1, prev + 1),
                )
              }
              aria-label="Next doctors"
              className="w-11 h-11 hover:bg-primary bg-surface-soft hover:text-white rounded-lg transition-all duration-200 border border-border flex items-center justify-center text-ink-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <ChevronRight size={22} />
            </button>
          </div>

          {/* ✨ View All link */}
          <Link
            href="/patient/doctors"
            className="text-sm font-semibold text-primary hover:underline whitespace-nowrap ml-1"
          >
            View All →
          </Link>
        </div>
      </div>

      {/* Carousel */}
      <Carousel
        selectedItem={carouselIndex}
        onChange={setCarouselIndex}
        showArrows={false}
        infiniteLoop={true}
        centerMode={true}
        slideClassName="w-[90%] md:w-[45.25%] lg:w-[28.57%] xl:w-[28.57%]"
        className="py-2"
        showStatus={false}
        showIndicators={false}
      >
        {doctors.map((doctor) => (
          <div key={doctor.id} className="px-2 h-full">
            <DoctorCard
              doctor={doctor}
              onBook={handleBook}
              onMessage={handleMessage}
              onClick={() => setSelectedDoctor(doctor)}
              linkName={`/patient/doctors/${doctor.id}`}
              slots={slotsByDoctor[doctor.id]}
            />
          </div>
        ))}
      </Carousel>

      <DoctorModal
        isOpen={!!selectedDoctor}
        onClose={() => setSelectedDoctor(null)}
        doctor={selectedDoctor}
        onBook={handleBook}
        onMessage={handleMessage}
        onLink={handleLinkDoctor}
        isMyDoctor={
          selectedDoctor ? myDoctorIds.includes(selectedDoctor.id) : false
        }
      />

      <BookingModal
        isOpen={!!bookingDoctor}
        onClose={() => setBookingDoctor(null)}
        doctor={bookingDoctor}
        onSuccess={() => {
          // Optional refresh
        }}
      />
    </div>
  );
}