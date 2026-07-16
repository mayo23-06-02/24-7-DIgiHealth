"use client";

import React, { useState, useMemo, useCallback, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { toast } from "react-hot-toast";
import { PendingRequest } from "./types";
import AppointmentDetailsModal from "@/components/shared/Appointments/AppointmentDetailsModal";
import BookingModal from "@/components/doctor/BookingModal";

interface PendingRequestsProps {
  requests: PendingRequest[];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  actionLoading: string | null;
  onRescheduleSuccess?: () => void;
}

export default function PendingRequests({
  requests,
  onAccept,
  onDecline,
  actionLoading,
  onRescheduleSuccess,
}: PendingRequestsProps) {
  const router = useRouter();
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  const handleViewPatient = useCallback(
    (patientId: string) => {
      if (!patientId) {
        toast.error("Patient profile unavailable for this request");
        return;
      }
      setShowDetailsModal(false);
      router.push(`/practitioner/patients/${patientId}`);
    },
    [router],
  );

  // Memoize the current date for "New" badge calculation
  const now = useMemo(() => Date.now(), []);

  // Derived state for formatted dates to avoid repeated computation
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, []);

  const formatTime = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // Handlers
  const handleCardClick = useCallback((req: PendingRequest) => {
    setSelectedRequest(req);
    setShowDetailsModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowDetailsModal(false);
    setSelectedRequest(null);
  }, []);

  const handleReschedule = useCallback((req: PendingRequest) => {
    setSelectedRequest(req);
    setShowRescheduleModal(true);
  }, []);

  const handleRescheduleSuccess = useCallback(() => {
    setShowRescheduleModal(false);
    setSelectedRequest(null);
    onRescheduleSuccess?.();
    toast.success("Appointment rescheduled successfully. Patient has been notified.");
  }, [onRescheduleSuccess]);

  const handleCloseRescheduleModal = useCallback(() => {
    setShowRescheduleModal(false);
    setSelectedRequest(null);
  }, []);

  // Keyboard support for card click (Enter/Space)
  const handleCardKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>, req: PendingRequest) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleCardClick(req);
      }
    },
    [handleCardClick]
  );

  // Empty state
  if (requests.length === 0) {
    return (
      <div
        className="p-8 text-center text-slate-500 font-medium text-sm bg-slate-50/50 rounded-lg border border-slate-100 border-dashed"
        role="status"
        aria-live="polite"
      >
        No pending requests
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {requests.map((req) => {
          const isNew =
            new Date(req.createdAt).getTime() > now - 24 * 60 * 60 * 1000;
          const isLoading = actionLoading === req.consultationId;

          return (
            <div
              key={req.consultationId}
              className="p-4 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1"
              role="button"
              tabIndex={0}
              onClick={() => handleCardClick(req)}
              onKeyDown={(e) => handleCardKeyDown(e, req)}
              aria-label={`View details for ${req.patientName}'s appointment`}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 pb-3 mb-3 border-b border-slate-100">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <h4 className="text-sm font-bold text-slate-800 leading-none font-grotesk truncate">
                      {req.patientName}
                    </h4>
                    {isNew && (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-slate-500 mb-1">
                    {formatDate(req.scheduledStart)}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"
                      aria-hidden="true"
                    />
                    <p className="text-xs font-medium text-slate-500 capitalize">
                      {req.type} Consultation
                    </p>
                  </div>
                </div>
                {/* Optional: show time on the right for larger screens */}
                <div className="text-xs font-medium text-slate-400 sm:text-right whitespace-nowrap">
                  {formatTime(req.scheduledStart)}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAccept(req.consultationId);
                  }}
                  loading={isLoading}
                  disabled={isLoading}
                  aria-label={`Accept appointment for ${req.patientName}`}
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReschedule(req);
                  }}
                  disabled={isLoading}
                  aria-label={`Reschedule appointment for ${req.patientName}`}
                >
                  Reschedule
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDecline(req.consultationId);
                  }}
                  loading={isLoading}
                  disabled={isLoading}
                  aria-label={`Decline appointment for ${req.patientName}`}
                >
                  Decline
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <AppointmentDetailsModal
        isOpen={showDetailsModal}
        onClose={handleCloseModal}
        appointment={
          selectedRequest
            ? {
                id: selectedRequest.consultationId,
                consultationId: selectedRequest.consultationId,
                patientId: selectedRequest.patientId,
                patientName: selectedRequest.patientName,
                scheduledStart: selectedRequest.scheduledStart,
                scheduledEnd: new Date(
                  new Date(selectedRequest.scheduledStart).getTime() + 60 * 60 * 1000
                ).toISOString(),
                type: selectedRequest.type,
                status: "requested",
                reason: selectedRequest.reason,
              }
            : null
        }
        userType="practitioner"
        onViewProfile={handleViewPatient}
        onAccept={onAccept}
        onDecline={onDecline}
        onReschedule={(id) => handleReschedule(selectedRequest!)}
        onCancel={(id) => onDecline(id)}
        actionLoading={actionLoading}
      />

      <BookingModal
        isOpen={showRescheduleModal}
        onClose={handleCloseRescheduleModal}
        mode="practitioner"
        patient={
          selectedRequest
            ? {
                id: selectedRequest.patientId,
                name: selectedRequest.patientName,
              }
            : null
        }
        editingApptId={selectedRequest?.consultationId}
        initialForm={
          selectedRequest
            ? {
                date: (() => {
                  const d = new Date(selectedRequest.scheduledStart);
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, "0");
                  const day = String(d.getDate()).padStart(2, "0");
                  return `${y}-${m}-${day}`;
                })(),
                time: (() => {
                  const d = new Date(selectedRequest.scheduledStart);
                  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                })(),
                reason: selectedRequest.reason,
                type: selectedRequest.type,
                durationMinutes: 30,
              }
            : undefined
        }
        onSuccess={handleRescheduleSuccess}
      />
    </>
  );
}