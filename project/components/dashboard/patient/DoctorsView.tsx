"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import DoctorCard from "@/components/doctor/DoctorCard";
import DoctorProfileModal from "./DoctorProfileModal";
import BookingModal from "@/components/doctor/BookingModal";
import {
  BiSearch,
  BiFilterAlt,
  BiStar,
  BiHeart,
  BiCalendar,
  BiMessageDetail,
  BiCheckShield,
  BiBadgeCheck,
  BiGlobe,
  BiPhone,
  BiVideo,
  BiLoaderAlt,
} from "react-icons/bi";
import { VerifiedIcon } from "lucide-react";

export default function DoctorsView() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [myDoctors, setMyDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("rating"); // rating, price, experience
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isInitiating, setIsInitiating] = useState(false);

  const [filters, setFilters] = useState({
    specialization: "",
    language: "",
    location: "",
  });

  // Load practitioners from DB
  const fetchDoctors = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resAll, resMy] = await Promise.all([
        fetch("/api/patient/practitioners"),
        fetch("/api/patient/my-doctors"),
      ]);
      if (resAll.ok) setDoctors(await resAll.json());
      if (resMy.ok) setMyDoctors(await resMy.json());
    } catch {
      /* silent */
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const filteredDoctors = doctors
    .filter((doc) => {
      const searchTerms = searchQuery.toLowerCase();
      const matchesSearch =
        doc.name.toLowerCase().includes(searchTerms) ||
        doc.specialisation?.toLowerCase().includes(searchTerms) ||
        doc.about?.toLowerCase().includes(searchTerms) ||
        doc.location?.toLowerCase().includes(searchTerms) ||
        doc.city?.toLowerCase().includes(searchTerms);

      const matchesSpec =
        !filters.specialization ||
        doc.specialisation === filters.specialization;
      const matchesLang =
        !filters.language || doc.languages?.includes(filters.language);
      const matchesLoc = !filters.location || doc.location === filters.location;

      return matchesSearch && matchesSpec && matchesLang && matchesLoc;
    })
    .sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "experience")
        return (b.experienceYears || 0) - (a.experienceYears || 0);
      return 0;
    });

  const uniqueSpecializations = [
    ...new Set(doctors.map((d) => d.specialisation).filter(Boolean)),
  ];
  const allLanguages = [...new Set(doctors.flatMap((d) => d.languages || []))];
  const allProvinces = [
    ...new Set(doctors.map((d) => d.location).filter(Boolean)),
  ];

  const handleStartMessage = async (doc: any) => {
    setIsInitiating(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practitionerId: doc.id }),
      });
      if (res.ok) {
        router.push("/patient/messages");
      }
    } catch {
      /* silent */
    }
    setIsInitiating(false);
    setSelectedDoctor(null);
  };

  const handleImmediateCall = async (doc: any) => {
    setIsInitiating(true);
    try {
      // 1. Create instant consultation
      const res = await fetch("/api/consultations/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          practitionerId: doc.id,
          date: new Date().toISOString().split("T")[0],
          time: new Date().toLocaleTimeString("en-ZA", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }),
          type: "video",
          chiefComplaint: "URGENT: Immediate Test Call requested.",
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Redir to chat for this consultation with autostart flag
        router.push(`/patient/chat/${data.consultation._id}?autoStart=true`);
      }
    } catch {
      /* silent */
    }
    setIsInitiating(false);
  };

  const handleLinkDoctor = async (docId: string, action: "link" | "unlink") => {
    try {
      const res = await fetch("/api/patient/my-doctors/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practitionerId: docId, action }),
      });
      if (res.ok) {
        fetchDoctors(); // Refresh lists
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmBooking = () => {
    setIsBookingModalOpen(false);
    setSelectedDoctor(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER */}
      <PageHeader
        title="Clinical Practitioners"
        subtitle="Find and book appointments with verified practitioners."
      />

      <div className="flex flex-col lg:flex-row gap-8">
        {/* FILTER SIDEBAR */}
        <div className="w-full lg:w-72 shrink-0 space-y-6">
          <Card className="sticky top-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 font-grotesk">
                <BiFilterAlt className="text-primary" /> Filters
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:bg-transparent lowercase p-0"
                onClick={() =>
                  setFilters({
                    specialization: "",
                    language: "",
                    location: "",
                  })
                }
              >
                Reset
              </Button>
            </div>

            <div className="space-y-6">
              <Select
                label="Specialization"
                options={[
                  { label: "All Specializations", value: "" },
                  ...uniqueSpecializations.map((s) => ({
                    label: String(s),
                    value: String(s),
                  })),
                ]}
                value={filters.specialization}
                onChange={(v) => setFilters({ ...filters, specialization: v })}
              />
              <Select
                label="Province / Location"
                options={[
                  { label: "Anywhere", value: "" },
                  ...allProvinces.map((p) => ({
                    label: String(p),
                    value: String(p),
                  })),
                ]}
                value={filters.location}
                onChange={(v) => setFilters({ ...filters, location: v })}
              />
              <Select
                label="Language"
                options={[
                  { label: "Any Language", value: "" },
                  ...allLanguages.map((l) => ({ label: l, value: l })),
                ]}
                value={filters.language}
                onChange={(v) => setFilters({ ...filters, language: v })}
              />
            </div>
          </Card>
        </div>

        {/* MAIN LIST */}
        <div className="flex-1 space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search doctors, specializations, or conditions..."
                icon={<BiSearch size={24} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <Select
                value={sortBy}
                onChange={setSortBy}
                options={[
                  { label: "Top Rated", value: "rating" },
                  { label: "Experience", value: "experience" },
                ]}
              />
            </div>
          </div>

          {/* MY DOCTORS SECTION */}
          {!searchQuery && !filters.specialization && myDoctors.length > 0 && (
            <section className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center justify-between">
                <h3 className=" font-bold text-slate-800  flex items-center gap-2 font-grotesk">
                  My Doctors
                </h3>
                <p className="text-xs text-slate-400">
                  {myDoctors.length} found
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myDoctors.map((doc) => (
                  <Card
                    key={doc.id}
                    className="hover:border-primary/20 transition-all border-slate-100 cursor-pointer"
                    onClick={() => router.push(`/patient/doctors/${doc.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={doc.name}
                        size="md"
                        status={doc.isOnline ? "online" : "offline"}
                      />
                      <div className="flex-1 min-w-0">
                        <h1 className="text-slate-800 flex items-center gap-1">
                          {doc.name}
                          <VerifiedIcon
                            fill="#4493b8"
                            className="w-6 h-6 text-white"
                          />
                        </h1>
                        <p className="text-sm text-primary  truncate">
                          {doc.specialisation}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartMessage(doc);
                          }}
                          className="w-8 h-8 p-0 bg-primary/5 text-primary hover:bg-primary hover:text-white"
                          title="Chat"
                        >
                          <BiMessageDetail size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImmediateCall(doc);
                          }}
                          className="w-8 h-8 p-0 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white"
                          title="Immediate Test Call"
                        >
                          <BiVideo size={16} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <div className="h-px bg-slate-100 my-8" />
            </section>
          )}

          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-slate-400  tracking-normal font-grotesk">
              Available Practitioners
            </h3>
            {searchQuery && (
              <p className="text-xs text-slate-400">
                {filteredDoctors.length} doctors found
              </p>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <BiLoaderAlt size={40} className="text-primary animate-spin" />
            </div>
          ) : filteredDoctors.length === 0 ? (
            <Card>
              <EmptyState
                title="No Practitioners Found"
                description="No specialists match your criteria. Try adjusting filters."
                icon={<BiSearch size={32} />}
                actionLabel="Clear Filters"
                onAction={() => {
                  setSearchQuery("");
                  setFilters({ specialization: "", language: "", location: "" });
                }}
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredDoctors.map((doc) => (
                <div key={doc.id} className="h-full">
                  <DoctorCard
                    doctor={doc}
                    onBook={(id, e) => {
                      e.stopPropagation();
                      setSelectedDoctor(doc);
                      setIsBookingModalOpen(true);
                    }}
                    onMessage={(id, e) => {
                      e.stopPropagation();
                      handleStartMessage(doc);
                    }}
                    onClick={() => router.push(`/patient/doctors/${doc.id}`)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DOCTOR PROFILE MODAL */}
      <DoctorProfileModal
        isOpen={!!selectedDoctor && !isBookingModalOpen}
        onClose={() => setSelectedDoctor(null)}
        doctor={selectedDoctor}
        onBook={(id) => setIsBookingModalOpen(true)}
        onMessage={(id) => handleStartMessage(selectedDoctor)}
        onLink={(id, action) => handleLinkDoctor(id, action)}
        isMyDoctor={myDoctors.some((d) => d.id === selectedDoctor?.id)}
      />

      {/* BOOKING FLOW MODAL */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setSelectedDoctor(null);
        }}
        doctor={selectedDoctor}
        onSuccess={handleConfirmBooking}
      />
    </div>
  );
}
