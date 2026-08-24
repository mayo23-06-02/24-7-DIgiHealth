"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useAppointmentAlert } from "@/components/context/AppointmentAlertContext";
import { serverNow, ensureClockSynced } from "@/lib/time/serverClock";
import { GRACE_AFTER_END_MS } from "@/lib/consultations/window";
import type { Appointment } from "@/lib/hooks/useAppointments";

const THRESHOLDS = [10, 5, 1] as const;
const POLL_MS = 20000;

export default function AppointmentAlertPoller() {
  const { user } = useAuthContext();
  const pathname = usePathname();
  const { activeAlert, showAlert, dismissAlert, hasShown, markShown } =
    useAppointmentAlert();

  /**
   * Clear a reminder the moment its own link lands the user in the session.
   *
   * New alerts were already suppressed while in the waiting area, but one
   * already on screen stayed there — so tapping "Join" left the reminder
   * hovering over the room it had just taken you to, still inviting you to
   * join something you were already in.
   */
  useEffect(() => {
    const inWaitingArea =
      !!pathname &&
      (pathname.includes("/consult/") ||
        pathname.includes("/lobby/") ||
        pathname.includes("/messages"));
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

    void ensureClockSynced();
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, role]);

  /**
   * Evaluate every second whether an appointment has crossed a reminder point.
   *
   * Time comes from `serverNow()`, not the device clock: two people whose
   * laptops disagree by a few minutes would otherwise be reminded — and would
   * arrive — at genuinely different moments.
   */
  useEffect(() => {
    if (!user) return;
    const inWaitingArea =
      !!pathname &&
      (pathname.includes("/consult/") ||
        pathname.includes("/lobby/") ||
        pathname.includes("/messages"));

    const evaluate = () => {
      if (inWaitingArea || activeAlert) return;
      const now = serverNow();

      for (const appt of appointmentsRef.current) {
        const start = new Date(appt.scheduledStart);
        if (isNaN(start.getTime())) continue;
        const msLeft = start.getTime() - now.getTime();

        const contactId =
          role === "patient" ? appt.practitionerId : appt.patientId;
        if (!contactId) continue;

        const contactName =
          (role === "patient" ? appt.practitionerName : appt.patientName) ||
          "Your appointment";
        const contactAvatar =
          role === "patient" ? appt.practitionerAvatar : appt.patientAvatar;

        const fire = (threshold: 10 | 5 | 1 | 0) => {
          markShown(appt.id, threshold);
          showAlert({
            appointmentId: appt.id,
            contactId,
            contactName,
            contactAvatar,
            scheduledStart: appt.scheduledStart,
            threshold,
          });
        };

        /*
         * A consultation already under way, that this user has not joined.
         *
         * Nothing rings for a scheduled session any more, which closed one gap
         * and opened another: someone who ignored the reminders had no way of
         * learning that the other party was sitting in the room waiting. This
         * is that nudge — it fires once, within the session's own window.
         */
        if (
          appt.status === "in_progress" &&
          msLeft <= 0 &&
          now.getTime() - start.getTime() < GRACE_AFTER_END_MS &&
          !hasShown(appt.id, 0)
        ) {
          fire(0);
          return;
        }

        if (appt.status !== "scheduled") continue;
        if (msLeft <= 0) continue; // past the start — handled above

        const minutesLeft = msLeft / 60000;
        for (const threshold of THRESHOLDS) {
          if (minutesLeft > threshold) continue;
          if (hasShown(appt.id, threshold)) continue;
          fire(threshold);
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
