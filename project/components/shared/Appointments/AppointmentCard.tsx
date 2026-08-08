"use client";
import React, { useState } from "react";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import {
  BiVideo,
  BiChat,
  BiTime,
  BiCalendar,
  BiDotsVerticalRounded,
} from "react-icons/bi";
import { Appointment } from "@/lib/hooks/useAppointments";
import PendingRescheduleBanner from "./PendingRescheduleBanner";

interface Props {
  appointment: Appointment;
  onJoin?: (id: string) => void;
  onEdit?: (id: string) => void;
  onCancel?: (id: string) => void;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  onRebook?: (id: string) => void;
  onClick?: (appointment: Appointment) => void;
  showActions?: boolean;
  compact?: boolean;
  userType?: "patient" | "practitioner";
}

export default function AppointmentCard({
  appointment,
  onJoin,
  onEdit,
  onCancel,
  onAccept,
  onDecline,
  onRebook,
  onClick,
  showActions = true,
  compact = false,
  userType = "practitioner",
}: Props) {
  const start = new Date(appointment.scheduledStart);
  const dateStr = start.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const dayNameStr = start.toLocaleDateString("en-ZA", { weekday: "short" });
  const dayMonthStr = start.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
  });

  const timeStr = start.toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const end = appointment.scheduledEnd
    ? new Date(appointment.scheduledEnd)
    : new Date(start.getTime() + 30 * 60000);
  const endTimeStr = end.toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isUpcoming =
    appointment.computedStatus === "upcoming" ||
    appointment.computedStatus === "requests";
  const isOngoing = appointment.computedStatus === "ongoing";

  const [showMenu, setShowMenu] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const now = new Date();
  const tenMinsBefore = new Date(start.getTime() - 10 * 60000);
  const isAccepted =
    appointment.status === "scheduled" ||
    appointment.status === "in_progress" ||
    appointment.status === "ongoing";
  const isJoinable = isAccepted && now >= tenMinsBefore && now <= end;
  const joinLabel = now < start ? "Enter Lobby" : "Join Room";

  const isRecipient = appointment.requestedTo
    ? (userType === "patient" && appointment.requestedTo === appointment.patientId) ||
      (userType === "practitioner" && appointment.requestedTo === appointment.practitionerId)
    : userType === "practitioner"; // legacy default

  const isMissed =
    appointment.computedStatus === "missed" ||
    appointment.computedStatus === "cancelled";

  // Accept is a two-party handshake: only whoever didn't make the last move
  // (the original request, or a later reschedule proposal) can accept it —
  // regardless of role. Everyone else can only reschedule or cancel.
  const isRequestStage = appointment.computedStatus === "requests";
  const canAcceptNow =
    isRequestStage && appointment.canAccept === true && !appointment.pendingReschedule;

  let dateBgClass = "bg-secondary/30";
  let topTextClass = "text-white";
  if (isMissed) {
    dateBgClass = "bg-red-300";
  } else if (isOngoing) {
    dateBgClass = "bg-green-300";
  } else if (isUpcoming) {
    dateBgClass = "bg-accent/30";
    topTextClass = "text-slate-800";
  }

  return (
    <>
      <div
        onClick={() => {
          if (onClick) onClick(appointment);
          else setShowDetails(true);
        }}
        className={`relative flex items-center gap-4 p-2 border border-slate-100 rounded-lg bg-white hover: transition-shadow cursor-pointer ${showMenu ? "z-50" : "z-0"} ${compact ? "py-3" : ""}`}
      >
        <div className="flex items-center gap-4 min-w-0 flex-1 h-full">
          <div
            className={`w-24 gap-1 shrink-0 ${dateBgClass} rounded-md flex flex-col items-center justify-center py-2 px-1 text-center`}
          >
            <span
              className={`text-xs ${topTextClass} uppercase tracking-wider`}
            >
              {dayNameStr}
            </span>
            <span className="text-lg font-semibold text-slate-800 leading-none my-1">
              {dayMonthStr}
            </span>
            <span className="text-[10px] font-semibold text-slate-600 whitespace-nowrap">
              {timeStr} - {endTimeStr}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-700 text-md truncate">
              {userType === "patient" 
                ? appointment.practitionerName || appointment.patientName 
                : appointment.patientName}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
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

        <div className="flex items-center gap-3 shrink-0 relative z-10">
          {appointment.pendingReschedule && (
            <Badge
              label={
                appointment.pendingReschedule.proposedByMe
                  ? "Reschedule sent"
                  : "New time proposed"
              }
              status={
                appointment.pendingReschedule.proposedByMe
                  ? "neutral"
                  : "warning"
              }
              size="sm"
              className="hidden sm:inline-flex uppercase"
            />
          )}
          {showActions && (
            <div className="relative flex items-center">
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
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className=" rounded-full px-2 py-1 hover:scale-105  text-slate-500 transition-colors"
              >
                <BiDotsVerticalRounded size={20} />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                    }}
                  />
                  <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg  border border-slate-100 z-50 py-1 flex flex-col overflow-hidden">
                    <button
                      className="w-full text-left px-4 p-2 text-sm hover:bg-slate-50 text-slate-700 font-medium border-b border-slate-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDetails(true);
                        setShowMenu(false);
                      }}
                    >
                      View Details
                    </button>
                    {/* Only whoever isn't waiting on the other party can accept/decline */}
                    {isRequestStage && canAcceptNow && (
                      <>
                        <button
                          className="w-full text-left px-4 p-2 text-sm hover:bg-slate-50 text-emerald-600 font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAccept?.(appointment.id);
                            setShowMenu(false);
                          }}
                        >
                          Accept
                        </button>
                        <button
                          className="w-full text-left px-4 p-2 text-sm hover:bg-slate-50 text-rose-500 font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDecline?.(appointment.id);
                            setShowMenu(false);
                          }}
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {isRequestStage && !canAcceptNow && (
                      <>
                        <button
                          className="w-full text-left px-4 p-2 text-sm hover:bg-slate-50 text-slate-700 font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit?.(appointment.id);
                            setShowMenu(false);
                          }}
                        >
                          Reschedule
                        </button>
                        <button
                          className="w-full text-left px-4 p-2 text-sm hover:bg-slate-50 text-rose-500 font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCancel?.(appointment.id);
                            setShowMenu(false);
                          }}
                        >
                          Cancel request
                        </button>
                      </>
                    )}
                    {isJoinable && (
                      <button
                        className="w-full text-left px-4 p-2 text-sm hover:bg-slate-50 text-primary font-bold"
                        onClick={(e) => {
                          e.stopPropagation();
                          onJoin?.(appointment.id);
                          setShowMenu(false);
                        }}
                      >
                        {joinLabel}
                      </button>
                    )}
                    {appointment.computedStatus === "upcoming" && (
                      <>
                        <button
                          className="w-full text-left px-4 p-2 text-sm hover:bg-slate-50 text-slate-700 font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit?.(appointment.id);
                            setShowMenu(false);
                          }}
                        >
                          {userType === "patient" ? "Reschedule" : "Edit"}
                        </button>
                        {userType === "practitioner" && (
                          <button
                            className="w-full text-left px-4 p-2 text-sm hover:bg-slate-50 text-slate-700 font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRebook?.(appointment.id);
                              setShowMenu(false);
                            }}
                          >
                            Re-book
                          </button>
                        )}
                        <button
                          className="w-full text-left px-4 p-2 text-sm hover:bg-slate-50 text-rose-500 font-medium border-t border-slate-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCancel?.(appointment.id);
                            setShowMenu(false);
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {appointment.computedStatus !== "requests" &&
                      !isJoinable &&
                      appointment.computedStatus !== "upcoming" && (
                        <div className="px-4 py-2 text-xs text-slate-400 italic">
                          No other actions
                        </div>
                      )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title="Appointment Details"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar
              name={userType === "patient" ? appointment.practitionerName || appointment.patientName : appointment.patientName}
              src={userType === "patient" ? appointment.practitionerAvatar : appointment.patientAvatar}
              size="lg"
            />
            <div>
              <h4 className="text-xl font-bold text-slate-900">
                {userType === "patient" ? appointment.practitionerName || appointment.patientName : appointment.patientName}
              </h4>
              <p className="text-sm text-slate-500 capitalize">
                {appointment.type} Consultation
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Date & Time
              </span>
              <p className="font-bold text-slate-800">
                {dayNameStr}, {dayMonthStr}
              </p>
              <p className="text-sm text-slate-600">
                {timeStr} - {endTimeStr}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Status
              </span>
              <Badge
                label={appointment.computedStatus || appointment.status}
                status={
                  isUpcoming
                    ? "warning"
                    : isOngoing
                      ? "info"
                      : appointment.computedStatus === "missed" ||
                          appointment.computedStatus === "cancelled"
                        ? "error"
                        : "success"
                }
                variant="solid"
                className="uppercase"
              />
            </div>
          </div>

          <PendingRescheduleBanner
            appointment={appointment}
            onResponded={() => setShowDetails(false)}
          />

          {appointment.reason && (
            <div>
              <h5 className="text-sm font-semibold text-slate-900 mb-2">
                Reason for Visit
              </h5>
              <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-lg border border-slate-100">
                {appointment.reason}
              </p>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
            {showActions && (
              <>
                {isRequestStage && canAcceptNow && (
                  <>
                    <Button
                      variant="danger"
                      onClick={() => {
                        onDecline?.(appointment.id);
                        setShowDetails(false);
                      }}
                    >
                      Decline
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        onAccept?.(appointment.id);
                        setShowDetails(false);
                      }}
                    >
                      Accept
                    </Button>
                  </>
                )}
                {isRequestStage && !canAcceptNow && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        onEdit?.(appointment.id);
                        setShowDetails(false);
                      }}
                    >
                      Reschedule
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        onCancel?.(appointment.id);
                        setShowDetails(false);
                      }}
                    >
                      Cancel request
                    </Button>
                  </>
                )}
                {isJoinable && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      onJoin?.(appointment.id);
                      setShowDetails(false);
                    }}
                  >
                    {joinLabel}
                  </Button>
                )}
                {appointment.computedStatus === "upcoming" && (
                  <>
                    <Button
                      variant="danger"
                      onClick={() => {
                        onCancel?.(appointment.id);
                        setShowDetails(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        onEdit?.(appointment.id);
                        setShowDetails(false);
                      }}
                    >
                      {userType === "patient" ? "Reschedule" : "Edit"}
                    </Button>
                    {userType === "practitioner" && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          onRebook?.(appointment.id);
                          setShowDetails(false);
                        }}
                      >
                        Re-book
                      </Button>
                    )}
                  </>
                )}
              </>
            )}
            <Button variant="ghost" onClick={() => setShowDetails(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
