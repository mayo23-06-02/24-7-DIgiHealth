"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BiVideo,
  BiChat,
  BiLoader,
  BiRefresh,
  BiError,
  BiNote,
  BiUser,
  BiTime,
  BiClinic,
  BiCheckCircle,
} from "react-icons/bi";
import RiskScoreCard from "./RiskScoreCard";
import SoapNoteModal from "./SoapNoteModal";
import AppointmentDetailsModal from "@/components/shared/Appointments/AppointmentDetailsModal";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Badge, { type BadgeStatus } from "@/components/ui/Badge";

interface QueueItem {
  consultationId: string;
  patientId: string;
  patientName: string;
  initials: string;
  avatarUrl?: string;
  scheduledStart: string;
  scheduledEnd: string;
  reason: string;
  riskScore: number;
  riskColor: "green" | "gray" | "red";
  riskFactors: string[];
  aiRecommendations: string[];
  status: string;
  type: string;
  medicalHistory?: string[];
  allergies?: string[];
}

interface VideoModalState {
  isOpen: boolean;
  consultation: QueueItem | null;
}

interface SoapModalState {
  isOpen: boolean;
  consultationId: string;
  patientName: string;
}

const typeIcon = (type: string) => {
  if (type === "chat") return <BiChat className="text-secondary" size={14} />;
  return <BiVideo className="text-primary" size={14} />;
};

const typeLabel = (type: string) => {
  if (type === "chat") return "Chat";
  return "Video";
};

const statusConfig: Record<string, { status: BadgeStatus; label: string }> = {
  requested: { status: "neutral", label: "Requested" },
  scheduled: { status: "neutral", label: "Scheduled" },
  ongoing: { status: "success", label: "● Live" },
  cancelled: { status: "error", label: "Cancelled" },
};

const MOCK_QUEUE: QueueItem[] = [
  {
    consultationId: "1",
    patientId: "p1",
    patientName: "Thandiwe Mokoena",
    scheduledStart: new Date(Date.now() + 18 * 60000).toISOString(),
    scheduledEnd: new Date(Date.now() + 48 * 60000).toISOString(),
    reason: "Persistent headache and dizziness",
    riskScore: 82,
    riskColor: "red",
    riskFactors: ["Hypertension", "Diabetic"],
    aiRecommendations: ["Monitor BP daily", "Review Metformin dosage"],
    status: "scheduled",
    type: "video",
    initials: "TM",
  },
  {
    consultationId: "2",
    patientId: "p2",
    patientName: "John Dlamini",
    scheduledStart: new Date(Date.now() + 60 * 60000).toISOString(),
    scheduledEnd: new Date(Date.now() + 90 * 60000).toISOString(),
    reason: "Chest pain with shortness of breath",
    riskScore: 92,
    riskColor: "red",
    riskFactors: ["CAD", "Age >60", "Hypertension"],
    aiRecommendations: ["Urgent ECG", "Troponin levels"],
    status: "ongoing",
    type: "video",
    initials: "JD",
  },
  {
    consultationId: "3",
    patientId: "p3",
    patientName: "Amira Khan",
    scheduledStart: new Date(Date.now() + 105 * 60000).toISOString(),
    scheduledEnd: new Date(Date.now() + 135 * 60000).toISOString(),
    reason: "Asthma follow-up",
    riskScore: 45,
    riskColor: "gray",
    riskFactors: ["Chronic asthma", "Allergen exposure"],
    aiRecommendations: ["Check peak flow rate"],
    status: "scheduled",
    type: "chat",
    initials: "AK",
  },
  {
    consultationId: "4",
    patientId: "p4",
    patientName: "Grace Molefe",
    scheduledStart: new Date(Date.now() + 150 * 60000).toISOString(),
    scheduledEnd: new Date(Date.now() + 180 * 60000).toISOString(),
    reason: "Kidney function monitoring",
    riskScore: 88,
    riskColor: "red",
    riskFactors: ["CKD Stage 3", "Age >70", "Diabetic"],
    aiRecommendations: ["eGFR monitoring", "Nephrology consult"],
    status: "scheduled",
    type: "video",
    initials: "GM",
  },
];

function formatTime(dt: string) {
  return new Date(dt).toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function minutesUntil(dt: string) {
  return Math.round((new Date(dt).getTime() - Date.now()) / 60000);
}

export default function PatientQueueTable() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoModal, setVideoModal] = useState<VideoModalState>({
    isOpen: false,
    consultation: null,
  });
  const [soapModal, setSoapModal] = useState<SoapModalState>({
    isOpen: false,
    consultationId: "",
    patientName: "",
  });
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(
        "/api/practitioner/queue?status=requested,scheduled,ongoing&limit=10",
      );
      const data = await res.json();
      if (data.success) {
        setQueue(data.data.queue);
        setError(null);
      } else {
        setQueue(MOCK_QUEUE);
        setError("Working offline (Mock Data)");
      }
    } catch {
      setQueue(MOCK_QUEUE);
      setError("Working offline (Mock Data)");
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/consultations/${id}/approve`, {
        method: "POST",
      });
      if (res.ok) {
        fetchQueue();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDecline = async (id: string) => {
    if (!confirm("Decline this appointment request?")) return;
    try {
      const res = await fetch(`/api/consultations/${id}/decline`, {
        method: "POST",
      });
      if (res.ok) {
        fetchQueue();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewPatientProfile = (patientId: string) => {
    window.location.href = `/practitioner/patients/${patientId}`;
  };

  const handleAppointmentClick = (item: QueueItem) => {
    setSelectedAppointment({
      id: item.consultationId,
      consultationId: item.consultationId,
      patientId: item.patientId,
      patientName: item.patientName,
      patientAvatar: item.avatarUrl,
      scheduledStart: item.scheduledStart,
      scheduledEnd: item.scheduledEnd,
      status: item.status,
      type: item.type,
      reason: item.reason,
      riskScore: item.riskScore,
      riskColor: item.riskColor,
    });
    setShowDetailsModal(true);
  };

  useEffect(() => {
    fetchQueue();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <BiLoader className="text-primary text-3xl animate-spin" />
        <p className="text-sm text-slate-500 font-bold  tracking-normal">
          Syncing Patient Queue…
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h3 className="font-bold text-slate-800 text-sm leading-tight  tracking-normal font-grotesk">
            Clinical Queue
          </h3>
          <p className="text-sm text-slate-500 font-bold  tracking-normal mt-1">
            Refreshed{" "}
            {lastRefresh.toLocaleTimeString("en-ZA", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            setLoading(true);
            fetchQueue();
          }}
          className="w-10 h-10 p-0 rounded-full bg-slate-50 hover:bg-primary/5 text-slate-500 hover:text-primary flex items-center justify-center transition-all active:scale-95 border-none bg-transparent !min-w-0"
          aria-label="Refresh queue"
        >
          <BiRefresh size={20} />
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-lg p-4 mb-4 text-sm font-bold text-gray-700  tracking-normal">
          <BiError size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-500">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-300">
            <BiCheckCircle size={32} />
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-slate-800  tracking-normal">
              Queue is clear
            </p>
            <p className="text-sm font-medium mt-1">
              No upcoming clinical consultations assigned.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
          {queue.map((item) => {
            const mins = minutesUntil(item.scheduledStart);
            const isUrgent =
              mins <= 5 && mins >= -30 && item.status === "scheduled";
            const isOngoing = item.status === "ongoing";
            const sc = statusConfig[item.status] || statusConfig.scheduled;

            return (
              <div
                key={item.consultationId}
                className={`
                  group rounded-[1.5rem] border p-5 transition-all duration-300 hover:shadow-none cursor-pointer
                  ${
                    isOngoing
                      ? "border-emerald-200 bg-gradient-to-r from-emerald-50 to-white shadow-none shadow-emerald-50"
                      : isUrgent
                        ? "border-gray-200 bg-gradient-to-r from-gray-50 to-white  shadow-gray-50"
                        : "border-slate-100 bg-white hover:border-primary/20 hover:bg-blue-50/10"
                  }
                `}
                onClick={() => handleAppointmentClick(item)}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-xs font-bold shadow-none shadow-primary/20">
                      {item.initials}
                    </div>
                    {isOngoing && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-bold text-slate-800 truncate">
                        {item.patientName}
                      </p>
                      <Badge
                        label={sc.label}
                        status={sc.status}
                        size="sm"
                        className="shrink-0"
                      />
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1.5 text-sm font-bold text-slate-500  tracking-normal">
                        {typeIcon(item.type)} {typeLabel(item.type)}
                      </span>
                      <span className="w-1 h-1 bg-slate-200 rounded-full" />
                      <span className="flex items-center gap-1.5 text-sm font-bold text-slate-500  tracking-normal tabular-nums font-mono">
                        <BiTime size={12} className="text-slate-300" />
                        {formatTime(item.scheduledStart)}
                        {mins > 0 && mins < 120 && (
                          <span
                            className={`ml-1 font-bold ${mins <= 15 ? "text-gray-500" : "text-slate-300"}`}
                          >
                            (IN {mins}M)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <RiskScoreCard
                    score={item.riskScore}
                    color={item.riskColor}
                    factors={item.riskFactors}
                    size="sm"
                    showRing={false}
                  />
                </div>

                <div className="ml-15 mb-4 pl-1 opacity-70">
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-bold italic">
                    "{item.reason}"
                  </p>
                </div>

                {item.riskScore > 70 && item.aiRecommendations.length > 0 && (
                  <div className="ml-15 mb-4 p-3 bg-rose-50 border border-rose-100 rounded-lg shadow-none">
                    <p className="text-sm font-bold text-rose-600  tracking-normal mb-1.5 flex items-center gap-2">
                      <BiError size={14} /> AI Clinical Alert
                    </p>
                    <p className="text-[11px] font-bold text-rose-700 leading-tight">
                      {item.aiRecommendations[0]}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-4">
                  {item.status === "requested" ? (
                    <>
                      <Button
                        onClick={() => handleApprove(item.consultationId)}
                        className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold  tracking-normal rounded-lg transition-all h-auto shadow-none shadow-emerald-200"
                        icon={<BiCheckCircle size={14} />}
                      >
                        Accept
                      </Button>
                      <Button
                        onClick={() => handleDecline(item.consultationId)}
                        variant="ghost"
                        className="flex-1 py-4 bg-rose-50 hover:bg-rose-100 text-rose-500 text-[11px] font-bold  tracking-normal rounded-lg transition-all h-auto border-none"
                      >
                        Decline
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() =>
                        setVideoModal({ isOpen: true, consultation: item })
                      }
                      className={`
                        flex-1 py-4 text-[11px] font-bold  tracking-normal rounded-lg transition-all h-auto
                        ${
                          item.type === "chat"
                            ? "bg-secondary hover:bg-secondary/90 text-white shadow-none shadow-secondary/20"
                            : "bg-primary hover:bg-primary/90 text-white shadow-none shadow-primary/20"
                        }
                      `}
                      icon={
                        item.type === "chat" ? (
                          <BiChat size={14} />
                        ) : (
                          <BiVideo size={14} />
                        )
                      }
                    >
                      {item.type === "chat" ? "Enter Chat" : "Enter Video"}
                    </Button>
                  )}
                  <Button
                    onClick={() =>
                      setSoapModal({
                        isOpen: true,
                        consultationId: item.consultationId,
                        patientName: item.patientName,
                      })
                    }
                    variant="ghost"
                    className="flex-1 py-4 text-[11px] font-bold  tracking-normal bg-slate-50 hover:bg-primary/5 text-slate-500 hover:text-primary rounded-lg transition-all h-auto border-none !min-w-0"
                    icon={<BiNote size={14} />}
                  >
                    SOAP
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-12 h-12 p-0 rounded-lg bg-slate-50 hover:bg-primary/5 text-slate-500 hover:text-primary transition-all flex items-center justify-center border-none !min-w-0"
                  >
                    <BiUser size={18} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={videoModal.isOpen}
        onClose={() => setVideoModal({ isOpen: false, consultation: null })}
        title={
          videoModal.consultation?.type === "chat"
            ? "Clinical Chat Session"
            : "Clinical Video Session"
        }
        width="sm"
      >
        {videoModal.consultation && (
          <div className="bg-slate-900 rounded-lg overflow-hidden shadow-none">
            <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center gap-4 relative">
              <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl font-bold text-white shadow-none">
                {videoModal.consultation.initials}
              </div>
              <p className="text-white font-bold text-sm tracking-normal ">
                {videoModal.consultation.patientName}
              </p>
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold  tracking-normal">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                Live Connection Syncing…
              </div>
              <div className="absolute bottom-4 right-4 w-20 h-16 bg-slate-700/50 backdrop-blur-md rounded-lg border border-white/10 flex items-center justify-center text-slate-300">
                <BiVideo size={24} />
              </div>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <p className="text-white font-bold text-sm mb-1  tracking-normal">
                  Patient Profile
                </p>
                <p className="text-slate-500 text-[11px] font-medium leading-relaxed italic opacity-80">
                  {videoModal.consultation.reason}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  fullWidth
                  className="py-4 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold  tracking-normal rounded-lg transition-all h-auto shadow-none shadow-emerald-500/20"
                >
                  Join Clinical Session
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setVideoModal({ isOpen: false, consultation: null })
                  }
                  className="flex-1 py-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[11px] font-bold  tracking-normal rounded-lg transition-all h-auto border-none !min-w-0"
                >
                  Disconnect
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <SoapNoteModal
        isOpen={soapModal.isOpen}
        onClose={() =>
          setSoapModal({ isOpen: false, consultationId: "", patientName: "" })
        }
        consultationId={soapModal.consultationId}
        patientName={soapModal.patientName}
      />

      <AppointmentDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        userType="practitioner"
        onViewProfile={handleViewPatientProfile}
      />
    </>
  );
}
