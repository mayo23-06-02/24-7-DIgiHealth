"use client";
import React from "react";
import { toast } from "react-hot-toast";
import { BiTime } from "react-icons/bi";
import Button from "@/components/ui/Button";
import { Appointment } from "@/lib/hooks/useAppointments";

interface Props {
  appointment: Appointment;
  /** Called after a successful accept/decline (e.g. close the modal) */
  onResponded?: () => void;
}

/**
 * Shown when an appointment has a reschedule proposal awaiting the other
 * party's acceptance. The confirmed scheduledStart doesn't change until
 * accepted — see pendingReschedule on the Appointment type.
 */
export default function PendingRescheduleBanner({
  appointment,
  onResponded,
}: Props) {
  const pending = appointment.pendingReschedule;
  if (!pending) return null;

  const when = new Date(pending.proposedStart).toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const consultationId = appointment.consultationId || appointment.id;

  if (pending.proposedByMe) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
        <BiTime className="text-amber-600 shrink-0 mt-0.5" size={20} />
        <p className="text-sm font-semibold text-amber-800">
          You proposed moving this appointment to {when}. Waiting for the
          other party to accept.
        </p>
      </div>
    );
  }

  const respond = async (action: "accept" | "decline") => {
    try {
      const res = await fetch(`/api/bookings/${consultationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "accept"
            ? { acceptReschedule: true }
            : { declineReschedule: true },
        ),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(
          action === "accept"
            ? "New time confirmed"
            : "Reschedule declined — original time kept",
        );
        window.dispatchEvent(new Event("appointments:changed"));
        onResponded?.();
      } else {
        toast.error(json.error || "Unable to respond to reschedule");
      }
    } catch {
      toast.error("Unable to respond to reschedule");
    }
  };

  return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
      <div className="flex items-start gap-3">
        <BiTime className="text-amber-600 shrink-0 mt-0.5" size={20} />
        <p className="text-sm font-semibold text-amber-800">
          A new time has been proposed: {when}
        </p>
      </div>
      <div className="flex gap-3">
        <Button fullWidth variant="outline" onClick={() => respond("decline")}>
          Decline
        </Button>
        <Button fullWidth onClick={() => respond("accept")}>
          Accept new time
        </Button>
      </div>
    </div>
  );
}
