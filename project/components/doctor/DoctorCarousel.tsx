"use client";
import React, { useEffect, useState } from "react";
import Carousel from "@/components/ui/Carousel";
import DoctorCard from "./DoctorCard";
import DoctorModal from "./DoctorModal";
import BookingModal from "./BookingModal";
import { BiLoaderCircle } from "react-icons/bi";
import Badge from "@/components/ui/Badge";
import { useRouter } from "next/navigation";
import { BiChevronLeft, BiChevronRight } from "react-icons/bi";

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
}

export default function DoctorCarousel() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [myDoctorIds, setMyDoctorIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const router = useRouter();

  // Responsive carousel item calculation
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

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

  const handleMessage = (doctorId: string, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent modal open
    router.push(`/patient/messages?doctorId=${doctorId}`);
  };

  const visibleCount = isClient
    ? window.innerWidth >= 1200
      ? 4
      : window.innerWidth >= 800
        ? 2
        : 1
    : 3;
  const slidePercent = 100 / visibleCount;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <BiLoaderCircle className="animate-spin text-primary text-4xl" />
      </div>
    );
  }

  if (doctors.length === 0) {
    return (
      <p className="text-slate-500 text-center py-8">
        No doctors available at the moment.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center justify-between w-full gap-2">
          <div className="mb-4 px-2">
            <h3 className="font-bold text-2xl text-slate-900 font-grotesk">
              Available Doctors
            </h3>
            <p className="text-base text-slate-600">
              Connect with our medical professionals for expert advice and care.
            </p>
          </div>
          <div className="flex">
            <div className="text-xs text-white flex items-center justify-center gap-1 bg-primary px-3 h-8 rounded-full border border-emerald-100 font-bold whitespace-nowrap">
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <h1>{doctors.length} Available Doctors</h1>
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={() =>
                  setCarouselIndex((prev) => Math.max(0, prev - 1))
                }
                className="w-10 h-10 hover:bg-primary bg-slate-200 hover:text-white rounded-xl transition-all border border-slate-100 flex items-center justify-center text-slate-500"
              >
                <BiChevronLeft size={24} />
              </button>
              <button
                onClick={() =>
                  setCarouselIndex((prev) =>
                    Math.min(doctors.length - 1, prev + 1),
                  )
                }
                className="w-10 h-10 hover:bg-primary bg-slate-200 hover:text-white rounded-xl transition-all border border-slate-100 flex items-center justify-center text-slate-500"
              >
                <BiChevronRight size={24} />
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
        centerSlidePercentage={slidePercent}
        className="py-2"
        showStatus={false}
        showIndicators={false}
      >
        {doctors.map((doctor) => (
          <div key={doctor.id} className="px-3 h-full ">
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
