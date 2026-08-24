"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useAppointmentAlert } from "@/components/context/AppointmentAlertContext";
import type { Appointment } from "@/lib/hooks/useAppointments";

const THRESHOLDS = [10, 5, 1] as const;
const POLL_MS = 20000;

export default function AppointmentAlertPoller() {
  const { user } = useAuthContext();
  const pathname = usePathname();
  const { activeAlert, showAlert, dismissAlert, hasShown, markShown } =
    useAppointmentAlert();

  /**
   * Clear a reminder the moment its own link lands the user in the lobby.
   *
   * New alerts were already suppressed while in the waiting area, but one
   * already on screen stayed there — so tapping "Join" left the reminder
   * hovering over the lobby it had just taken you to, still inviting you to
   * join something you were already in.
   */
  useEffect(() => {
    const inWaitingArea =
      !!pathname &&
      (pathname.includes("/lobby/") || pathname.includes("/messages"));
    if (inWaitingArea && activeAlert) dismissAlert();
  }, [pathname, activeAlert, dismissAlert]);
  const appointmentsRef = useRef<Appointment[]>([]);

  const role: "patient" | "practitioner" =
    user?.role === "practitioner" ? "practitioner" : "patient";

  // Poll the current user's appointments (reusing the same endpoints the
  // appointments pages use) so we always have fresh scheduled times.
  useEffect(() => {
    if (!user) return;
    const url =
      role === "practitioner"
        ? "/api/practitioner/appointments?tab=all"
        : "/api/patient/appointments";

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(url);
        const json = await res.json();
        if (!cancelled && json.success && Array.isArray(json.data)) {
          appointmentsRef.current = json.data;
        }
      } catch {
        /* silent — keep last known list */
      }
    };

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, role]);

  // Evaluate every second whether an appointment just crossed a reminder
  // threshold (10 / 5 / 1 minutes before start).
  useEffect(() => {
    if (!user) return;
    const inWaitingArea =
      !!pathname &&
      (pathname.includes("/lobby/") || pathname.includes("/messages"));

    const evaluate = () => {
      if (inWaitingArea || activeAlert) return;
      const now = new Date();

      for (const appt of appointmentsRef.current) {
        if (appt.status !== "scheduled") continue;
        const start = new Date(appt.scheduledStart);
        if (isNaN(start.getTime())) continue;
        const msLeft = start.getTime() - now.getTime();
        if (msLeft <= 0) continue; // already started — not a "reminder" anymore

        const minutesLeft = msLeft / 60000;
        for (const threshold of THRESHOLDS) {
          if (minutesLeft > threshold) continue;
          if (hasShown(appt.id, threshold)) continue;

          const contactId =
            role === "patient" ? appt.practitionerId : appt.patientId;
          if (!contactId) continue;

          markShown(appt.id, threshold);
          showAlert({
            appointmentId: appt.id,
            contactId,
            contactName:
              (role === "patient"
                ? appt.practitionerName
                : appt.patientName) || "Your appointment",
            contactAvatar:
              role === "patient" ? appt.practitionerAvatar : appt.patientAvatar,
            scheduledStart: appt.scheduledStart,
            threshold,
          });
          return; // one alert at a time
        }
      }
    };

    evaluate();
    const interval = setInterval(evaluate, 1000);
    return () => clearInterval(interval);
  }, [user, role, pathname, activeAlert, hasShown, markShown, showAlert]);

  return null;
}
