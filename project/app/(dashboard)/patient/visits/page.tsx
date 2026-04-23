"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BiCalendar,
  BiTime,
  BiPulse,
  BiVideo,
  BiX,
  BiStar,
  BiCheckCircle,
  BiDownload,
  BiTrash,
  BiWifiOff,
  BiUser,
} from "react-icons/bi";

/**
 * PATIENT VISITS (CONSULTATION MISSION CONTROL)
 * -----------------------------------------------------------------
 * Manages Upcoming & Past consultations for the Patient.
 * Features: 1-click Join (WebRTC Mock), Cancellations, Rating, Offline Sync.
 */

// --- Mock Data ---
const MOCK_VISITS = [
  {
    id: "v1",
    doctor: "Dr. Thivanka Naidoo",
    specialisation: "General Practitioner",
    date: "2026-04-06",
    time: "10:30 AM",
    status: "upcoming",
  },
  {
    id: "v2",
    doctor: "Dr. Sarah Smith",
    specialisation: "Paediatrician",
    date: "2026-04-05",
    time: "14:00 PM",
    status: "past",
    summary: "Seasonal allergies. Prescribed anti-histamines and nasal spray.",
    rating: 0,
  },
  {
    id: "v3",
    doctor: "Dr. Alan Walker",
    specialisation: "Cardiologist",
    date: "2026-03-28",
    time: "09:15 AM",
    status: "past",
    summary: "Routine heart checkup. Post-op recovery looks excellent.",
    rating: 5,
  },
];

export default function PatientVisits() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [visits, setVisits] = useState(MOCK_VISITS);
  const [loading, setLoading] = useState(true);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [activeVisit, setActiveVisit] = useState<any>(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Simulation loading
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
    }
    return () => clearTimeout(timer);
  }, []);

  // Filter visits
  const filteredVisits = visits.filter((v) => v.status === activeTab);

  // Actions
  const handleCancelVisit = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to cancel this consultation? (Non-refundable if < 2 hours before)",
      )
    )
      return;

    if (!navigator.onLine) {
      alert("Offline: Cancellation queued. We will sync when online.");
      return;
    }

    try {
      setVisits((prev) => prev.filter((v) => v.id !== id));
      alert("Consultation Cancelled Successfully.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleRateVisit = (visit: any) => {
    setActiveVisit(visit);
    setIsRatingModalOpen(true);
  };

  const submitRating = (stars: number) => {
    if (!isOnline) {
      alert("Offline: Rating queued for sync.");
    } else {
      alert(
        `Thank you! Dr. ${activeVisit.doctor} received a ${stars} star rating.`,
      );
    }
    setVisits((prev) =>
      prev.map((v) => (v.id === activeVisit.id ? { ...v, rating: stars } : v)),
    );
    setIsRatingModalOpen(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-10 font-sans text-slate-900">
      {/* Connection Status */}
      {!isOnline && (
        <div className="fixed top-10 right-10 flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-lg text-xs font-bold tracking-normal z-[100]">
          <BiWifiOff className="text-primary" /> OFFLINE MODE
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-bold tracking-tighter text-slate-900 mb-2 font-grotesk">
            Visits Mission Control
          </h1>
          <p className="text-sm text-slate-400 font-medium tracking-tight">
            Manage your upcoming expert care sessions and past medical sessions.
          </p>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 bg-white p-1 rounded-lg w-fit mb-10 border border-slate-100">
          <button
            className={`px-6 py-3 rounded-lg text-xs font-extra-bold  tracking-normal transition-all ${
              activeTab === "upcoming"
                ? "bg-primary text-white"
                : "text-slate-400 hover:text-primary"
            }`}
            onClick={() => setActiveTab("upcoming")}
          >
            Upcoming
          </button>
          <button
            className={`px-6 py-3 rounded-lg text-xs font-extra-bold  tracking-normal transition-all ${
              activeTab === "past"
                ? "bg-primary text-white"
                : "text-slate-400 hover:text-primary"
            }`}
            onClick={() => setActiveTab("past")}
          >
            Past
          </button>
        </div>

        {/* List Section */}
        <div className="space-y-6">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-lg p-6 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-6 items-center border border-slate-100 opacity-50"
              >
                <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-100 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-6 w-48 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="h-4 w-32 bg-slate-50 rounded-lg animate-pulse" />
                </div>
                <div className="h-12 w-32 bg-slate-100 rounded-lg animate-pulse" />
              </div>
            ))
          ) : filteredVisits.length === 0 ? (
            <div className="text-center py-20 bg-white/50 rounded-lg border-2 border-dashed border-slate-200">
              <BiCalendar size={64} className="mx-auto text-slate-200 mb-6" />
              <p className="font-bold text-slate-400  tracking-normal text-sm">
                No {activeTab} visits found
              </p>
            </div>
          ) : (
            filteredVisits.map((visit) => (
              <div
                key={visit.id}
                className="bg-white rounded-lg p-6 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-6 items-center border border-slate-100 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-lg bg-slate-50 text-primary flex items-center justify-center text-2xl border border-slate-100">
                  <BiUser />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 font-grotesk">
                    Dr. {visit.doctor}
                  </h3>
                  <p className="text-xs font-bold text-slate-400  tracking-normal">
                    {visit.specialisation}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm font-semibold text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <BiCalendar className="text-primary" /> {visit.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <BiTime className="text-secondary" /> {visit.time}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {activeTab === "upcoming" ? (
                    <>
                      <button
                        className="bg-transparent text-red-500 border border-red-500/20 px-7 py-3 rounded-lg font-extra-bold  text-xs hover:bg-red-50 transition-all"
                        onClick={() => handleCancelVisit(visit.id)}
                      >
                        Cancel
                      </button>
                      <button
                        className="bg-supportive-teal text-white px-8 py-3 rounded-lg font-extra-bold  text-xs hover:bg-[#008ba3] transition-all"
                        onClick={() => setIsVideoModalOpen(true)}
                      >
                        Join Call
                      </button>
                    </>
                  ) : (
                    <div className="text-right space-y-3">
                      {visit.rating === 0 ? (
                        <button
                          className="text-xs font-bold text-primary  tracking-normal bg-primary/5 px-6 py-3 rounded-lg hover:bg-primary/10 transition-all"
                          onClick={() => handleRateVisit(visit)}
                        >
                          Rate Session
                        </button>
                      ) : (
                        <div className="flex gap-1 text-amber-400">
                          {[...Array(visit.rating)].map((_, i) => (
                            <BiStar key={i} fill="currentColor" />
                          ))}
                        </div>
                      )}
                      <button className="flex items-center gap-2 text-xs font-bold text-slate-300  tracking-normal hover:text-primary transition-all">
                        <BiDownload /> Prescription PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Video Call Modal */}
      {isVideoModalOpen && (
        <div
          className="fixed inset-0 z-[2000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-5"
          onClick={() => setIsVideoModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg w-full max-w-3xl overflow-hidden relative animate-in zoom-in-95 duration-500"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <span className="w-3 h-3 rounded-lg bg-red-500 animate-pulse" />
                <h2 className="text-xl font-bold font-grotesk">
                  Live Consultation \u2014 Secure Tunnel
                </h2>
              </div>
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all"
              >
                <BiX size={24} />
              </button>
            </div>
            <div className="w-full aspect-video bg-[#101828] flex items-center justify-center text-white/40">
              <div className="flex flex-col items-center gap-6">
                <BiVideo size={80} className="text-white/5" />
                <p className="font-bold text-white/40  tracking-[0.4em] text-xs">
                  Waiting for practitioner to connect...
                </p>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg border-2 border-white/5 flex items-center justify-center text-white/20">
                    <BiPulse />
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-red-500/80 flex items-center justify-center text-white hover:bg-red-600 transition-all cursor-pointer">
                    <BiTrash />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-8 bg-slate-50 flex items-center justify-between border-t border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-400  tracking-normal">
                  Connection Health
                </p>
                <p className="text-sm font-bold text-primary">
                  Stable (32ms Latency)
                </p>
              </div>
              <button
                className="px-8 py-3 bg-slate-900 text-white rounded-lg font-bold text-xs  tracking-normal hover:bg-slate-800 transition-all"
                onClick={() => setIsVideoModalOpen(false)}
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {isRatingModalOpen && (
        <div
          className="fixed inset-0 z-[2000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-5"
          onClick={() => setIsRatingModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg w-full max-w-md p-10 space-y-8 animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-slate-900 font-grotesk">
                Rate Your Session
              </h2>
              <p className="text-sm text-slate-400 font-medium">
                How was your consultation with Dr. {activeVisit?.doctor}?
              </p>
            </div>
            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className="text-4xl text-slate-100 hover:text-amber-400 transition-all"
                  onClick={() => submitRating(star)}
                >
                  <BiStar fill="currentColor" />
                </button>
              ))}
            </div>
            <textarea
              placeholder="Any specific feedback? (Optional)"
              className="w-full p-5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-primary transition-all text-sm font-medium"
              rows={4}
            />
            <button
              className="w-full py-4 bg-primary text-white rounded-lg font-bold text-xs  tracking-normal hover:bg-primary-dark transition-all"
              onClick={() => setIsRatingModalOpen(false)}
            >
              Submit Anonymous Feedback
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
