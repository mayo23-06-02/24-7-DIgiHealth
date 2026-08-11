import React from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Avatar from "../ui/Avatar";
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
  isFavorite?: boolean;
  bio?: string;
}

interface DoctorCardProps {
  doctor: Doctor;
  onBook: (id: string, e: React.MouseEvent) => void;
  onMessage: (id: string, e: React.MouseEvent) => void;
  onClick?: () => void;
  linkName?: string;
  onFavoriteChange?: (doctorId: string, isFavorite: boolean) => void;
}

export default function DoctorCard({
  doctor,
  onBook,
  onMessage,
  onClick,
  linkName,
  onFavoriteChange,
}: DoctorCardProps) {
  const visibleLanguages = doctor.languages?.slice(0, 2) || [];
  const extraLanguages = (doctor.languages?.length || 0) - visibleLanguages.length;
  const bio = doctor.bio || (doctor as any).about;

  return (
    <Card

      className="flex flex-col w-full h-full justify-between group relative overflow-hidden p-3 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      onClick={onClick}
    >
      <div className="flex flex-row items-center gap-2 mb-4 ">
        <Link
          href={`/patient/doctors/${doctor.id}`}
          className="w-11 h-11 rounded-lg overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:ring-4 hover:ring-primary/10 transition-all group-hover:scale-105 duration-300 relative z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {doctor.avatar ? (
            <img
              src={doctor.avatar}
              alt={doctor.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Avatar name={doctor.name} size="md" />
          )}
        </Link>
        <div className="flex-1 flex flex-col items-start min-w-0">
          {linkName ? (
            <Link
              href={linkName}
              className="font-bold text-ink-900 text-sm leading-tight cursor-pointer hover:text-primary transition-all truncate block w-full relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="flex items-center gap-1 min-w-0">
                <span className="truncate text-lg font-semibold">{doctor.name}</span>
                <BadgeCheck size={14} className="text-primary shrink-0" />
              </span>
            </Link>
          ) : (
            <span className="text-ink-900 font-bold text-sm flex items-center gap-1 min-w-0 w-full">
              <span className="truncate">{doctor.name}</span>
              <BadgeCheck size={14} className="text-primary shrink-0" />
            </span>
          )}
          <p className="text-sm text-primary font-semibold tracking-normal truncate w-full">
            {doctor.specialisation}
          </p>
        </div>
      </div>

      {bio && (
        <div className="relative group/bio mb-4">
          <p className="text-sm text-ink-600  line-clamp-3 cursor-default">
            {bio}
          </p>
          <div className="invisible opacity-0 group-hover/bio:visible group-hover/bio:opacity-100 transition-opacity duration-200 absolute left-0 right-0 top-full mt-1 z-20 bg-surface border border-border rounded-lg shadow-lg p-3 max-h-32 overflow-y-auto">
            <p className="text-sm text-ink-600  line-clamp-6">
              {bio}
            </p>
          </div>
        </div>
      )}



      <div className="mt-auto space-y-2">
        <div className="flex justify-between items-center py-4 border-t border-border">
          <div className="flex flex-wrap gap-1 ">
            {visibleLanguages.map((lang) => (
              <span
                key={lang}
                className="text-[10px] font-semibold bg-surface-soft text-ink-600 px-2 py-0.5 rounded-full hover:bg-primary/5 hover:text-primary transition-all cursor-default truncate max-w-[80px]"
              >
                {lang}
              </span>
            ))}
            {extraLanguages > 0 && (
              <span className="text-[10px] font-semibold bg-surface-soft text-ink-600 px-2 py-0.5 rounded-full">
                +{extraLanguages}
              </span>
            )}
          </div>
          <span className="text-[10px] flex items-center gap-1">
            <div className="flex -space-x-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-2.5 h-2.5 ${i < Math.floor(doctor.rating || 0)
                    ? "fill-accent stroke-accent"
                    : "fill-transparent stroke-border"
                    }`}
                />
              ))}
            </div>
            <span className="font-bold text-ink-900 ml-0.5 tabular-nums">
              {doctor.rating?.toFixed(1) || "0.0"}
            </span>
          </span>
        </div>

        <div className="flex  gap-1.5">
          <Button
            variant="outline"
            size="sm"
            fullWidth
            onClick={(e) => onMessage(doctor.id, e)}
            className="relative z-10 min-w-0 px-2"
            iconPosition="left"
          >
            Message
          </Button>
          <Button
            size="sm"
            fullWidth
            onClick={(e) => onBook(doctor.id, e)}
            className="relative z-10 min-w-0 px-2"
            iconPosition="left"
          >
            Book Now
          </Button>
        </div>
      </div>

      {/* Quick Schedule Preview */}
      {doctor.schedule && doctor.schedule.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border flex items-center justify-between gap-1 min-w-0">
          <span className="text-[9px] text-ink-600 uppercase tracking-wide flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
            Today
          </span>
          <div className="flex gap-1 overflow-hidden min-w-0">
            {doctor.schedule.slice(0, 2).map((time, idx) => (
              <span
                key={idx}
                className="text-[9px] text-primary bg-primary/5 px-1.5 py-0.5 rounded-md border border-primary/10 whitespace-nowrap"
              >
                {time}
              </span>
            ))}
            {doctor.schedule.length > 2 && (
              <span className="text-[9px] text-ink-600 bg-surface-soft px-1.5 py-0.5 rounded-md border border-border whitespace-nowrap">
                +{doctor.schedule.length - 2}
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
