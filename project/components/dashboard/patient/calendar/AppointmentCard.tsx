import React from "react";
import { BiTime, BiMap, BiTrendingUp, BiVideo } from "react-icons/bi";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";

interface Appointment {
  id: string;
  title?: string;
  dr?: string;
  dr_specialty?: string;
  time: string;
  date: string;
  type: "appointment" | "reminder" | "refill" | "note";
  status: "confirmed" | "pending" | "cancelled";
  concern?: string;
  notes?: string;
  location?: string;
  institution?: string;
  img?: string;
  countdown?: string;
  durationMinutes?: number;
  prescriptionName?: string;
}

interface AppointmentCardProps {
  appt: Appointment;
  idx: number;
  isExpired: boolean;
  joinable: boolean;
  getJoinCountdown: (appt: Appointment) => string;
  onSelect: (appt: Appointment) => void;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appt,
  idx,
  isExpired,
  joinable,
  getJoinCountdown,
  onSelect,
}) => {
  return (
    <div key={appt.id || idx} className="px-2 h-full">
      <div
        onClick={() => onSelect(appt)}
        className={`
          border rounded-lg p-4 transition-all group flex flex-col h-full cursor-pointer
          ${isExpired ? "bg-slate-50 border-slate-200 opacity-60 grayscale-[0.5]" : "bg-slate-100 border-slate-300 hover:shadow-slate-200/50"}
        `}
      >
        <div className="flex h-full justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-100 overflow-hidden relative rounded-xl">
              {appt.img ? (
                <Avatar name={appt.dr || ""} size="md" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">
                  {appt.type === "refill"
                    ? "💊"
                    : appt.type === "reminder"
                      ? "🔔"
                      : "📅"}
                </div>
              )}
            </div>
            <div className="flex flex-col items-start">
              <h5 className="text-base font-bold text-slate-800 leading-none mb-1 truncate max-w-[150px] font-grotesk">
                {appt.dr ||
                  appt.title ||
                  (appt.type === "refill" ? "Prescription Refill" : "Event")}
              </h5>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-slate-500 tracking-normal flex items-center gap-1">
                  <BiTime
                    className={isExpired ? "text-slate-500" : "text-primary"}
                  />{" "}
                  {appt.time}
                </p>
                <span className="text-xs text-slate-300">•</span>
                <p className="text-xs font-semibold uppercase text-slate-500 tracking-normal">
                  {isExpired ? "History" : appt.status}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge
              label={
                isExpired
                  ? "Passed"
                  : appt.countdown ||
                    (appt.status === "confirmed" ? "Confirmed" : "Pending")
              }
              status={
                isExpired
                  ? "neutral"
                  : appt.status === "confirmed"
                    ? "success"
                    : "warning"
              }
              variant="soft"
            />
            {joinable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/patient/messages?autoStart=true&consultationId=${appt.id}`;
                }}
                className="bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all px-3 py-2 rounded-lg text-xs font-bold tracking-normal flex items-center gap-1 shadow-none"
              >
                <BiVideo size={14} /> Join Room
                {getJoinCountdown(appt) && ` (${getJoinCountdown(appt)})`}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2 mb-2">
            {appt.location && (
              <div className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-100">
                <BiMap className="text-primary" /> {appt.location}
              </div>
            )}
            {appt.dr_specialty && (
              <div className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-100">
                <BiTrendingUp className="text-emerald-500" />{" "}
                {appt.dr_specialty}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1 justify-start items-start">
            <p className="text-sm font-semibold mb-2 text-slate-600 tracking-normal leading-none">
              {appt.type === "refill"
                ? "Refill Details"
                : "Appointment Details"}
            </p>
            <div className="bg-white p-4 rounded-xl border border-slate-100 w-full text-xs text-slate-500 leading-relaxed text-left">
              {appt.concern ? (
                `"${appt.concern}"`
              ) : appt.prescriptionName ? (
                `💊 ${appt.prescriptionName}`
              ) : (
                <span className="italic text-slate-500">No notes provided</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentCard;
