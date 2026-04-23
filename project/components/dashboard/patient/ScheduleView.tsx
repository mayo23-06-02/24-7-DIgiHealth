"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BiCalendar,
  BiChevronLeft,
  BiChevronRight,
  BiFilterAlt,
  BiSearch,
  BiTime,
  BiVideo,
  BiMap,
  BiCheckCircle,
  BiUser,
  BiPlus,
  BiInfoCircle,
  BiDollar,
  BiWorld,
  BiFemale,
  BiMale,
  BiLoaderCircle,
  BiX,
  BiBookmark,
  BiShareAlt,
  BiStar,
} from "react-icons/bi";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import Toast from "@/components/ui/Toast";
import SkeletonLoader from "@/components/ui/SkeletonLoader";
import { useAuth } from "@/lib/hooks/useAuth";
import { offlineQueue } from "@/lib/offline/queue";

type ViewMode = "Day" | "Week" | "Month";

interface Practitioner {
  id: string;
  name: string;
  specialisation: string;
  avatar?: string;
  rating: number;
  reviewCount: number;
  consultationFee: number;
  languages: string[];
  gender: "male" | "female";
  medicalAids: string[];
  availableSlots: Record<string, string[]>; // date -> array of time slots
  bio?: string;
  experienceYears?: number;
  hpcsaNumber?: string;
}

interface BookingRequest {
  practitionerId: string;
  date: string;
  time: string;
  type: "video" | "chat" | "in_person";
  chiefComplaint?: string;
}

const ScheduleView: React.FC = () => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("Week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [filteredPractitioners, setFilteredPractitioners] = useState<
    Practitioner[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Practitioner | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<BookingRequest | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    specialisations: [] as string[],
    languages: [] as string[],
    maxFee: 1000,
    gender: "" as "" | "male" | "female",
    minRating: 0,
    availableToday: false,
  });
  const [sortBy, setSortBy] = useState("rating");

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch practitioners
  const fetchPractitioners = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (filters.specialisations.length)
        params.append("specialisations", filters.specialisations.join(","));
      if (filters.languages.length)
        params.append("languages", filters.languages.join(","));
      if (filters.maxFee < 1000)
        params.append("maxFee", filters.maxFee.toString());
      if (filters.gender) params.append("gender", filters.gender);
      if (filters.minRating)
        params.append("minRating", filters.minRating.toString());
      if (filters.availableToday) params.append("availableToday", "true");
      if (sortBy) params.append("sortBy", sortBy);

      const res = await fetch(
        `/api/practitioners/available?${params.toString()}`,
      );
      if (!res.ok) throw new Error("Failed to fetch practitioners");
      const data = await res.json();
      setPractitioners(data);
      setFilteredPractitioners(data);
      if (data.length > 0 && !selectedDoc) setSelectedDoc(data[0]);
    } catch (err) {
      console.error("Fetch error:", err);
      setToast({
        message: "Unable to load practitioners. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters, sortBy]);

  useEffect(() => {
    fetchPractitioners();
  }, [fetchPractitioners]);

  // Generate calendar days
  const days = useMemo(() => {
    const daysArray: Date[] = [];
    const start = new Date(currentDate);
    if (viewMode === "Week") {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      for (let i = 0; i < 7; i++) {
        const temp = new Date(start);
        temp.setDate(start.getDate() + i);
        daysArray.push(temp);
      }
    } else if (viewMode === "Day") {
      daysArray.push(start);
    } else {
      // Month view: show first day of month
      start.setDate(1);
      const lastDay = new Date(
        start.getFullYear(),
        start.getMonth() + 1,
        0,
      ).getDate();
      for (let i = 0; i < lastDay; i++) {
        const temp = new Date(start);
        temp.setDate(start.getDate() + i);
        daysArray.push(temp);
      }
    }
    return daysArray;
  }, [currentDate, viewMode]);

  const timeSlots = [
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
  ];

  const handleBooking = async () => {
    if (!selectedSlot || !user) return;
    setIsBooking(true);
    const bookingData = {
      ...selectedSlot,
      patientId: user.id,
      type: "video" as const,
    };
    try {
      if (isOffline) {
        await offlineQueue.enqueue("book_consultation", bookingData);
        setToast({
          message:
            "You are offline. Your booking will be confirmed once connection is restored.",
          type: "info",
        });
        setSelectedSlot(null);
      } else {
        const res = await fetch("/api/consultations/book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bookingData),
        });
        if (!res.ok) throw new Error("Booking failed");
        setToast({
          message: "Consultation booked successfully! Check your appointments.",
          type: "success",
        });
        setSelectedSlot(null);
        // Refresh practitioner availability (optional)
        fetchPractitioners();
      }
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to book. Please try again.", type: "error" });
    } finally {
      setIsBooking(false);
    }
  };

  const getAvailabilityForDay = (doc: Practitioner, date: Date): string[] => {
    const dateStr = date.toISOString().split("T")[0];
    return doc.availableSlots?.[dateStr] || [];
  };

  const isSlotAvailable = (
    doc: Practitioner,
    date: Date,
    slot: string,
  ): boolean => {
    return getAvailabilityForDay(doc, date).includes(slot);
  };

  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "Week") newDate.setDate(newDate.getDate() - 7);
    else if (viewMode === "Day") newDate.setDate(newDate.getDate() - 1);
    else newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "Week") newDate.setDate(newDate.getDate() + 7);
    else if (viewMode === "Day") newDate.setDate(newDate.getDate() + 1);
    else newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const clearFilters = () => {
    setFilters({
      specialisations: [],
      languages: [],
      maxFee: 1000,
      gender: "",
      minRating: 0,
      availableToday: false,
    });
    setSearchQuery("");
  };

  // Extract unique specialisations and languages for filter UI
  const allSpecialisations = useMemo(() => {
    const set = new Set(practitioners.map((p) => p.specialisation));
    return Array.from(set);
  }, [practitioners]);

  const allLanguages = useMemo(() => {
    const set = new Set(practitioners.flatMap((p) => p.languages));
    return Array.from(set);
  }, [practitioners]);

  if (loading && practitioners.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <SkeletonLoader className="w-[200px] h-[32px]" />
          <SkeletonLoader className="w-[300px] h-[48px]" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <SkeletonLoader key={i} className="h-[120px]" />
            ))}
          </div>
          <SkeletonLoader className="h-[500px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight font-grotesk">
            Clinical Scheduler
          </h2>
          <p className="text-slate-500 font-medium">
            Find and book sessions with verified medical practitioners.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-white p-1 rounded-lg border border-slate-100">
            {(["Day", "Week", "Month"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-6 py-2 rounded-lg text-xs font-bold  tracking-normal transition-all ${viewMode === m ? "bg-primary text-white" : "text-slate-400 hover:bg-slate-50"}`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="flex bg-white p-1 rounded-lg border border-slate-100">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-transparent border-none text-xs font-bold  tracking-normal text-primary focus:ring-0 cursor-pointer"
            >
              <option value="rating">Sort: Rating</option>
              <option value="price_asc">Sort: Price (Low)</option>
              <option value="experience">Sort: Experience</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              className="w-12 h-12 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary transition-all"
            >
              <BiChevronLeft size={24} />
            </button>
            <button
              onClick={handleNext}
              className="w-12 h-12 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary transition-all"
            >
              <BiChevronRight size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-lg border border-slate-100 flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <BiSearch
            className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search by name, specialisation, or clinic..."
            className="w-full h-14 pl-14 pr-6 rounded-lg bg-slate-50 border-none text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-6 py-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-primary transition-all"
        >
          <BiFilterAlt className="text-primary" />
          <span className="text-xs font-bold text-slate-600  tracking-normal">
            Filters
          </span>
          {(filters.specialisations.length > 0 ||
            filters.languages.length > 0 ||
            filters.gender ||
            filters.minRating > 0 ||
            filters.availableToday ||
            filters.maxFee < 1000) && (
            <span className="w-2 h-2 bg-primary rounded-lg" />
          )}
        </button>
        <button
          onClick={clearFilters}
          className="text-xs font-semibold text-slate-400 hover:text-primary underline"
        >
          Clear all
        </button>
      </div>

      {/* Filter Panel (expanded) */}
      {showFilters && (
        <div className="bg-white p-6 rounded-lg border border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="text-xs font-bold text-slate-400  tracking-normal">
              Specialisation
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {allSpecialisations.map((spec) => (
                <button
                  key={spec}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      specialisations: prev.specialisations.includes(spec)
                        ? prev.specialisations.filter((s) => s !== spec)
                        : [...prev.specialisations, spec],
                    }))
                  }
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${filters.specialisations.includes(spec) ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-primary/20"}`}
                >
                  {spec}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400  tracking-normal">
              Language
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {allLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      languages: prev.languages.includes(lang)
                        ? prev.languages.filter((l) => l !== lang)
                        : [...prev.languages, lang],
                    }))
                  }
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${filters.languages.includes(lang) ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-primary/20"}`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400  tracking-normal">
              Max Fee (ZAR)
            </label>
            <input
              type="range"
              min="0"
              max="1000"
              step="50"
              value={filters.maxFee}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  maxFee: parseInt(e.target.value),
                }))
              }
              className="w-full mt-2"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>R0</span>
              <span>R{filters.maxFee}</span>
              <span>R1000+</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400  tracking-normal">
              Gender
            </label>
            <div className="flex gap-4 mt-2">
              <button
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    gender: prev.gender === "male" ? "" : "male",
                  }))
                }
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${filters.gender === "male" ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}
              >
                <BiMale /> Male
              </button>
              <button
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    gender: prev.gender === "female" ? "" : "female",
                  }))
                }
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${filters.gender === "female" ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}
              >
                <BiFemale /> Female
              </button>
            </div>
          </div>
          <div className="md:col-span-2 lg:col-span-4 flex justify-end">
            <Button onClick={() => setShowFilters(false)} variant="secondary">
              Apply Filters
            </Button>
          </div>
        </div>
      )}

      {isOffline && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3 text-amber-700">
          <BiInfoCircle size={20} />
          <span className="text-sm font-medium">
            You are offline. You can still browse cached data, but bookings will
            be queued and confirmed when online.
          </span>
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
        {/* Practitioner Sidebar */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-400  tracking-normal px-2 font-grotesk">
            Clinical Providers
          </h4>
          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-300px)] pr-2 custom-scrollbar">
            {filteredPractitioners.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className={`p-4 bg-white rounded-lg border transition-all cursor-pointer group ${selectedDoc?.id === doc.id ? "border-primary" : "border-slate-100 hover:border-primary/30"}`}
              >
                <div className="flex items-center gap-4 mb-3">
                  <Avatar
                    src={doc.avatar}
                    name={doc.name}
                    size="md"
                    status={
                      doc.availableSlots &&
                      Object.keys(doc.availableSlots).length > 0
                        ? "online"
                        : "offline"
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-bold truncate leading-none mb-1 ${selectedDoc?.id === doc.id ? "text-primary" : "text-slate-800"}`}
                    >
                      {doc.name}
                    </p>
                    <p className="text-xs font-bold text-slate-400  tracking-normal">
                      {doc.specialisation}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <BiStar
                        key={i}
                        size={12}
                        className={
                          i < Math.floor(doc.rating)
                            ? "text-amber-400 fill-amber-400"
                            : "text-slate-200"
                        }
                      />
                    ))}
                    <span className="text-xs text-slate-400 ml-1">
                      ({doc.reviewCount})
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-400 ">
                    R{doc.consultationFee}
                  </p>
                </div>
              </div>
            ))}
            {filteredPractitioners.length === 0 && !loading && (
              <div className="text-center py-8 text-slate-400">
                <BiUser size={40} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No practitioners match your filters.</p>
                <button
                  onClick={clearFilters}
                  className="text-primary text-sm underline mt-2"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Calendar Grid */}
        <Card className="p-0 overflow-hidden" variant="solid">
          <div className="overflow-x-auto min-w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-white">
                  <th className="p-4 border-b border-r border-slate-100 w-24">
                    <BiTime className="mx-auto text-slate-400" size={20} />
                  </th>
                  {days.map((day, i) => (
                    <th
                      key={i}
                      className={`p-6 border-b border-r border-slate-100 text-center min-w-[140px] ${day.toDateString() === new Date().toDateString() ? "bg-primary/5" : ""}`}
                    >
                      <p className="text-xs font-bold text-slate-400  tracking-normal mb-1">
                        {day.toLocaleDateString("en-US", { weekday: "short" })}
                      </p>
                      <p className="text-lg font-bold text-slate-800">
                        {day.getDate()}
                      </p>
                      {day.toDateString() === new Date().toDateString() && (
                        <div className="mt-2 w-1.5 h-1.5 bg-primary rounded-lg mx-auto" />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot) => (
                  <tr key={slot}>
                    <td className="p-4 border-b border-r border-slate-100 text-xs font-bold text-slate-400  text-center bg-slate-50/20">
                      {slot}
                    </td>
                    {days.map((day, i) => {
                      const isAvailable =
                        selectedDoc && isSlotAvailable(selectedDoc, day, slot);
                      const isPast =
                        day < new Date() &&
                        slot <
                          new Date().toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                      return (
                        <td
                          key={i}
                          className="p-2 border-b border-r border-slate-100 group relative"
                        >
                          {isAvailable && !isPast ? (
                            <button
                              onClick={() =>
                                setSelectedSlot({
                                  practitionerId: selectedDoc.id,
                                  date: day.toISOString().split("T")[0],
                                  time: slot,
                                  type: "video",
                                })
                              }
                              className="w-full h-12 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 text-xs font-bold  tracking-normal opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-600 hover:text-white flex items-center justify-center gap-2"
                            >
                              Book Now
                            </button>
                          ) : (
                            <div className="w-full h-12 flex items-center justify-center text-slate-200 bg-slate-50/10 grayscale opacity-20">
                              <BiInfoCircle size={14} />
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Booking Confirmation Modal */}
      <Modal
        isOpen={!!selectedSlot}
        onClose={() => setSelectedSlot(null)}
        title="Confirm Clinical Appointment"
        width="md"
      >
        {selectedSlot && selectedDoc && (
          <div className="space-y-8">
            <div className="p-6 bg-slate-50 rounded-lg flex items-center gap-6">
              <Avatar
                src={selectedDoc.avatar}
                name={selectedDoc.name}
                size="xl"
              />
              <div>
                <h4 className="text-xl font-bold text-slate-800 font-grotesk">
                  {selectedDoc.name}
                </h4>
                <p className="text-xs font-bold text-primary  tracking-normal">
                  {selectedDoc.specialisation}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <BiStar
                      key={i}
                      size={12}
                      className={
                        i < Math.floor(selectedDoc.rating)
                          ? "text-amber-400 fill-amber-400"
                          : "text-slate-300"
                      }
                    />
                  ))}
                  <span className="text-xs text-slate-500 ml-1">
                    ({selectedDoc.reviewCount})
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-slate-50 rounded-lg">
                <p className="text-xs font-bold text-slate-400  mb-1">
                  Appointment Date
                </p>
                <p className="font-bold text-slate-800">
                  {new Date(selectedSlot.date).toLocaleDateString("en-US", {
                    dateStyle: "long",
                  })}
                </p>
              </div>
              <div className="p-5 bg-slate-50 rounded-lg">
                <p className="text-xs font-bold text-slate-400  mb-1">
                  Session Time
                </p>
                <p className="font-bold text-slate-800">
                  {selectedSlot.time} (30 min)
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm font-bold text-slate-600 px-2">
                <span>Consultation Fee</span>
                <span className="text-slate-800 font-bold">
                  R{selectedDoc.consultationFee}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-600 px-2">
                <span>Platform Fee</span>
                <span className="text-slate-800 font-bold">R50</span>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-between text-lg font-bold text-slate-800 px-2">
                <span>Total Payable</span>
                <span className="text-primary">
                  R{selectedDoc.consultationFee + 50}
                </span>
              </div>
            </div>

            <Button
              className="w-full h-16"
              onClick={handleBooking}
              disabled={isBooking}
            >
              {isBooking ? (
                <BiLoaderCircle className="animate-spin" size={20} />
              ) : (
                "Confirm & Secure Slot"
              )}
            </Button>

            <div className="p-4 bg-emerald-50 rounded-lg flex items-start gap-4 text-emerald-700">
              <BiCheckCircle className="shrink-0 mt-1" size={18} />
              <p className="text-xs font-bold  leading-relaxed">
                Confirmation will be sent to your verified email. Video link
                becomes active 5 minutes prior.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ScheduleView;
