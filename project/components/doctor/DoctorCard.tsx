import React from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Avatar from "../ui/Avatar";
import Badge from "@/components/ui/Badge";
import { MessageSquare, CalendarPlus, Star, BadgeCheck } from "lucide-react";

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
      className="flex flex-col w-full h-full justify-between group relative overflow-hidden transition-all duration-500 hover: hover:-translate-y-1"
      onClick={onClick}
    >
      {doctor.isOnline && (
        <div className="absolute top-4 right-4 z-10">
          <Badge label="Online" status="success" size="sm" dot />
        </div>
      )}

      <div className="flex flex-row items-center gap-4 mb-5">
        <Link
          href={`/patient/doctors/${doctor.id}`}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:ring-4 hover:ring-primary/10 transition-all group-hover:scale-105 duration-300 relative z-10"
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
              className="font-bold text-ink-900 text-lg leading-tight cursor-pointer hover:text-primary transition-all truncate block relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="flex items-center gap-1.5">
                {doctor.name}
                <BadgeCheck size={18} className="text-primary shrink-0" />
              </span>
            </Link>
          ) : (
            <span className="text-ink-900 font-bold text-lg flex items-center gap-1.5">
              {doctor.name}
              <BadgeCheck size={18} className="text-primary shrink-0" />
            </span>
          )}
          <p className="text-sm text-primary font-semibold tracking-normal mt-1">
            {doctor.specialisation}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6">
        {doctor.languages?.map((lang) => (
          <span
            key={lang}
            className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full hover:bg-primary/5 hover:text-primary transition-all cursor-default"
          >
            {lang}
          </span>
        ))}
      </div>

      <div className="mt-auto space-y-4">
        <div className="flex justify-between items-center py-3 border-t border-slate-100">
          <span className="text-sm text-slate-500 font-medium">Premium Access</span>
          <span className="text-xs flex items-center gap-1.5">
            <div className="flex -space-x-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  fill={i < Math.floor(doctor.rating || 0) ? "#FFDE42" : "transparent"}
                  stroke={i < Math.floor(doctor.rating || 0) ? "#FFDE42" : "#cbd5e1"}
                  className="w-3.5 h-3.5"
                />
              ))}
            </div>
            <span className="font-bold text-ink-900 ml-0.5 tabular-nums">
              {doctor.rating?.toFixed(1) || "0.0"}
            </span>
          </span>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
          <Button
            variant="outline"
            size="sm"
            fullWidth
            onClick={(e) => onMessage(doctor.id, e)}
            className="relative z-10 !min-w-0"
            icon={<MessageSquare size={16} />}
            iconPosition="left"
          >
            Message
          </Button>
          <Button
            size="sm"
            fullWidth
            onClick={(e) => onBook(doctor.id, e)}
            className="relative z-10 !min-w-0"
            icon={<CalendarPlus size={16} />}
            iconPosition="left"
          >
            Book Now
          </Button>
        </div>
      </div>

      {/* Quick Schedule Preview */}
      {doctor.schedule && doctor.schedule.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
            Availability Today
          </span>
          <div className="flex gap-1.5 overflow-hidden">
            {doctor.schedule.slice(0, 3).map((time, idx) => (
              <span
                key={idx}
                className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg border border-primary/10 whitespace-nowrap"
              >
                {time}
              </span>
            ))}
            {doctor.schedule.length > 3 && (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 whitespace-nowrap">
                +{doctor.schedule.length - 3}
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
