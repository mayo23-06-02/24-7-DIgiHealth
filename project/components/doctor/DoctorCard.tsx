import React from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  BiUser,
  BiStar,
  BiMessageRounded,
  BiCalendarPlus,
} from "react-icons/bi";
import Avatar from "../ui/Avatar";

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
  schedule?: string[];
  slug?: string;
}

interface DoctorCardProps {
  doctor: Doctor;
  onBook: (id: string, e: React.MouseEvent) => void;
  onMessage: (id: string, e: React.MouseEvent) => void;
  onClick?: () => void;
  linkName?: string;
}

export default function DoctorCard({
  doctor,
  onBook,
  onMessage,
  onClick,
  linkName,
}: DoctorCardProps) {
  return (
    <Card
      className="flex flex-col w-full group relative overflow-hidden transition-all duration-500 hover: hover:shadow-primary/10 hover:-translate-y-1"
      onClick={onClick}
      variant="gradient"
    >
      {doctor.isOnline && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10 bg-emerald-50/80 backdrop-blur-md px-2 py-1 rounded-full border border-emerald-100">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-normal">
            Online
          </span>
        </div>
      )}

      <div className="flex flex-row items-center gap-4 mb-5">
        <Link
          href={`/patient/doctors/${doctor.id}`}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg  overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:ring-4 hover:ring-primary/10 transition-all  group-hover:scale-105 duration-300 relative z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {doctor.avatar ? (
            <img
              src={doctor.avatar}
              alt={doctor.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Avatar name={doctor.name} size="xl" />
          )}
        </Link>
        <div className="flex-1 flex flex-col items-start min-w-0">
          {linkName ? (
            <Link
              href={linkName}
              className="font-bold text-slate-800 text-lg leading-tight cursor-pointer hover:text-primary transition-all truncate block relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {doctor.name}
            </Link>
          ) : (
            <div className="font-bold text-slate-800 text-lg leading-tight cursor-pointer hover:text-primary transition-all truncate block relative z-10">
              {doctor.name}
            </div>
          )}
          <p className="text-xs text-primary font-semibold  tracking-normal mt-1 opacity-80">
            {doctor.specialisation}
          </p>
          <div className="flex items-center gap-1.5 mt-2 bg-slate-50 w-fit px-4 py-2 rounded-full">
            <BiStar size={12} className="fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold text-slate-700">
              {doctor.rating}{" "}
              <span className="text-slate-400 font-bold ml-0.5">
                ({doctor.reviewCount})
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6">
        {doctor.languages.map((lang) => (
          <span
            key={lang}
            className="text-   bg-slate-50 text-slate-400 px-2 py-1 rounded-md hover:bg-white hover:text-primary hover:border-primary/20 transition-all cursor-default"
          >
            {lang}
          </span>
        ))}
      </div>

      <div className="mt-auto space-y-4">
        <div className="flex justify-between items-center py-3 border-t border-slate-50/50">
          <span className="text-xs font-bold text-slate-400 uppercase ">
            Clinical Access
          </span>
          <span className="text-xs uppercase font-bold text-emerald-100 bg-emerald-500 px-3 py-1 rounded-full  border border-emerald-100 ">
            Premium
          </span>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => onMessage(doctor.id, e)}
            className="w-full relative z-10 !min-w-0"
            icon={<BiMessageRounded className="text-xl" />}
            iconPosition="left"
          >
            Message
          </Button>
          <Button
            size="sm"
            onClick={(e) => onBook(doctor.id, e)}
            className="w-full relative z-10 !min-w-0"
            icon={<BiCalendarPlus className="text-xl" />}
            iconPosition="left"
          >
            Book Now
          </Button>
        </div>
      </div>

      {/* Quick Schedule Preview */}
      {doctor.schedule && doctor.schedule.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-50/50 flex items-center justify-between">
          <span className="text-[9px] font-bold text-slate-400 uppercase t flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-primary/40"></span>
            Availability Today
          </span>
          <div className="flex gap-1.5 overflow-hidden">
            {doctor.schedule.slice(0, 3).map((time, idx) => (
              <span
                key={idx}
                className="text-[9px] font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg border border-primary/10 whitespace-nowrap"
              >
                {time}
              </span>
            ))}
            {doctor.schedule.length > 3 && (
              <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 whitespace-nowrap">
                +{doctor.schedule.length - 3}
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
