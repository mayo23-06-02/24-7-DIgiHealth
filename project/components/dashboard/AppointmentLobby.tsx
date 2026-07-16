"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { BiTime, BiArrowBack, BiCalendarEdit } from "react-icons/bi";
import { joinChatroomNow } from "@/lib/appointments/joinRoom";

interface Props {
  userType: "patient" | "practitioner";
}

function formatCountdown(msLeft: number): string {
  const total = Math.max(0, Math.ceil(msLeft / 1000));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export default function AppointmentLobby({ userType }: Props) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentId = params.id as string;

  const [contactId, setContactId] = useState(
    searchParams.get("contactId") || "",
  );
  const contactName =
    searchParams.get("name") ||
    (userType === "patient" ? "Your practitioner" : "Your patient");
  const contactAvatar = searchParams.get("avatar") || undefined;
  const [scheduledStart, setScheduledStart] = useState<Date | null>(() => {
    const raw = searchParams.get("start");
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  });
  const [loading, setLoading] = useState(!scheduledStart || !contactId);
  const [now, setNow] = useState(new Date());
  const [redirecting, setRedirecting] = useState(false);

  // Fallback: fetch appointment details when opened without a full query string
  // (e.g. a bookmarked/typed lobby URL).
  useEffect(() => {
    if (scheduledStart && contactId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/bookings/${appointmentId}`);
        const json = await res.json();
        if (cancelled) return;
        if (json.success && json.data) {
          setScheduledStart(new Date(json.data.scheduledStart));
          setContactId(
            userType === "patient"
              ? json.data.practitionerId
              : json.data.patientId,
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId, userType]);

  // Live 1s tick, matching the pattern used by useAppointments.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const enterChatroom = useCallback(() => {
    if (redirecting || !contactId) return;
    setRedirecting(true);
    void joinChatroomNow({ contactId, role: userType, router });
  }, [redirecting, contactId, userType, router]);

  // Auto-redirect the instant the scheduled start time is reached (or already past).
  useEffect(() => {
    if (loading || !scheduledStart || !contactId || redirecting) return;
    if (now >= scheduledStart) {
      enterChatroom();
    }
  }, [now, loading, scheduledStart, contactId, redirecting, enterChatroom]);

  const msLeft = scheduledStart ? scheduledStart.getTime() - now.getTime() : 0;

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6 border border-slate-100">
        {loading || redirecting ? (
          <>
            <div className="w-14 h-14 mx-auto rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <p className="text-slate-600 font-semibold">
              {redirecting
                ? "Starting your consultation…"
                : "Loading your appointment…"}
            </p>
          </>
        ) : (
          <>
            <Avatar name={contactName} src={contactAvatar} size="xl" className="mx-auto" />
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Waiting to begin
              </h2>
              <p className="text-slate-500 mt-1">
                Your consultation with{" "}
                <span className="font-semibold text-slate-700">
                  {contactName}
                </span>{" "}
                will begin automatically.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-lg py-6">
              <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                <BiTime size={14} />
                Starts in
              </div>
              <p className="text-4xl font-bold tabular-nums text-primary">
                {formatCountdown(msLeft)}
              </p>
            </div>

            <p className="text-xs text-slate-400">
              You&apos;re in the lobby — you&apos;ll be taken to the chatroom
              the moment your appointment starts. No need to refresh.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="ghost"
                icon={<BiArrowBack size={16} />}
                iconPosition="left"
                onClick={() => router.push(`/${userType}/appointments`)}
                fullWidth
              >
                Leave lobby
              </Button>
              <Button
                variant="outline"
                icon={<BiCalendarEdit size={16} />}
                iconPosition="left"
                onClick={() => router.push(`/${userType}/appointments`)}
                fullWidth
              >
                Reschedule instead
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
