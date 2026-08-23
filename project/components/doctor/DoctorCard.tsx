"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Avatar from "../ui/Avatar";
import { Star, BadgeCheck } from "lucide-react";
import { fetchDaySlots, todayDateString, type BookingSlot } from "@/lib/booking";

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
  /** Omit on public/marketing pages — Book falls back to a /register link. */
  onBook?: (id: string, e: React.MouseEvent) => void;
  /** Omit on public/marketing pages — hides the Message action entirely. */
  onMessage?: (id: string, e: React.MouseEvent) => void;
  onClick?: () => void;
  linkName?: string;
  onFavoriteChange?: (doctorId: string, isFavorite: boolean) => void;
  /** "From R250 · Get Access" band — for marketing pages only. Platform
   * dashboards default this to false since the patient already has access. */
  showPrice?: boolean;
}

export default function DoctorCard({
  doctor,
  onBook,
  onMessage,
  onClick,
  linkName,
  showPrice = false,
}: DoctorCardProps) {
  const visibleLanguages = doctor.languages?.slice(0, 2) || [];
  const extraLanguages = (doctor.languages?.length || 0) - visibleLanguages.length;
  const bio = doctor.bio || (doctor as any).about;
  const isHighlyRated = (doctor.rating || 0) >= 4.7;
  const isLoyal = (doctor.reviewCount || 0) >= 50;

  // Real open slots for today, computed from actual booked consultations
  // (see lib/booking/slots.ts) — the same source BookingModal uses, so
  // these times are never fabricated. Unlike BookingModal's TimeSlotPicker
  // (a real picker — click a slot to select it), this row is read-only: it
  // exists purely to show at-a-glance immediate availability. The one
  // action on this card is the Book button, which for a new/anonymous
  // visitor routes to /register — booking itself happens after sign-up.
  const today = todayDateString();
  const isFuture = (time: string) => new Date(`${today}T${time}:00`).getTime() > Date.now();

  const [openSlots, setOpenSlots] = useState<BookingSlot[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchDaySlots({ practitionerId: doctor.id, date: today }).then((result) => {
      if (cancelled) return;
      if (result.success && result.data?.slots) {
        setOpenSlots(
          result.data.slots.filter((s) => s.available && isFuture(s.time)).slice(0, 6),
        );
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctor.id, today]);

  // Re-filter every minute so a slot disappears the moment its time passes,
  // instead of lingering visible until the next full refetch.
  const visibleSlots = openSlots.filter((s) => isFuture(s.time));
  useEffect(() => {
    if (openSlots.length === 0) return;
    const id = setInterval(() => {
      setOpenSlots((prev) => prev.filter((s) => isFuture(s.time)));
    }, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSlots.length]);

  const nameContent = (
    <span className="flex items-center gap-1 min-w-0">
      <span>{doctor.name}</span>
      <BadgeCheck size={16} className="text-primary shrink-0" />
    </span>
  );

  return (
    <Card
      className="flex flex-col w-full h-full justify-between group relative overflow-hidden p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      onClick={onClick}
    >
      {/* Avatar + name/specialty/rating */}
      <div className="flex flex-row items-start gap-3 mb-3">
        <Link
          href={`/patient/doctors/${doctor.id}`}
          className="w-14 h-14 rounded-full overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:ring-4 hover:ring-primary/10 transition-all group-hover:scale-105 duration-300 relative z-10 border-2 border-white shadow-xs"
          onClick={(e) => e.stopPropagation()}
        >
          {doctor.avatar ? (
            <img src={doctor.avatar} alt={doctor.name} className="w-full h-full object-cover" />
          ) : (
            <Avatar name={doctor.name} size="md" />
          )}
        </Link>
        <div className="flex-1 flex flex-col items-start min-w-0">
          {linkName ? (
            <Link
              href={linkName}
              className="font-semibold text-ink-900 text-base leading-snug cursor-pointer hover:text-primary transition-all block w-full relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {nameContent}
            </Link>
          ) : (
            <span className="text-ink-900 font-semibold text-base leading-snug flex items-center gap-1 min-w-0 w-full">
              {nameContent}
            </span>
          )}
          <p className="text-sm text-primary font-semibold tracking-normal truncate w-full mt-0.5 mb-1">
            {doctor.specialisation}
          </p>
          <span className="flex items-center gap-1 text-xs">
            <div className="flex -space-x-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < Math.floor(doctor.rating || 0)
                      ? "fill-accent stroke-accent"
                      : "fill-transparent stroke-border"
                  }`}
                />
              ))}
            </div>
            <span className="font-bold text-ink-900 ml-0.5 tabular-nums">
              {doctor.rating?.toFixed(1) || "0.0"}
            </span>
            <span className="text-ink-400">({doctor.reviewCount || 0})</span>
          </span>
        </div>
      </div>

      {/* Real-data-derived trust badges */}
      {(doctor.isOnline || isHighlyRated || isLoyal) && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {doctor.isOnline && (
            <span className="text-[11px] font-semibold bg-success-50 text-success-700 px-2.5 py-1 rounded-full">
              Available today
            </span>
          )}
          {isHighlyRated && (
            <span className="text-[11px] font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
              Highly rated
            </span>
          )}
          {isLoyal && (
            <span className="text-[11px] font-semibold bg-accent/20 text-ink-900 px-2.5 py-1 rounded-full">
              Loyal patients
            </span>
          )}
        </div>
      )}

      {bio && (
        <div className="mb-3">
          <p className="text-sm text-ink-600 bg-surface-soft rounded-lg px-3 py-2.5 line-clamp-3 cursor-default">
            "{bio}"
          </p>
        </div>
      )}

      {/* Next available + price, side by side */}
      {(doctor.nextAvailable || showPrice) && (
        <div className="flex items-start justify-between gap-3 mb-3">
          {doctor.nextAvailable && (
            <div>
              <p className="text-[11px] text-ink-400 font-medium">Next available</p>
              <p className="text-sm font-bold text-ink-900">{doctor.nextAvailable}</p>
            </div>
          )}
          {showPrice && (
            <div className="text-right">
              <p className="text-sm font-bold text-primary leading-tight">R250/mo</p>
              <p className="text-[11px] text-ink-400 leading-tight">Get access</p>
            </div>
          )}
        </div>
      )}

      {/* Immediate availability — read-only, not clickable. Booking happens
          via the Book button below (register first, then choose a time). */}
      {visibleSlots.length > 0 && (
        <div className="mb-3">
          <div className="grid grid-cols-3 gap-1.5">
            {visibleSlots.map((slot, i) => (
              <div
                key={slot.time}
                className={`text-xs font-semibold text-center px-2 py-1.5 rounded-lg border ${
                  i === 0
                    ? "border-primary/40 bg-primary/5 text-primary"
                    : "border-border bg-white text-ink-600"
                }`}
              >
                {slot.label}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto space-y-3">
        <div className="flex items-center justify-between py-2.5 border-t border-border">
          <div className="flex flex-wrap gap-1">
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
        </div>

        <div className="flex gap-1.5">
          {onMessage && (
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
          )}
          {onBook ? (
            <Button
              size="sm"
              fullWidth
              onClick={(e) => onBook(doctor.id, e)}
              className="relative z-10 min-w-0 px-2"
              iconPosition="left"
            >
              Book Now
            </Button>
          ) : (
            <Link href="/register" className="w-full relative z-10" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" fullWidth className="min-w-0 px-2" iconPosition="left">
                Book Visit
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
