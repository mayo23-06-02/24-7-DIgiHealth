"use client";
import React, { useEffect, useState } from "react";
import Carousel from "@/components/ui/Carousel";
import DoctorCard from "./DoctorCard";
import DoctorModal from "./DoctorModal";
import BookingModal from "./BookingModal";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { useNavigate } from "@/hooks/useNavigate";

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
    e?.stopPropagation(); // Prevent modal open
    const dr = doctors.find((d) => d.id === doctorId);
    if (dr) {
      setBookingDoctor(dr);
    }
  };

  const handleMessage = async (doctorId: string, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent modal open
    if (!doctorId) return;
    // This always ends in a navigation, so start the bar before the fetch —
    // otherwise the button is completely dead for the whole round-trip.
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
      <div className="flex justify-between items-center px-2">
        <div className="flex flex-col lg:flex-row  justify-between w-full ">
          <div className="mb-4 px-2">
            <h3 className="font-bold text-h3 text-ink-900 font-grotesk">
              Available Doctors
            </h3>
            <p className="text-small text-ink-600">
              Connect with our medical professionals for expert advice and care.
            </p>
          </div>
          <div className="flex items-center lg:justify-end justify-between gap-3">
            <div className="text-label text-white flex items-center justify-center gap-1 bg-primary px-3 h-8 rounded-full font-bold whitespace-nowrap">
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <span>{doctors.length} Available Doctors</span>
            </div>
            <div className="flex gap-2 ml-4">
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
          </div>
        </div>
      </div>

      <Carousel
        selectedItem={carouselIndex}
        onChange={setCarouselIndex}
        showArrows={false}
        infiniteLoop={true}
        centerMode={true}
        slideClassName="w-[45.4545%] md:w-[31.25%] lg:w-[23.8095%] xl:w-[21.7391%]"
        className="py-2"
        showStatus={false}
        showIndicators={false}
      >
        {doctors.map((doctor) => (
          <div key={doctor.id} className="px-2 h-full ">
            <DoctorCard
              doctor={doctor}
              onBook={handleBook}
              onMessage={handleMessage}
              onClick={() => setSelectedDoctor(doctor)}
              linkName={`/patient/doctors/${doctor.id}`}
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
          // Optional: refresh agenda or show success
        }}
      />
    </div>
  );
}
