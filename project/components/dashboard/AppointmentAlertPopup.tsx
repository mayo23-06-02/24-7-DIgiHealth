"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BiTime, BiX } from "react-icons/bi";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useAppointmentAlert } from "@/components/context/AppointmentAlertContext";
import Avatar from "@/components/ui/Avatar";
import { goToAppointmentRoom } from "@/lib/appointments/joinRoom";

function formatCountdown(msLeft: number): string {
  const total = Math.max(0, Math.ceil(msLeft / 1000));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export default function AppointmentAlertPopup() {
  const { activeAlert, dismissAlert } = useAppointmentAlert();
  const { user } = useAuthContext();
  const router = useRouter();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!activeAlert) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [activeAlert]);

  if (!activeAlert || !user) return null;

  const role: "patient" | "practitioner" =
    user.role === "practitioner" ? "practitioner" : "patient";
  const start = new Date(activeAlert.scheduledStart);
  const msLeft = start.getTime() - now.getTime();
  const startTimeStr = start.toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  });
  /** Threshold 0 means the session is already running, not that it is imminent. */
  const underway = activeAlert.threshold === 0;

  const handleWaitInLobby = () => {
    const alert = activeAlert;
    dismissAlert();
    goToAppointmentRoom({
      appointmentId: alert.appointmentId,
      contactAvatar: alert.contactAvatar,
      role,
      router,
    });
  };

  return (
    <div className="fixed top-4 right-4 z-50 w-80 bg-white rounded-lg shadow-2xl border border-slate-200 p-4 animate-in slide-in-from-right-8 duration-300">
      <div className="flex items-start gap-3">
        <Avatar
          name={activeAlert.contactName}
          src={activeAlert.contactAvatar}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold tracking-wider text-primary uppercase">
            {underway ? "Consultation under way" : "Upcoming appointment"}
          </p>
          <p className="truncate text-sm font-semibold text-slate-800">
            {activeAlert.contactName}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {underway ? `Started at ${startTimeStr}` : `Starts at ${startTimeStr}`}
          </p>
        </div>
        <button
          onClick={dismissAlert}
          className="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
        >
          <BiX size={18} />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 bg-slate-50 border border-slate-100 rounded-lg py-2">
        <BiTime size={14} className="text-primary" />
        <span className="text-lg font-bold tabular-nums text-slate-800">
          {underway ? "Waiting for you" : formatCountdown(msLeft)}
        </span>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={dismissAlert}
          className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Not now
        </button>
        <button
          onClick={handleWaitInLobby}
          className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {underway ? "Join now" : "Wait in Lobby"}
        </button>
      </div>
    </div>
  );
}
