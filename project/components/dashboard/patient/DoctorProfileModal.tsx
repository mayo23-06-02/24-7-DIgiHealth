"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import {
  BiX,
  BiShareAlt,
  BiStar,
  BiPhone,
  BiEnvelope,
  BiBuilding,
  BiMessage,
  BiCalendar,
  BiCheckCircle,
  BiShieldQuarter,
  BiGlobe,
  BiWallet,
  BiAward,
  BiChevronRight,
  BiHeart,
  BiSolidHeart,
} from "react-icons/bi";
import Avatar from "@/components/ui/Avatar";

export interface DoctorProfile {
  id: string;
  name: string;
  specialisation: string;
  hpcsNumber: string;
  experienceYears: number;
  languages: string[];
  practicePhone: string;
  practiceEmail: string;
  facilityName: string;
  facilityId: string;
  about: string;
  clinicalInterests: string[];
  consultationFee: number;
  acceptsMedicalAid: string[];
  rating: number;
  reviewCount: number;
  isOnline: boolean;
  avatarUrl?: string;
  nextAvailableMinutes?: number;
}

interface DoctorProfileModalProps {
  doctor: DoctorProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onBook: (doctorId: string, slot?: string) => void;
  onMessage: (doctorId: string) => void;
  onLink?: (id: string, action: "link" | "unlink") => void;
  isMyDoctor?: boolean;
}

export default function DoctorProfileModal({
  doctor,
  isOpen,
  onClose,
  onBook,
  onMessage,
  onLink,
  isMyDoctor = false,
}: DoctorProfileModalProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  if (!doctor) return null;

  // Mock available slots for today
  const availableSlots = [
    "10:00 AM",
    "10:30 AM",
    "11:00 AM",
    "02:00 PM",
    "02:30 PM",
    "04:00 PM",
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      width="lg"
      title={`Dr. ${doctor.name}`}
    >
      <div className="relative bg-white w-full h-[95vh] md:h-auto md:max-h-[85vh] flex flex-col overflow-hidden">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center shrink-0">
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-10 h-10 p-0 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all active:scale-90 !min-w-0 border-none bg-transparent"
          >
            <BiX size={28} />
          </Button>

          <div className="flex flex-col items-center">
            <h2 className="text-sm font-bold text-slate-800 tracking-tight leading-none mb-1  font-grotesk">
              Dr. {doctor.name}
            </h2>
            <p className="text-sm font-bold text-primary  tracking-normal opacity-80">
              {doctor.specialisation}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="w-10 h-10 p-0 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-primary transition-all active:scale-90 !min-w-0 border-none bg-transparent"
              aria-label="Share"
            >
              <BiShareAlt size={20} />
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsSaved(!isSaved)}
              className={`w-10 h-10 p-0 rounded-xl hover:bg-slate-50 flex items-center justify-center transition-all active:scale-90 !min-w-0 border-none bg-transparent ${isSaved ? "text-rose-500" : "text-slate-500"}`}
              aria-label="Save doctor"
            >
              {isSaved ? (
                <BiSolidHeart size={22} className="scale-110" />
              ) : (
                <BiHeart size={22} />
              )}
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10">
          {/* Hero Section */}
          <section className="text-center relative">
            <div className="relative inline-block">
              <div className="w-32 h-32 mx-auto overflow-hidden rounded-lg ring-8 ring-slate-50 shadow-none shadow-slate-200">
                {doctor.avatarUrl ? (
                  <img
                    src={doctor.avatarUrl}
                    alt={doctor.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary text-4xl font-bold">
                    {doctor.name.charAt(0)}
                  </div>
                )}
              </div>
              {doctor.isOnline && (
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white px-4 py-1.5 rounded-full text-[9px] font-bold  tracking-normal flex items-center gap-2 ring-4 ring-white shadow-none">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  Live Now
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-center items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-2xl border border-gray-100 shadow-none shadow-gray-100/50">
                <BiStar className="text-gray-500 fill-gray-500" size={18} />
                <span className="text-sm font-bold text-slate-800">
                  {doctor.rating}
                </span>
              </div>
              <div className="h-4 w-px bg-slate-100" />
              <span className="text-sm font-bold text-slate-500  tracking-normal">
                {doctor.reviewCount} Verified Reviews
              </span>
            </div>
          </section>

          {/* Core Info Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-slate-50/50 rounded-lg p-6 border border-slate-100 flex items-center gap-5 transition-all hover:bg-white hover:shadow-none hover:shadow-slate-900/5">
              <div className="w-14 h-14 bg-white rounded-[1.25rem] flex items-center justify-center text-primary shadow-none border border-slate-50">
                <BiShieldQuarter size={26} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-slate-500  tracking-normal mb-1.5">
                  HPCSA Registration
                </p>
                <p className="text-xs font-bold text-slate-800 font-mono tracking-wider truncate">
                  {doctor.hpcsNumber}
                </p>
              </div>
            </div>
            <div className="bg-slate-50/50 rounded-lg p-6 border border-slate-100 flex items-center gap-5 transition-all hover:bg-white hover:shadow-none hover:shadow-slate-900/5">
              <div className="w-14 h-14 bg-white rounded-[1.25rem] flex items-center justify-center text-primary shadow-none border border-slate-50">
                <BiAward size={26} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-slate-500  tracking-normal mb-1.5">
                  Professional Tenure
                </p>
                <p className="text-sm font-bold text-slate-800 tracking-tight">
                  {doctor.experienceYears}+ Medical Years
                </p>
              </div>
            </div>
          </section>

          {/* Contact & Facility */}
          <section className="space-y-4 bg-white border border-slate-100 rounded-lg p-8 shadow-none shadow-slate-900/5">
            <h4 className="text-sm font-bold text-slate-500  tracking-[0.25em] mb-4 font-grotesk">
              Clinical Access Points
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Button
                variant="ghost"
                onClick={() => window.open(`tel:${doctor.practicePhone}`)}
                className="flex items-center gap-4 bg-slate-50 hover:bg-primary/5 p-2 pr-6 rounded-2xl transition-all border-none h-auto !min-w-0 justify-start normal-case"
              >
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-500 group-hover/btn:text-primary shadow-none">
                  <BiPhone size={18} />
                </div>
                <span className="text-sm font-bold text-slate-700 tracking-tight">
                  {doctor.practicePhone}
                </span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => window.open(`mailto:${doctor.practiceEmail}`)}
                className="flex items-center gap-4 bg-slate-50 hover:bg-primary/5 p-2 pr-6 rounded-2xl transition-all border-none h-auto !min-w-0 justify-start normal-case"
              >
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-500 group-hover/btn:text-primary shadow-none">
                  <BiEnvelope size={18} />
                </div>
                <span className="text-sm font-bold text-slate-700 tracking-tight truncate">
                  {doctor.practiceEmail}
                </span>
              </Button>
              <Button
                variant="ghost"
                className="flex items-center gap-4 bg-slate-50 hover:bg-primary/5 p-2 pr-6 rounded-2xl transition-all border-none h-auto !min-w-0 justify-start text-left col-span-1 md:col-span-2 normal-case"
              >
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-500 group-hover/btn:text-primary shadow-none">
                  <BiBuilding size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-slate-700 tracking-tight group-hover/btn:text-primary transition-colors block">
                    {doctor.facilityName}
                  </span>
                  <p className="text-[9px] text-slate-500 font-bold  tracking-normal opacity-80 mt-0.5">
                    View Facility Analytics{" "}
                    <BiChevronRight className="inline" />
                  </p>
                </div>
              </Button>
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-transparent col-span-1 md:col-span-2">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-500 shadow-none">
                  <BiGlobe size={18} />
                </div>
                <span className="text-sm font-bold text-slate-600  tracking-normal">
                  {doctor.languages.join("   ·   ")}
                </span>
              </div>
            </div>
          </section>

          {/* About & Clinical Focus */}
          <section className="space-y-8">
            <div className="relative">
              <h3 className="text-lg font-bold text-slate-500  tracking-normal mb-4 px-1 font-grotesk">
                Clinical Overview
              </h3>
              <div className="text-sm font-bold text-slate-600 leading-relaxed bg-slate-50/50 p-8 rounded-lg border border-dashed border-slate-200 italic shadow-inner">
                "{doctor.about}"
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-500  tracking-normal mb-4 px-1 font-grotesk">
                Clinical Specializations
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {doctor.clinicalInterests.map((interest) => (
                  <span
                    key={interest}
                    className="bg-primary/5 text-primary px-5 py-2.5 rounded-xl text-sm font-bold  tracking-normal border border-primary/10 shadow-none transition-all hover:bg-primary hover:text-white hover:shadow-none hover:shadow-primary/20 cursor-default"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Consultation Fee Section */}
          <section className="bg-slate-900 rounded-lg p-8 text-white overflow-hidden relative group shadow-none shadow-slate-900/30">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/30 transition-all duration-1000" />
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg text-primary font-bold  tracking-normal mb-2 font-grotesk">
                    Commercial Tier
                  </h3>
                  <p className="text-xl font-bold text-white tracking-tight leading-none">
                    Discovery Preferred Network
                  </p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                  <BiWallet size={24} className="text-primary" />
                </div>
              </div>
              <p className="text-xs text-slate-500 font-bold leading-relaxed max-w-sm">
                Accepts most major medical aid providers including Discovery,
                Momentum, and GEMS for direct clinical billing.
              </p>
              <div className="flex flex-wrap gap-2">
                {doctor.acceptsMedicalAid.map((aid) => (
                  <span
                    key={aid}
                    className="text-[9px] font-bold px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg  tracking-normal text-slate-300"
                  >
                    {aid}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Availability Intelligence */}
          <section className="space-y-5">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-lg font-bold text-slate-800  tracking-[0.25em] flex items-center gap-2 font-grotesk">
                <BiCalendar className="text-primary" /> Availability Grid
              </h3>
              <span className="text-[9px] font-bold text-slate-500  tracking-normal opacity-60">
                TZ: AFRICA/JOHANNESBURG
              </span>
            </div>

            <div className="bg-slate-50/50 rounded-lg p-8 border border-slate-100 shadow-inner">
              <p className="text-sm font-bold text-slate-500  tracking-normal mb-6 px-1">
                TODAY,{" "}
                {new Date().toLocaleDateString("en-ZA", {
                  day: "numeric",
                  month: "long",
                })}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot}
                    variant={selectedSlot === slot ? "primary" : "ghost"}
                    onClick={() => setSelectedSlot(slot)}
                    className={`px-5 py-4 h-auto rounded-2xl text-[11px] font-bold tracking-normal  transition-all duration-300 transform active:scale-95 !min-w-0 border-none ${
                      selectedSlot === slot
                        ? "shadow-none shadow-primary/30 scale-105"
                        : "bg-white text-slate-500 hover:text-primary hover:bg-white hover:shadow-none hover:shadow-slate-900/5"
                    }`}
                  >
                    {slot}
                  </Button>
                ))}
              </div>
            </div>
          </section>

          {/* Patient Intel */}
          <section className="space-y-6 pb-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-lg font-bold text-slate-800  tracking-[0.25em] font-grotesk">
                Clinical Reputation
              </h3>
              <Button
                variant="ghost"
                className="text-primary text-sm font-bold  tracking-normal hover:underline !p-0 !min-w-0 !h-auto border-none bg-transparent"
              >
                View all Experience Logs
              </Button>
            </div>

            <div className="space-y-4">
              {[
                {
                  name: "Thandiwe M.",
                  time: "2D AGO",
                  content:
                    "Very thorough and caring — explained everything regarding the prescription and side effects clearly.",
                  rating: 5,
                },
                {
                  name: "John D.",
                  time: "1W AGO",
                  content:
                    "Great consultation, very professional. Small 10 min delay but the session was worth the wait.",
                  rating: 4,
                },
              ].map((review, i) => (
                <div
                  key={i}
                  className="bg-white border border-slate-100 p-8 rounded-lg relative group overflow-hidden transition-all hover:shadow-none hover:shadow-slate-900/5"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                  <div className="flex items-center gap-1.5 text-gray-400 mb-4">
                    {[...Array(5)].map((_, starI) => (
                      <BiStar
                        key={starI}
                        size={14}
                        fill={starI < review.rating ? "currentColor" : "none"}
                        className={
                          starI >= review.rating ? "text-slate-200" : ""
                        }
                      />
                    ))}
                    <span className="text-[9px] font-bold text-slate-300 ml-3  tracking-normal opacity-80">
                      Verified Clinical Visit
                    </span>
                  </div>
                  <p className="text-[13px] text-slate-600 font-bold leading-relaxed mb-5 italic pr-2">
                    "{review.content}"
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-500  tracking-normal">
                      {review.name} <span className="opacity-30 mx-2">·</span>{" "}
                      {review.time}
                    </p>
                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-500  tracking-normal">
                      <BiCheckCircle size={16} /> RECOMMENDED
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sticky Action Bar */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 p-8 flex gap-4 shrink-0 shadow-[0_-20px_50px_-10px_rgba(0,0,0,0.05)]">
          <Button
            variant="outline"
            onClick={() => onLink?.(doctor.id, isMyDoctor ? "unlink" : "link")}
            fullWidth
            className="h-16 rounded-[1.5rem] border-slate-200 text-[11px] font-bold  tracking-normal text-slate-600 hover:bg-slate-50 transition-all"
          >
            {isMyDoctor
              ? "Remove Primary Care"
              : "Set as Primary Care Provider"}
          </Button>

          <Button
            disabled={!selectedSlot}
            onClick={() => onBook(doctor.id, selectedSlot || undefined)}
            fullWidth
            className={`h-16 rounded-[1.5rem] text-[11px] font-bold  tracking-normal shadow-none transition-all ${selectedSlot ? "bg-primary text-white shadow-primary/30" : "bg-slate-100 text-slate-500 border-none"}`}
            icon={<BiCalendar size={20} />}
            iconPosition="right"
          >
            {selectedSlot
              ? `Confirm Slot: ${selectedSlot}`
              : "Select Intelligence Window"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
