import React from "react";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { BiVideo, BiChat, BiCalendar, BiTime, BiUser, BiUserPlus, BiNote } from "react-icons/bi";
import { Appointment } from "@/lib/hooks/useAppointments";

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
  const profileName = isDoctor ? appointment.patientName : appointment.practitionerName;
  const profileAvatar = isDoctor ? appointment.patientAvatar : appointment.practitionerAvatar;
  const profileId = isDoctor ? appointment.patientId : appointment.practitionerId;
  const profileLabel = isDoctor ? "Patient" : "Doctor";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Appointment Details" width="lg">
      <div className="space-y-6">
        {/* Profile Section */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
          <Avatar
            name={profileName || "Unknown"}
            src={profileAvatar}
            size="lg"
          />
          <div className="flex-1">
            <p className="font-bold text-slate-800 text-lg">{profileName}</p>
            <p className="text-sm text-slate-500">{profileLabel}</p>
          </div>
          {onViewProfile && profileId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewProfile(profileId)}
              icon={isDoctor ? <BiUser size={16} /> : <BiUserPlus size={16} />}
            >
              View {profileLabel} Profile
            </Button>
          )}
        </div>

        {/* Appointment Details */}
        <div className="space-y-4">
          <h4 className="font-bold text-slate-800 text-sm">Appointment Information</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <BiCalendar className="text-primary" size={20} />
              <div>
                <p className="text-xs text-slate-500 font-medium">Date</p>
                <p className="text-sm font-bold text-slate-800">{dateStr}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <BiTime className="text-primary" size={20} />
              <div>
                <p className="text-xs text-slate-500 font-medium">Time</p>
                <p className="text-sm font-bold text-slate-800">{timeStr} - {endTimeStr}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            {appointment.type === "video" ? (
              <BiVideo className="text-primary" size={20} />
            ) : (
              <BiChat className="text-secondary" size={20} />
            )}
            <div>
              <p className="text-xs text-slate-500 font-medium">Consultation Type</p>
              <p className="text-sm font-bold text-slate-800 capitalize">{appointment.type || "Video"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <Badge
              label={appointment.computedStatus || appointment.status}
              status={
                appointment.computedStatus === "upcoming" ||
                appointment.computedStatus === "requests"
                  ? "warning"
                  : appointment.computedStatus === "ongoing"
                    ? "info"
                    : appointment.computedStatus === "missed" ||
                        appointment.computedStatus === "cancelled"
                      ? "error"
                      : "success"
              }
              variant="solid"
              className="uppercase text-xs font-bold"
            />
            <div>
              <p className="text-xs text-slate-500 font-medium">Status</p>
              <p className="text-sm font-bold text-slate-800 capitalize">
                {appointment.computedStatus || appointment.status}
              </p>
            </div>
          </div>
        </div>

        {/* Reason/Chief Complaint */}
        {appointment.reason && (
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 text-sm">Reason for Visit</h4>
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
              <BiNote className="text-slate-400 mt-0.5" size={20} />
              <p className="text-sm text-slate-700 leading-relaxed">{appointment.reason}</p>
            </div>
          </div>
        )}

        {/* Additional Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-500 font-medium">Consultation ID</p>
            <p className="text-sm font-bold text-slate-800 font-mono">{appointment.consultationId || appointment.id}</p>
          </div>
          {appointment.duration && (
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500 font-medium">Duration</p>
              <p className="text-sm font-bold text-slate-800">{appointment.duration}</p>
            </div>
          )}
        </div>

        {/* Risk Score if available */}
        {appointment.riskScore !== undefined && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl">
            <p className="text-sm font-bold text-rose-700 mb-1">Risk Score: {appointment.riskScore}/100</p>
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
        {isDoctor && (
          <div className="flex flex-col gap-3 pt-4 border-t border-slate-200">
            {appointment.status === 'requested' && (
              <>
                <Button
                  fullWidth
                  onClick={() => onAccept?.(appointment.id || appointment.consultationId || '')}
                  loading={actionLoading === (appointment.id || appointment.consultationId)}
                >
                  Accept Request
                </Button>
                <Button
                  fullWidth
                  variant="secondary"
                  onClick={() => onDecline?.(appointment.id || appointment.consultationId || '')}
                  loading={actionLoading === (appointment.id || appointment.consultationId)}
                >
                  Decline Request
                </Button>
                <Button
                  fullWidth
                  variant="outline"
                  onClick={() => onReschedule?.(appointment.id || appointment.consultationId || '')}
                >
                  Reschedule
                </Button>
              </>
            )}
            {appointment.status === 'scheduled' && (
              <>
                <Button
                  fullWidth
                  variant="outline"
                  onClick={() => onReschedule?.(appointment.id || appointment.consultationId || '')}
                >
                  Reschedule
                </Button>
                <Button
                  fullWidth
                  variant="secondary"
                  onClick={() => onCancel?.(appointment.id || appointment.consultationId || '')}
                  loading={actionLoading === (appointment.id || appointment.consultationId)}
                >
                  Cancel Appointment
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
