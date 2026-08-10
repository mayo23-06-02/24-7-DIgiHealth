import React from "react";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DescriptionList, { DescriptionItem } from "@/components/ui/DescriptionList";
import { User, UserPlus } from "lucide-react";
import { Appointment } from "@/lib/hooks/useAppointments";
import PendingRescheduleBanner from "./PendingRescheduleBanner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  userType: "patient" | "practitioner";
  onViewProfile?: (id: string) => void;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  onReschedule?: (id: string) => void;
  onCancel?: (id: string) => void;
  actionLoading?: string | null;
}

export default function AppointmentDetailsModal({
  isOpen,
  onClose,
  appointment,
  userType,
  onViewProfile,
  onAccept,
  onDecline,
  onReschedule,
  onCancel,
  actionLoading,
}: Props) {
  if (!appointment) return null;

  const start = new Date(appointment.scheduledStart);
  const end = new Date(appointment.scheduledEnd);
  const dateStr = start.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = start.toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTimeStr = end.toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isDoctor = userType === "practitioner";
  // Accept is a two-party handshake: only whoever didn't make the last move
  // (the original request, or a later reschedule proposal) can accept it —
  // regardless of role.
  const isRequestStage =
    appointment.status === "requested" ||
    appointment.status === "pending" ||
    appointment.computedStatus === "requests";
  const canAcceptNow =
    isRequestStage && appointment.canAccept === true && !appointment.pendingReschedule;
  const profileName = isDoctor ? appointment.patientName : appointment.practitionerName;
  const profileAvatar = isDoctor ? appointment.patientAvatar : appointment.practitionerAvatar;
  const profileId = isDoctor ? appointment.patientId : appointment.practitionerId;
  const profileLabel = isDoctor ? "Patient" : "Doctor";

  const statusValue = appointment.computedStatus || appointment.status;
  const statusBadgeStatus =
    statusValue === "upcoming" || statusValue === "requests"
      ? "warning"
      : statusValue === "ongoing"
        ? "info"
        : statusValue === "missed" || statusValue === "cancelled"
          ? "error"
          : "success";

  const infoItems: DescriptionItem[] = [
    { label: "Date", value: dateStr },
    { label: "Time", value: `${timeStr} - ${endTimeStr}` },
    { label: "Consultation Type", value: <span className="capitalize">{appointment.type || "Video"}</span> },
    {
      label: "Status",
      value: (
        <Badge
          label={statusValue}
          status={statusBadgeStatus}
          variant="solid"
          className="uppercase"
        />
      ),
    },
    ...(appointment.reason ? [{ label: "Reason for Visit", value: appointment.reason }] : []),
    {
      label: "Consultation ID",
      value: <span className="font-mono">{appointment.consultationId || appointment.id}</span>,
    },
    ...(appointment.duration ? [{ label: "Duration", value: appointment.duration }] : []),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Appointment Details" width="lg">
      <div className="space-y-6">
        {/* Profile Section — clickable when onViewProfile is provided */}
        <div
          className={`flex items-center gap-4 p-4 bg-surface-soft rounded-xl ${
            onViewProfile && profileId
              ? "cursor-pointer hover:bg-primary/5 hover:ring-1 hover:ring-primary/20 transition-all group"
              : ""
          }`}
          role={onViewProfile && profileId ? "button" : undefined}
          tabIndex={onViewProfile && profileId ? 0 : undefined}
          onClick={() => {
            if (onViewProfile && profileId) onViewProfile(profileId);
          }}
          onKeyDown={(e) => {
            if (
              onViewProfile &&
              profileId &&
              (e.key === "Enter" || e.key === " ")
            ) {
              e.preventDefault();
              onViewProfile(profileId);
            }
          }}
          aria-label={
            onViewProfile && profileId
              ? `View ${profileLabel.toLowerCase()} details for ${profileName}`
              : undefined
          }
        >
          <Avatar
            name={profileName || "Unknown"}
            src={profileAvatar}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <p
              className={`font-bold text-ink-900 font-grotesk text-lg truncate ${
                onViewProfile && profileId
                  ? "group-hover:text-primary transition-colors"
                  : ""
              }`}
            >
              {profileName}
            </p>
            <p className="text-sm text-slate-500">
              {profileLabel}
              {onViewProfile && profileId ? " · Click to open profile" : ""}
            </p>
          </div>
          {onViewProfile && profileId && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewProfile(profileId);
              }}
              icon={isDoctor ? <User size={16} /> : <UserPlus size={16} />}
            >
              View {profileLabel}
            </Button>
          )}
        </div>

        {/* Appointment Details */}
        <div className="space-y-3">
          <h4 className="font-bold text-ink-900 font-grotesk text-sm">Appointment Information</h4>
          <Card>
            <DescriptionList columns={2} items={infoItems} />
          </Card>
        </div>

        <PendingRescheduleBanner
          appointment={appointment}
          onResponded={onClose}
        />

        {/* Risk Score if available */}
        {appointment.riskScore !== undefined && (
          <div className="p-4 bg-danger-50 border border-danger-500/20 rounded-lg">
            <p className="text-sm font-bold text-danger-700 mb-1">Risk Score: {appointment.riskScore}/100</p>
            {appointment.riskColor && (
              <Badge
                label={appointment.riskColor === "red" ? "High Risk" : appointment.riskColor === "green" ? "Low Risk" : "Medium Risk"}
                status={appointment.riskColor === "red" ? "error" : appointment.riskColor === "green" ? "success" : "warning"}
                variant="solid"
                className="text-xs"
              />
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-4 border-t border-slate-200">
          {/* Only whoever isn't waiting on the other party can accept/decline */}
          {canAcceptNow && (
            <>
              <Button
                fullWidth
                onClick={() =>
                  onAccept?.(
                    appointment.id || appointment.consultationId || "",
                  )
                }
                loading={
                  actionLoading ===
                  (appointment.id || appointment.consultationId)
                }
              >
                Accept Request
              </Button>
              <Button
                fullWidth
                variant="danger"
                onClick={() =>
                  onDecline?.(
                    appointment.id || appointment.consultationId || "",
                  )
                }
                loading={
                  actionLoading ===
                  (appointment.id || appointment.consultationId)
                }
              >
                Decline Request
              </Button>
              <Button
                fullWidth
                variant="outline"
                onClick={() =>
                  onReschedule?.(
                    appointment.id || appointment.consultationId || "",
                  )
                }
              >
                Reschedule
              </Button>
            </>
          )}

          {isRequestStage && !canAcceptNow && (
            <>
              <p className="text-xs text-slate-500 text-center -mt-1 mb-1">
                Waiting for the other party to accept. You can reschedule or
                cancel this request.
              </p>
              <Button
                fullWidth
                variant="outline"
                onClick={() =>
                  onReschedule?.(
                    appointment.id || appointment.consultationId || "",
                  )
                }
              >
                Reschedule
              </Button>
              <Button
                fullWidth
                variant="danger"
                onClick={() =>
                  onCancel?.(
                    appointment.id || appointment.consultationId || "",
                  )
                }
                loading={
                  actionLoading ===
                  (appointment.id || appointment.consultationId)
                }
              >
                Cancel request
              </Button>
            </>
          )}

          {(appointment.status === "scheduled" ||
            appointment.computedStatus === "upcoming") && (
            <>
              <Button
                fullWidth
                variant="outline"
                onClick={() =>
                  onReschedule?.(
                    appointment.id || appointment.consultationId || "",
                  )
                }
              >
                Reschedule
              </Button>
              <Button
                fullWidth
                variant="danger"
                onClick={() =>
                  onCancel?.(
                    appointment.id || appointment.consultationId || "",
                  )
                }
                loading={
                  actionLoading ===
                  (appointment.id || appointment.consultationId)
                }
              >
                Cancel Appointment
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
