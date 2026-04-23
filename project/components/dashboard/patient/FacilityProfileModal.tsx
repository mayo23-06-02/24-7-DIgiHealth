"use client";

import React from "react";
import {
  BiX,
  BiMapPin,
  BiPhone,
  BiEnvelope,
  BiLink,
  BiBuildingHouse,
  BiPlusMedical,
  BiShieldQuarter,
  BiStar,
  BiTime,
  BiCheck,
  BiCar,
  BiUniversalAccess,
  BiCapsule,
  BiBody,
  BiTrendingUp,
  BiHeart,
  BiShareAlt,
  BiSolidFlagAlt,
  BiChevronRight,
  BiPhoneCall,
  BiGlobe,
  BiCheckCircle,
  BiUserVoice,
} from "react-icons/bi";
import Button from "@/components/ui/Button";
import { Facility } from "./FacilityCard";

interface FacilityProfileModalProps {
  facility: Facility | null;
  isOpen: boolean;
  onClose: () => void;
  onBook: (id: string) => void;
  onDirections?: (id: string) => void;
  onSave?: (id: string) => void;
  onShare?: (id: string) => void;
  onReport?: (id: string) => void;
}

export default function FacilityProfileModal({
  facility,
  isOpen,
  onClose,
  onBook,
  onDirections,
  onSave,
  onShare,
  onReport,
}: FacilityProfileModalProps) {
  if (!isOpen || !facility) return null;

  const getWaitTimeColor = () => {
    if (facility.waitTime <= 15) return "text-green-500 bg-green-500/10";
    if (facility.waitTime <= 45) return "text-amber-500 bg-amber-500/10";
    return "text-rose-500 bg-rose-500/10";
  };

  const getStatusText = () => {
    if (facility.isOpen) return "Currently Open";
    return "Closed Now";
  };

  return (
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

export default function FacilityProfileModal({
  facility,
  isOpen,
  onClose,
  onBook,
  onDirections,
  onSave,
  onShare,
  onReport,
}: FacilityProfileModalProps) {
  if (!facility) return null;

  const getWaitTimeColor = () => {
    if (facility.waitTime <= 15) return "text-green-500 bg-green-500/10";
    if (facility.waitTime <= 45) return "text-amber-500 bg-amber-500/10";
    return "text-rose-500 bg-rose-500/10";
  };

  const getStatusText = () => {
    if (facility.isOpen) return "Currently Open";
    return "Closed Now";
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      noPadding
      width="5xl"
      title={facility.name}
      hideHeader
    >
      <div className="relative bg-white w-full h-[90vh] flex flex-col overflow-hidden">
        {/* Header Section (Hero Image & Basic Info) */}
        <div className="relative h-[300px] shrink-0 group">
          <img
            src={facility.image}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2000ms]"
            alt=""
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />

          <Button
            variant="ghost"
            onClick={onClose}
            className="absolute top-8 right-8 z-10 w-14 h-14 bg-white/20 hover:bg-white backdrop-blur-xl rounded-lg flex items-center justify-center text-white hover:text-slate-900 transition-all hover:rotate-90 group !p-0 !min-w-0 border-none"
          >
            <BiX
              size={32}
              className="group-hover:scale-110 transition-transform"
            />
          </Button>

          <div className="absolute bottom-10 left-12 right-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-normal ${
                    facility.type === "Public"
                      ? "bg-blue-600"
                      : facility.type === "Private"
                        ? "bg-emerald-600"
                        : "bg-amber-600"
                  } text-white`}
                >
                  {facility.type} Facility
                </span>
                <div className="flex items-center gap-1.5 px-3 py-2 bg-white/10 backdrop-blur-md rounded-lg text-white border border-white/20">
                  <BiStar
                    className="text-amber-400"
                    size={16}
                    fill="currentColor"
                  />
                  <span className="text-sm font-bold">
                    {facility.rating} Rating
                  </span>
                </div>
              </div>
              <h2 className="text-5xl font-bold text-white tracking-tighter leading-none mb-1">
                {facility.name}
              </h2>
              <div className="flex flex-wrap gap-2">
                {facility.accreditations.map((acc, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 text-white/70 text-xs uppercase font-bold tracking-normal bg-white/5 px-2 py-1 rounded-lg border border-white/10"
                  >
                    <BiShieldQuarter className="text-primary-light" />
                    {acc}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <Button
                variant="primary"
                onClick={() => onBook(facility.id)}
                className="px-8 py-5 h-auto rounded-lg font-bold uppercase tracking-normal text-xs active:scale-95"
              >
                Book Virtual Consult
              </Button>
              <Button
                variant="white"
                onClick={() => onSave?.(facility.id)}
                className="w-16 h-16 p-0 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-lg flex items-center justify-center text-white transition-all active:scale-90 border-white/10 !min-w-0"
              >
                <BiHeart size={28} />
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 md:px-12 py-10 custom-scrollbar grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Info Column */}
          <div className="lg:col-span-8 space-y-12">
            {/* REAL-TIME STATS GRID */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 flex items-center gap-5 transition-all hover:bg-white group">
                <div
                  className={`w-14 h-14 ${getWaitTimeColor()} rounded-lg flex items-center justify-center transition-transform group-hover:scale-110`}
                >
                  <BiTime size={28} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-normal">
                    Wait Time
                  </p>
                  <p
                    className={`text-xl font-bold tracking-tight leading-none mt-1`}
                  >
                    {facility.waitTime} Minutes
                  </p>
                </div>
              </div>
              <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 flex items-center gap-5 transition-all hover:bg-white group">
                <div className="w-14 h-14 bg-emerald-500/10 text-emerald-600 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
                  <BiPlusMedical size={28} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-normal">
                    General Beds
                  </p>
                  <p className="text-xl font-bold tracking-tight leading-none mt-1">
                    {facility.bedAvailability.general}
                  </p>
                </div>
              </div>
              <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 flex items-center gap-5 transition-all hover:bg-white group">
                <div className="w-14 h-14 bg-blue-500/10 text-blue-600 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
                  <BiTrendingUp size={28} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-normal">
                    Occupancy
                  </p>
                  <p className="text-xl font-bold tracking-tight leading-none mt-1">
                    {facility.realTimeData.occupancy}% Load
                  </p>
                </div>
              </div>
            </section>

            {/* CONTACT & LOCATION CARD */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BiMapPin className="text-primary" size={24} />
                  <h4 className="text-xl font-bold text-slate-800 tracking-tight">
                    Location & Directions
                  </h4>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDirections?.(facility.id)}
                  className="rounded-lg text-[10px] uppercase font-bold tracking-normal border-slate-200"
                >
                  Get Directions
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white border border-slate-100 p-8 rounded-lg">
                <div className="space-y-6">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-normal">
                      Street Address
                    </p>
                    <p className="text-base font-bold text-slate-800 leading-relaxed">
                      {facility.address}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <a
                      href={`tel:${facility.phone}`}
                      className="flex items-center gap-4 group p-3 rounded-lg hover:bg-primary/5 transition-all"
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                        <BiPhoneCall size={20} />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">
                          Main Practice
                        </p>
                        <p className="text-sm font-bold text-slate-700">
                          {facility.phone}
                        </p>
                      </div>
                    </a>
                    <a
                      href={`tel:${facility.emergencyPhone}`}
                      className="flex items-center gap-4 group p-3 rounded-lg bg-rose-50 border border-rose-100/50 hover:bg-rose-100 transition-all"
                    >
                      <div className="w-10 h-10 rounded-lg bg-rose-500 flex items-center justify-center text-white">
                        <BiPlusMedical size={20} />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-rose-400 uppercase">
                          Emergency Line
                        </p>
                        <p className="text-sm font-bold text-rose-600">
                          {facility.emergencyPhone}
                        </p>
                      </div>
                    </a>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-2">
                    <Button
                      variant="ghost"
                      onClick={() => (window.location.href = `mailto:${facility.email}`)}
                      className="flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-primary transition-colors !p-0 !min-w-0 !h-auto border-none bg-transparent"
                    >
                      <BiEnvelope size={16} /> Contact Support
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => window.open(facility.website, "_blank")}
                      className="flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-primary transition-colors !p-0 !min-w-0 !h-auto border-none bg-transparent"
                    >
                      <BiLink size={16} /> Visit Website
                    </Button>
                  </div>
                </div>

                <div className="w-full h-[240px] rounded-lg overflow-hidden border-4 border-slate-50 group">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    className="group-hover:grayscale-0 grayscale transition-all duration-[3000ms]"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(facility.address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                  />
                </div>
              </div>
            </section>

            {/* OPERATIONAL HOURS */}
            <section className="bg-slate-50 p-8 rounded-lg border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center text-primary">
                  <BiTime size={32} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-800 tracking-tight leading-none mb-2">
                    Operating Status
                  </h4>
                  <span
                    className={`inline-flex items-center gap-2 text-sm font-bold uppercase tracking-normal ${facility.isOpen ? "text-emerald-500" : "text-rose-500"}`}
                  >
                    <span
                      className={`w-2 h-2 rounded-lg bg-current ${facility.isOpen ? "animate-pulse" : ""}`}
                    />
                    {getStatusText()}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm font-bold text-slate-600">
                <span className="uppercase text-[9px] tracking-normal text-slate-400">
                  Weekdays
                </span>
                <span>08:00 – 18:00</span>
                <span className="uppercase text-[9px] tracking-normal text-slate-400">
                  Weekends
                </span>
                <span>09:00 – 13:00</span>
              </div>
            </section>

            {/* CLINICAL SERVICES */}
            <section className="space-y-6">
              <h4 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                <BiBuildingHouse size={24} className="text-primary" />{" "}
                Specialized Departments
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {facility.departments.map((dep, i) => (
                  <div
                    key={i}
                    className="px-6 py-4 bg-white border border-slate-100 rounded-lg transition-all flex items-center gap-3 active:scale-95"
                  >
                    <div className="w-2 h-2 bg-primary rounded-lg shrink-0" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-tight truncate">
                      {dep}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* SPECIALISTS ON-CALL */}
            <section className="space-y-6">
              <h4 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                <BiBody size={24} className="text-primary" /> On-Call
                Specialists
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {facility.specialists.map((spec, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-5 p-5 bg-slate-50/50 rounded-lg border border-white hover:bg-white transition-all cursor-pointer group"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden ring-4 ring-white">
                      <img
                        src={spec.image}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold text-slate-800 tracking-tight truncate group-hover:text-primary transition-colors">
                        {spec.name}
                      </p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-normal">
                        {spec.specialty}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-emerald-500">
                        <BiCheckCircle size={14} />
                        <span className="text-[9px] font-bold uppercase tracking-normal">
                          Available Now
                        </span>
                      </div>
                    </div>
                    <BiChevronRight
                      className="text-slate-200 group-hover:text-primary transition-colors"
                      size={24}
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Meta & Actions */}
          <div className="lg:col-span-4 space-y-8">
            {/* AMENITIES CARD */}
            <div className="bg-slate-900 rounded-lg p-8 text-white space-y-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-lg -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/20 transition-all duration-700" />

              <div className="relative z-10 space-y-8">
                <div>
                  <h5 className="text-xs font-bold text-white/40 uppercase tracking-normal mb-6">
                    Facility Amenities
                  </h5>
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-primary border border-white/10">
                          <BiUniversalAccess size={22} />
                        </div>
                        <span className="text-sm font-bold tracking-tight">
                          Wheelchair Access
                        </span>
                      </div>
                      <BiCheck
                        className={
                          facility.amenities.wheelchair
                            ? "text-emerald-400"
                            : "text-white/10"
                        }
                        size={24}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-primary border border-white/10">
                          <BiCar size={22} />
                        </div>
                        <span className="text-sm font-bold tracking-tight">
                          Secure Parking
                        </span>
                      </div>
                      <BiCheck
                        className={
                          facility.amenities.parking
                            ? "text-emerald-400"
                            : "text-white/10"
                        }
                        size={24}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-primary border border-white/10">
                          <BiCapsule size={22} />
                        </div>
                        <span className="text-sm font-bold tracking-tight">
                          24/7 Pharmacy
                        </span>
                      </div>
                      <BiCheck
                        className={
                          facility.amenities.pharmacy
                            ? "text-emerald-400"
                            : "text-white/10"
                        }
                        size={24}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-primary border border-white/10">
                          <BiUserVoice size={22} />
                        </div>
                        <span className="text-sm font-bold tracking-tight">
                          Multiple Languages
                        </span>
                      </div>
                      <span className="text-xs font-bold text-white/30 uppercase tracking-tighter">
                        {facility.languages.length} Types
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/5">
                  <h5 className="text-xs font-bold text-white/40 uppercase tracking-normal mb-4">
                    Accepted Insurance
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {facility.insurance.map((ins, i) => (
                      <span
                        key={i}
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-white/80 transition-all hover:bg-primary/20 hover:text-white cursor-default"
                      >
                        {ins}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* REAL-TIME OCCUPANCY CARD */}
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-8 space-y-8">
              <div>
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-normal mb-6">
                  Real-Time Operations
                </h5>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-normal text-slate-500">
                      <span>Occupancy Rate</span>
                      <span
                        className={
                          facility.realTimeData.occupancy > 80
                            ? "text-rose-500"
                            : "text-slate-800"
                        }
                      >
                        {facility.realTimeData.occupancy}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-lg overflow-hidden">
                      <div
                        className={`h-full rounded-lg transition-all duration-1000 ${
                          facility.realTimeData.occupancy > 80
                            ? "bg-rose-500"
                            : "bg-primary"
                        }`}
                        style={{ width: `${facility.realTimeData.occupancy}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-lg border border-slate-100 text-center">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-normal mb-1">
                        Queue Size
                      </p>
                      <p className="text-lg font-bold text-slate-800">
                        {facility.realTimeData.patientsWaiting}
                      </p>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-slate-100 text-center">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-normal mb-1">
                        Ambulance
                      </p>
                      <p
                        className={`text-lg font-bold ${facility.realTimeData.ambulanceBayAvailable ? "text-emerald-500" : "text-slate-300"}`}
                      >
                        {facility.realTimeData.ambulanceBayAvailable
                          ? "READY"
                          : "BUSY"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200">
                <div className="flex gap-4">
                  <Button
                    variant="ghost"
                    onClick={() => onShare?.(facility.id)}
                    className="flex-1 flex flex-col items-center gap-2 p-5 bg-white rounded-lg border border-slate-100 transition-all group active:scale-95 !h-auto !min-w-0"
                  >
                    <BiShareAlt
                      className="text-slate-400 group-hover:text-primary transition-colors"
                      size={24}
                    />
                    <span className="text-xs font-bold uppercase tracking-normal text-slate-400">
                      Share
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => onReport?.(facility.id)}
                    className="flex-1 flex flex-col items-center gap-2 p-5 bg-white rounded-lg border border-slate-100 transition-all group active:scale-95 !h-auto !min-w-0"
                  >
                    <BiSolidFlagAlt
                      className="text-slate-400 group-hover:text-rose-500 transition-colors"
                      size={24}
                    />
                    <span className="text-xs font-bold uppercase tracking-normal text-slate-400">
                      Report
                    </span>
                  </Button>
                </div>
              </div>
            </div>

            {/* SECONDARY ACTION */}
            <Button
              variant="accent"
              className="w-full py-5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-xs font-bold uppercase tracking-normal hover:bg-emerald-500 hover:text-white transition-all duration-300 active:scale-95 flex items-center justify-center gap-3 h-auto"
            >
              <BiGlobe size={20} />
              Official Health Database
            </Button>
          </div>
        </div>

        {/* Sticky Action Footer (Mobile Only or Floating) */}
        <div className="lg:hidden sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 p-6 flex gap-4 shrink-0">
          <Button
            variant="primary"
            className="flex-1 rounded-lg py-4 font-bold uppercase tracking-normal text-xs h-auto"
          >
            Book Consult
          </Button>
          <Button
            variant="outline"
            className="flex-1 rounded-lg py-4 font-bold uppercase tracking-normal text-xs border-slate-200 h-auto"
          >
            Get Directions
          </Button>
        </div>
      </div>
    </Modal>
  );
  );
}
