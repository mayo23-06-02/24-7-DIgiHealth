"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useNavigate } from "@/hooks/useNavigate";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Star,
  Heart,
  Share2,
  CheckCircle2,
  CalendarPlus,
  MessageSquare,
  Globe,
  ShieldCheck,
  User,
  BadgeCheck,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import EmptyState from "@/components/ui/EmptyState";
import PageSkeleton from "@/components/ui/skeletons/PageSkeleton";

import BookingModal from "@/components/doctor/BookingModal";
import PatientFeedbackSection, {
  type ReviewItem,
} from "@/components/dashboard/patient/doctors/PatientFeedbackSection";
import { fetchDaySlots, todayDateString, periodOfDay } from "@/lib/booking";

type PeriodCounts = { Morning: number; Afternoon: number; Evening: number };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center lg:text-left">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">
        {label}
      </p>
      <p className="text-sm font-bold text-ink-700">{value}</p>
    </div>
  );
}

export default function DoctorProfilePage() {
  const { id } = useParams();
  const { navigate, beginNavigation } = useNavigate();
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [slotCounts, setSlotCounts] = useState<PeriodCounts>({
    Morning: 0,
    Afternoon: 0,
    Evening: 0,
  });
  const [slotsLoading, setSlotsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    fetch(`/api/practitioners/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setDoc(json.data);
        else setNotFound(true);
      })
      .catch((err) => {
        console.error("Failed to fetch doctor profile", err);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch("/api/patient/my-doctors?favorite=true")
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        if (Array.isArray(list)) {
          setIsFavorite(list.some((d: any) => d.id === id));
        }
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setSlotsLoading(true);
    fetchDaySlots({
      practitionerId: String(id),
      date: todayDateString(),
      durationMinutes: 30,
    })
      .then((result) => {
        if (cancelled || !result.success || !result.data?.slots) return;
        const counts: PeriodCounts = { Morning: 0, Afternoon: 0, Evening: 0 };
        for (const slot of result.data.slots) {
          if (slot.status !== "available") continue;
          counts[periodOfDay(slot.time)]++;
        }
        setSlotCounts(counts);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const toggleFavorite = useCallback(async () => {
    if (!id || favoriteBusy) return;
    const next = !isFavorite;
    setFavoriteBusy(true);
    setIsFavorite(next);
    try {
      const res = await fetch(`/api/patient/my-doctors/${id}`, {
        method: next ? "POST" : "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success(next ? "Added to favorites" : "Removed from favorites");
    } catch {
      setIsFavorite(!next);
      toast.error("Couldn't update favorites — please try again.");
    } finally {
      setFavoriteBusy(false);
    }
  }, [id, isFavorite, favoriteBusy]);

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Profile link copied to clipboard");
    } catch {
      toast.error("Couldn't copy the link");
    }
  }, []);

  const handleMessage = useCallback(async () => {
    if (!doc) return;
    beginNavigation(); // every branch below navigates; cover the fetch too
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practitionerId: doc.id, contactId: doc.id }),
      });
      const data = res.ok ? await res.json() : null;
      if (data?.conversationId) {
        navigate(`/patient/messages?chatId=${data.conversationId}`);
        return;
      }
    } catch {
      /* fall through */
    }
    navigate(`/patient/messages?doctorId=${doc.id}`);
  }, [doc, navigate, beginNavigation]);

  if (loading) return <PageSkeleton variant="detail" />;

  if (notFound || !doc) {
    return (
      <div className="max-w-lg mx-auto py-16">
        <EmptyState
          title="Doctor not found"
          description="This practitioner profile doesn't exist or is no longer available."
          actionLabel="Back to Doctors"
          onAction={() => navigate("/patient/doctors")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="flex items-center justify-between gap-4">
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/patient" },
            { label: "Doctors", href: "/patient/doctors" },
            { label: doc.name },
          ]}
        />
        <button
          onClick={() => navigate("/patient/doctors")}
          className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-ink-600 hover:text-primary transition-colors shrink-0"
        >
          <ArrowLeft size={14} />
          Back to Doctors
        </button>
      </div>

      {/* HERO */}
      <Card>
        <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
          <div className="relative shrink-0">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-lg overflow-hidden bg-surface-soft border border-border flex items-center justify-center">
              {doc.avatar ? (
                <img
                  src={doc.avatar}
                  alt={doc.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={56} className="text-ink-400" />
              )}
            </div>
            {doc.isOnline && (
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-surface border border-border rounded-full pl-2 pr-3 py-1 shadow-xs whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse shrink-0" />
                <span className="text-[10px] font-bold text-success-700">
                  Online now
                </span>
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0 w-full text-center lg:text-left space-y-4">
            <div>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-1.5">
                <h1 className="text-h1 font-bold text-ink-900 tracking-tight font-grotesk">
                  {doc.name}
                </h1>
                <BadgeCheck size={22} className="text-primary shrink-0" />
              </div>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                <Badge label={doc.specialisation} status="neutral" />
                {doc.hpcsaNumber ? (
                  <span className="text-xs font-bold text-ink-500">
                    HPCSA {doc.hpcsaNumber}
                  </span>
                ) : (
                  <Badge label="Verified Practitioner" status="info" size="sm" />
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-8 gap-y-3">
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={15}
                      className={
                        i < Math.round(doc.rating || 0)
                          ? "fill-accent stroke-accent"
                          : "fill-transparent stroke-border"
                      }
                    />
                  ))}
                </div>
                <span className="text-sm font-bold text-ink-900 tabular-nums">
                  {doc.rating?.toFixed(1) || "0.0"}
                </span>
                <span className="text-xs text-ink-500">
                  ({doc.reviewCount || 0})
                </span>
              </div>
              <Stat label="Experience" value={`${doc.experienceYears || 5}+ yrs`} />
              <Stat
                label="Languages"
                value={(doc.languages || ["English"]).join(", ")}
              />
              <Stat label="Fee" value={`R${doc.consultationFee ?? 750}`} />
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <Button
                onClick={() => setShowBooking(true)}
                icon={<CalendarPlus size={18} />}
                iconPosition="left"
              >
                Book Consultation
              </Button>
              <Button
                variant="outline"
                onClick={handleMessage}
                icon={<MessageSquare size={18} />}
                iconPosition="left"
              >
                Message
              </Button>
              <div className="flex items-center gap-2 lg:ml-auto">
                <button
                  onClick={toggleFavorite}
                  disabled={favoriteBusy}
                  aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                  aria-pressed={isFavorite}
                  className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all disabled:opacity-50 ${
                    isFavorite
                      ? "bg-danger-50 border-danger-500/30 text-danger-500"
                      : "border-border text-ink-500 hover:text-danger-500 hover:border-danger-500/30"
                  }`}
                >
                  <Heart size={18} className={isFavorite ? "fill-current" : ""} />
                </button>
                <button
                  onClick={handleShare}
                  aria-label="Copy profile link"
                  className="w-11 h-11 rounded-full border border-border text-ink-500 hover:text-primary hover:border-primary/30 flex items-center justify-center transition-all"
                >
                  <Share2 size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* DETAIL CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="space-y-6">
            <h2 className="text-h3 font-bold text-ink-900 font-grotesk">
              About
            </h2>
            <p className="text-sm text-ink-600 leading-relaxed">
              {doc.bio ||
                `${doc.name} is a dedicated ${(doc.specialisation || "clinical").toLowerCase()} specialist focused on patient-centered outcomes.`}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-border">
              <div className="space-y-3">
                <p className="text-label text-ink-500">Clinical Focus</p>
                <ul className="space-y-2.5">
                  {(
                    doc.clinicalFocus || [
                      "Preventative Care",
                      "Diagnostic Excellence",
                      "Systemic Recovery",
                    ]
                  ).map((item: string) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm font-medium text-ink-700"
                    >
                      <CheckCircle2
                        size={16}
                        className="text-success-500 shrink-0"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                <p className="text-label text-ink-500">Medical Aid Accepted</p>
                <div className="flex flex-wrap gap-2">
                  {(
                    doc.medicalAids || [
                      "Discovery",
                      "Bonitas",
                      "Momentum",
                      "Medishield",
                    ]
                  ).map((aid: string) => (
                    <Badge key={aid} label={aid} status="neutral" size="sm" />
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <PatientFeedbackSection
            practitionerId={String(id)}
            reviews={doc.reviews || []}
            onReviewsUpdated={(revs: ReviewItem[]) =>
              setDoc((prev: any) =>
                prev
                  ? {
                      ...prev,
                      reviews: revs,
                      reviewCount: revs.length,
                      rating: revs.length
                        ? revs.reduce((sum, r) => sum + (r.rating || 0), 0) /
                          revs.length
                        : prev.rating,
                    }
                  : prev,
              )
            }
          />
        </div>

        {/* SIDEBAR */}
        <div className="space-y-6">
          <Card className="space-y-4 bg-primary/[0.03] border-primary/15">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ShieldCheck size={20} />
              </div>
              <p className="text-sm font-bold text-ink-900">
                Billed to your plan
              </p>
            </div>
            <p className="text-xs text-ink-600 leading-relaxed">
              Consultations with {doc.name} are billed automatically under
              your DigiHealth subscription — no upfront card details needed.
            </p>
            <Button fullWidth size="sm" onClick={() => setShowBooking(true)}>
              Book Consultation
            </Button>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-h4 font-bold text-ink-900 font-grotesk">
                Today's Availability
              </h3>
              <Globe size={18} className="text-ink-400" />
            </div>
            <div className="space-y-2">
              {(["Morning", "Afternoon", "Evening"] as const).map((period) => (
                <div
                  key={period}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-soft"
                >
                  <span className="text-sm font-semibold text-ink-700">
                    {period}
                  </span>
                  {slotsLoading ? (
                    <span className="text-xs text-ink-400">…</span>
                  ) : (
                    <Badge
                      label={`${slotCounts[period]} slot${slotCounts[period] === 1 ? "" : "s"}`}
                      status={slotCounts[period] > 0 ? "success" : "neutral"}
                      size="sm"
                    />
                  )}
                </div>
              ))}
            </div>
            <Button fullWidth onClick={() => setShowBooking(true)}>
              Schedule Now
            </Button>
          </Card>
        </div>
      </div>

      <BookingModal
        isOpen={showBooking}
        onClose={() => setShowBooking(false)}
        doctor={doc}
      />
    </div>
  );
}
