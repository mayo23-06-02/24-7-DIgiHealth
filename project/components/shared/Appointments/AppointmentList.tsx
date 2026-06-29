import React from "react";
import AppointmentCard from "./AppointmentCard";
import { Appointment } from "@/lib/hooks/useAppointments";

interface Props {
  appointments: Appointment[];
  onJoin?: (id: string) => void;
  onEdit?: (id: string) => void;
  onCancel?: (id: string) => void;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  showActions?: boolean;
  compact?: boolean;
  emptyMessage?: string;
}

export default function AppointmentList({
  appointments,
  onJoin,
  onEdit,
  onCancel,
  onAccept,
  onDecline,
  showActions = true,
  compact = false,
  emptyMessage = "No appointments found.",
}: Props) {
  if (appointments.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400 font-medium">
        <p>{emptyMessage}</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {appointments.map((appt) => (
        <AppointmentCard
          key={appt.id}
          appointment={appt}
          onJoin={onJoin}
          onEdit={onEdit}
          onCancel={onCancel}
          onAccept={onAccept}
          onDecline={onDecline}
          showActions={showActions}
          compact={compact}
        />
      ))}
    </div>
  );
}
