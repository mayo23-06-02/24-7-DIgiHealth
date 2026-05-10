"use client";

import React from "react";
import { BiMapPin, BiTime, BiChevronRight, BiStar } from "react-icons/bi";
import Button from "@/components/ui/Button";

interface BedAvailability {
  general: string;
  icu: string;
}

export interface Facility {
  id: string;
  name: string;
  type: "Public" | "Private" | "NGO";
  address: string;
  distance: string;
  waitTime: number; // minutes
  isOpen: boolean;
  rating: number;
  image: string;
  phone: string;
  emergencyPhone?: string;
  email: string;
  website: string;
  location: string;
  accreditations: string[];
  departments: string[];
  bedAvailability: BedAvailability;
  specialists: { name: string; specialty: string; image: string }[];
  languages: string[];
  insurance: string[];
  amenities: {
    wheelchair: boolean;
    parking: boolean;
    pharmacy: boolean;
    radiology: boolean;
    emergency247: boolean;
  };
  realTimeData: {
    occupancy: number; // percentage
    patientsWaiting: number;
    estTimeToSeeDoctor: number; // minutes
    ambulanceBayAvailable: boolean;
  };
}

interface FacilityCardProps {
  facility: Facility;
  onClick: (facility: Facility) => void;
  onBook?: (id: string) => void;
  onDirections?: (id: string) => void;
}

export default function FacilityCard({
  facility,
  onClick,
  onBook,
  onDirections,
}: FacilityCardProps) {
  const getWaitTimeColor = () => {
    if (facility.waitTime <= 15)
      return "bg-green-100 text-green-700 border-green-200";
    if (facility.waitTime <= 45)
      return "bg-gray-100 text-gray-700 border-gray-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  const getStatusColor = () => {
    return facility.isOpen ? "text-green-600" : "text-red-500";
  };

  const getTypeColor = () => {
    switch (facility.type) {
      case "Public":
        return "bg-blue-500 text-white";
      case "Private":
        return "bg-emerald-500 text-white";
      case "NGO":
        return "bg-gray-500 text-white";
      default:
        return "bg-slate-500 text-white";
    }
  };

  return (
    <div
      onClick={() => onClick(facility)}
      className="group bg-white/90 backdrop-blur-[12px] rounded-[24px] border border-slate-200/40 p-4 hover:-translate-y-1 hover: hover:shadow-primary/10 hover:border-primary/20 transition-all duration-300 cursor-pointer relative overflow-hidden active:scale-[0.98] focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
      role="button"
      aria-label={`View details for ${facility.name}`}
    >
      {/* Desktop Layout - Horizontal */}
      <div className="hidden md:flex gap-4 items-center">
        <div className="relative w-24 h-24 shrink-0 overflow-hidden rounded-2xl">
          <img
            src={facility.image}
            alt=""
            className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500"
          />
          <div className="absolute inset-0 bg-linear-to-t from-slate-900/40 to-transparent" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-lg font-bold text-slate-800 tracking-tight truncate group-hover:text-primary transition-colors font-grotesk">
                {facility.name}
              </h3>
              <span
                className={`px-2 py-1 rounded-full text-[9px] font-bold  tracking-normal shrink-0 ${getTypeColor()}`}
              >
                {facility.type}
              </span>
            </div>
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getWaitTimeColor()}`}
            >
              <BiTime size={14} />
              {facility.waitTime} min
            </div>
          </div>

          <p className="text-[13px] text-slate-500 truncate mb-3">
            {facility.address}
          </p>

          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-slate-600">
              <BiMapPin size={14} className="text-primary" />
              {facility.distance} km away
            </span>
            <span className={`flex items-center gap-1.5 ${getStatusColor()}`}>
              <span
                className={`w-2 h-2 rounded-full bg-current ${facility.isOpen ? "animate-pulse" : ""}`}
              />
              {facility.isOpen ? "Fully Operational" : "Closed Now"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 text-slate-300 group-hover:bg-primary group-hover:text-white group-hover:rotate-45 transition-all duration-500">
          <BiChevronRight size={24} />
        </div>
      </div>

      {/* Mobile Layout - Vertical */}
      <div className="flex md:hidden flex-col gap-4">
        <div className="relative w-full h-32 rounded-2xl overflow-hidden shadow-none">
          <img
            src={facility.image}
            alt=""
            className="w-full h-full object-cover"
          />
          <div
            className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold  tracking-normal shadow-none ${getTypeColor()}`}
          >
            {facility.type}
          </div>
          <div className="absolute top-3 right-3 flex items-center gap-1 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full shadow-none border border-white/20">
            <BiStar size={14} className="text-gray-500" fill="currentColor" />
            <span className="text-xs font-bold text-slate-800">
              {facility.rating}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-800 tracking-tight leading-tight font-grotesk">
            {facility.name}
          </h3>
          <p className="text-[13px] text-slate-500 truncate">
            {facility.address}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
          <span className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2 py-1 rounded-lg">
            <BiMapPin size={14} className="text-primary" />
            {facility.distance} km
          </span>
          <span
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${getWaitTimeColor()}`}
          >
            <BiTime size={14} />
            {facility.waitTime} min wait
          </span>
          <span className={`flex items-center gap-1.5 ${getStatusColor()}`}>
            <span
              className={`w-2 h-2 rounded-full bg-current ${facility.isOpen ? "animate-pulse" : ""}`}
            />
            {facility.isOpen ? "Open" : "Closed"}
          </span>
        </div>

        <div className="flex gap-3 mt-1">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onBook?.(facility.id);
            }}
            className="flex-1 py-3 text-xs font-bold  tracking-normal bg-primary hover:bg-primary-dark shadow-none shadow-primary/20"
          >
            Book
          </Button>
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onDirections?.(facility.id);
            }}
            className="flex-1 py-3 text-xs font-bold  tracking-normal text-slate-500 border-slate-200"
          >
            Directions
          </Button>
        </div>
      </div>

      {/* Hover Disclosure Badge */}
      <div className="absolute right-0 bottom-0 px-4 py-2 bg-primary/5 text-primary text-xs font-bold  tracking-normal transform translate-y-full translate-x-1/2 group-hover:translate-y-0 group-hover:translate-x-0 transition-transform duration-500 rounded-tl-2xl border-l border-t border-primary/10">
        {facility.bedAvailability.general !== "N/A"
          ? `${facility.bedAvailability.general} Gen Beds`
          : "Modern Clinical Center"}
      </div>
    </div>
  );
}
