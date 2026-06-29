import React from "react";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { BiVideo, BiChat, BiTime, BiCalendar } from "react-icons/bi";
import { Appointment } from "@/lib/hooks/useAppointments";

interface Props {
  appointment: Appointment;
  onJoin?: (id: string) => void;
  onEdit?: (id: string) => void;
  onCancel?: (id: string) => void;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  onClick?: (appointment: Appointment) => void;
  showActions?: boolean;
  compact?: boolean;
}

export default function AppointmentCard({
  appointment,
  onJoin,
  onEdit,
  onCancel,
  onAccept,
  onDecline,
  onClick,
  showActions = true,
  compact = false,
}: Props) {
  const start = new Date(appointment.scheduledStart);
  const dateStr = start.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeStr = start.toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isUpcoming =
    appointment.computedStatus === "upcoming" ||
    appointment.computedStatus === "requests";
  const isOngoing = appointment.computedStatus === "ongoing";

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-slate-100 rounded-xl bg-white hover:shadow-md transition-shadow cursor-pointer ${compact ? "py-3" : ""}`}
      onClick={() => onClick?.(appointment)}
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <Avatar
          name={appointment.patientName}
          src={appointment.patientAvatar}
          size={compact ? "sm" : "md"}
        />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-800 text-sm truncate">
            {appointment.patientName}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <BiCalendar size={12} /> {dateStr}
            </span>
            <span className="flex items-center gap-1">
              <BiTime size={12} /> {timeStr}
            </span>
            <span className="flex items-center gap-1">
              {appointment.type === "video" ? (
                <BiVideo size={14} />
              ) : (
                <BiChat size={14} />
              )}
              {appointment.type || "video"}
            </span>
          </div>
          {appointment.reason && (
            <p className="text-xs text-slate-500 truncate mt-1">
              {appointment.reason}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Badge
          label={appointment.computedStatus || appointment.status}
          status={
            isUpcoming
              ? "warning"
              : isOngoing
                ? "info"
                : appointment.computedStatus === "missed"
                  ? "error"
                  : appointment.computedStatus === "cancelled"
                    ? "error"
                    : "success"
          }
          variant="solid"
          className="uppercase text-[10px] font-bold"
        />

        {showActions && (
          <div className="flex gap-1.5">
            {appointment.computedStatus === "requests" && (
              <>
                <Button
                  size="sm"
                  className="text-xs font-bold px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={() => onAccept?.(appointment.id)}
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  className="text-xs font-bold px-3 py-1.5 bg-rose-50 text-rose-500 hover:bg-rose-100"
                  onClick={() => onDecline?.(appointment.id)}
                >
                  Decline
                </Button>
              </>
            )}
            {(isUpcoming || isOngoing) && (
              <Button
                size="sm"
                className="text-xs font-bold px-3 py-1.5 bg-primary text-white hover:bg-primary/95"
                onClick={() => onJoin?.(appointment.id)}
              >
                {isOngoing ? "Join" : "Join Room"}
              </Button>
            )}
            {isUpcoming && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs font-bold px-3 py-1.5"
                  onClick={() => onEdit?.(appointment.id)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs font-bold px-3 py-1.5 text-rose-500 hover:bg-rose-50"
                  onClick={() => onCancel?.(appointment.id)}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
