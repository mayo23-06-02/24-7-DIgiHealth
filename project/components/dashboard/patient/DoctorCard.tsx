"use client";

import React from "react";
import {
  BiStar,
  BiTime,
  BiShieldPlus,
  BiMessage,
  BiDotsVerticalRounded,
  BiUser,
  BiCalendarCheck,
} from "react-icons/bi";

export interface Doctor {
  id: string;
  name: string;
  specialisation: string;
  hpcsNumber: string;
  rating: number;
  reviewCount: number;
  nextAvailableMinutes?: number;
  languages: string[];
  avatarUrl?: string;
  isOnline?: boolean;
  consultationFee?: number;
  experienceYears?: number;
  practicePhone?: string;
  practiceEmail?: string;
  facilityName?: string;
  facilityId?: string;
  about?: string;
  clinicalInterests?: string[];
  acceptsMedicalAid?: string[];
}

interface DoctorCardProps {
  doctor: Doctor;
  variant?: "horizontal" | "vertical" | "compact";
  onBook: (doctorId: string) => void;
  onViewProfile?: (doctorId: string) => void;
  openMenuId?: string | null;
  setOpenMenuId?: (id: string | null) => void;
}

export default function DoctorCard({
  doctor,
  variant = "horizontal",
  onBook,
  onViewProfile,
  openMenuId,
  setOpenMenuId,
}: DoctorCardProps) {
  const getAvailabilityColor = () => {
    const mins = doctor.nextAvailableMinutes ?? 0;
    if (mins <= 15) return "text-green-600 bg-green-50";
    if (mins <= 45) return "text-amber-600 bg-amber-50";
    return "text-slate-500 bg-slate-100";
  };

  if (variant === "compact") {
    return (
      <div className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-slate-100 transition-all cursor-pointer">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-primary/10 shrink-0 flex items-center justify-center text-primary font-bold">
            {doctor.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">Dr. {doctor.name}</p>
            <p className="text-xs text-slate-500 truncate">
              {doctor.specialisation}
            </p>
          </div>
          <div
            className={`hidden sm:flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${getAvailabilityColor()}`}
          >
            <BiTime size={12} />
            <span>{doctor.nextAvailableMinutes ?? 0}m</span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBook(doctor.id);
          }}
          className="text-primary text-xs font-bold  tracking-normal hover:underline ml-2"
        >
          Book
        </button>
      </div>
    );
  }

  if (variant === "vertical") {
    return (
      <div
        onClick={() => onViewProfile?.(doctor.id)}
        className="bg-white rounded-lg border border-slate-200 p-5 text-center hover:border-primary/20 transition-all duration-300 cursor-pointer group relative overflow-hidden"
      >
        <div className="relative inline-block">
          <div className="w-20 h-20 rounded-lg bg-slate-100 mx-auto overflow-hidden ring-4 ring-slate-50 group-hover:ring-primary/10 transition-all">
            {doctor.avatarUrl ? (
              <img
                src={doctor.avatarUrl}
                alt={doctor.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full bg-linear-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                {doctor.name.charAt(0)}
              </div>
            )}
          </div>
          {doctor.isOnline && (
            <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-lg animate-pulse" />
          )}
        </div>

        <div className="mt-4 space-y-1">
          <h3 className="font-bold text-slate-800 tracking-tight group-hover:text-primary transition-colors font-grotesk">
            Dr. {doctor.name}
          </h3>
          <p className="text-xs text-primary font-bold  tracking-normal">
            {doctor.specialisation}
          </p>
        </div>

        <div className="flex justify-center items-center gap-1 mt-3">
          <div className="flex items-center gap-0.5 text-amber-500">
            <BiStar size={14} fill="currentColor" />
            <span className="text-sm font-bold text-slate-700">
              {doctor.rating}
            </span>
          </div>
          <span className="text-xs text-slate-400 font-bold  tracking-tighter">
            ({doctor.reviewCount} reviews)
          </span>
        </div>

        <div className="flex items-center justify-center gap-3 mt-4 text-xs font-bold text-slate-500">
          <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
            <BiShieldPlus size={12} className="text-primary" />
            {doctor.hpcsNumber}
          </span>
          <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
            <BiMessage size={12} className="text-primary" />
            {doctor.languages[0]}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onBook(doctor.id);
          }}
          className="w-full mt-5 bg-primary text-white py-3 rounded-lg font-bold text-xs  tracking-normal hover:bg-primary-dark transition-all active:scale-95"
        >
          Book in {doctor.nextAvailableMinutes ?? "now"} min
        </button>
      </div>
    );
  }

  // Horizontal (default)
  return (
    <div
      onClick={() => onViewProfile?.(doctor.id)}
      className="bg-white rounded-lg border border-slate-100/80 p-5 hover:border-primary/20 transition-all duration-500 cursor-pointer group relative shrink-0 min-w-[320px] sm:min-w-[400px]"
    >
      <div className="flex gap-5">
        <div className="relative shrink-0">
          <div className="w-20 h-20 rounded-lg bg-slate-100 overflow-hidden ring-4 ring-slate-50 group-hover:ring-primary/5 transition-all">
            {doctor.avatarUrl ? (
              <img
                src={doctor.avatarUrl}
                alt={doctor.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
            ) : (
              <div className="w-full h-full bg-linear-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                {doctor.name.charAt(0)}
              </div>
            )}
          </div>
          {doctor.isOnline && (
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-white rounded-lg" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-slate-800 text-lg tracking-tight truncate group-hover:text-primary transition-colors font-grotesk">
                Dr. {doctor.name}
              </h3>
              <p className="text-xs text-primary font-bold  tracking-normal mb-2">
                {doctor.specialisation}
              </p>

              <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-500 mb-3">
                <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                  <BiShieldPlus size={14} className="text-primary" />
                  <span className="font-mono">{doctor.hpcsNumber}</span>
                </span>
                <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                  <BiMessage size={14} className="text-primary" />
                  {doctor.languages.slice(0, 2).join(", ")}
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="flex items-center justify-end gap-1 px-2 py-1 bg-amber-50 rounded-lg border border-amber-100 mb-2">
                <BiStar
                  className="text-amber-500"
                  size={14}
                  fill="currentColor"
                />
                <span className="text-xs font-bold text-slate-700">
                  {doctor.rating}
                </span>
                <span className="text-xs text-slate-400 font-bold  tracking-tight">
                  ({doctor.reviewCount})
                </span>
              </div>

              <div
                className={`flex items-center justify-end gap-1.5 text-xs font-bold px-3 py-1 rounded-lg ${getAvailabilityColor()}`}
              >
                <BiTime size={14} />
                <span>Next: {doctor.nextAvailableMinutes ?? 0} min</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 mt-2">
            <div className="flex items-center gap-2">
              {doctor.consultationFee && (
                <div className="px-3 py-2 bg-slate-900 text-white rounded-lg">
                  <p className="text-[9px] font-bold text-white/50  tracking-normal leading-none mb-0.5">
                    Consultation Fee
                  </p>
                  <p className="text-xs font-bold tracking-tight leading-none">
                    R{doctor.consultationFee}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {onViewProfile && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewProfile(doctor.id);
                  }}
                  className="text-slate-400 text-xs font-bold  tracking-normal hover:text-primary transition-all active:scale-95"
                >
                  View Profile
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBook(doctor.id);
                }}
                className="bg-primary text-white px-6 py-3 rounded-lg text-xs font-bold  tracking-normal hover:bg-primary-dark transition-all active:scale-95"
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Legacy 3-dot menu if passed */}
      {setOpenMenuId && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenMenuId(openMenuId === doctor.id ? null : doctor.id);
          }}
          className="absolute top-4 right-4 p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-300 hover:text-primary"
        >
          <BiDotsVerticalRounded size={20} />
        </button>
      )}

      {/* ACTION MENU DROPDOWN */}
      {openMenuId === doctor.id && (
        <div className="absolute top-[60px] right-4 z-50 bg-white border border-slate-100 rounded-lg p-2 min-w-[180px] animate-in zoom-in-95 duration-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewProfile?.(doctor.id);
            }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-primary/5 text-slate-600 hover:text-primary transition-all text-xs font-bold"
          >
            <BiUser size={18} />
            <span>View Profile</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-primary/5 text-slate-600 hover:text-primary transition-all text-xs font-bold">
            <BiStar size={18} />
            <span>Rate Doctor</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBook(doctor.id);
            }}
            className="w-full flex items-center gap-3 px-3 py-3 mt-1 rounded-lg bg-primary text-white transition-all text-xs font-bold  tracking-normal"
          >
            <BiCalendarCheck size={18} />
            <span>Quick Book</span>
          </button>
        </div>
      )}
    </div>
  );
}
