"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BiChevronLeft,
  BiChevronRight,
  BiVideo,
  BiChat,
  BiClinic,
  BiX,
  BiNote,
  BiLoader,
  BiCheckCircle,
} from "react-icons/bi";
import RiskScoreCard from "./RiskScoreCard";
import SoapNoteModal from "./SoapNoteModal";

interface CalendarEvent {
  id: string;
  title: string;
  patientName: string;
  start: string;
  end: string;
  status: string;
  type: string;
  reason: string;
  riskScore: number;
  riskColor: "green" | "gray" | "red";
  riskFactors: string[];
  aiRecommendations: string[];
  patientId: string;
  consultationId: string;
  soapNotes?: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 08:00 – 20:00
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekDays(referenceDate: Date): Date[] {
  const d = new Date(referenceDate);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday as start
  const monday = new Date(d.setDate(d.getDate() + diff));
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    return dt;
  });
}

function toMinutes(dt: string) {
  const d = new Date(dt);
  return d.getHours() * 60 + d.getMinutes();
}

const eventColor = (status: string, riskColor: string) => {
  if (riskColor === "red")
    return {
      bg: "bg-red-100 border-red-300 hover:bg-red-200",
      text: "text-red-800",
      dot: "bg-red-500",
    };
  if (status === "ongoing")
    return {
      bg: "bg-emerald-100 border-emerald-300 hover:bg-emerald-200",
      text: "text-emerald-800",
      dot: "bg-emerald-500",
    };
  if (status === "completed")
    return {
      bg: "bg-slate-100 border-slate-200 hover:bg-slate-200",
      text: "text-slate-500",
      dot: "bg-slate-400",
    };
  if (status === "requested")
    return {
      bg: "bg-gray-50 border-gray-200 hover:bg-gray-100",
      text: "text-gray-700",
      dot: "bg-gray-500",
    };
  if (riskColor === "gray")
    return {
      bg: "bg-orange-50 border-orange-200 hover:bg-orange-100",
      text: "text-orange-700",
      dot: "bg-orange-500",
    };
  return {
    bg: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    text: "text-blue-700",
    dot: "bg-blue-500",
  };
};

const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: "1",
    title: "Consultation",
    patientName: "Thandiwe Mokoena",
    start: new Date(Date.now() + 18 * 60000).toISOString(),
    end: new Date(Date.now() + 48 * 60000).toISOString(),
    status: "scheduled",
    type: "video",
    reason: "Persistent headache",
    riskScore: 82,
    riskColor: "red",
    riskFactors: ["Hypertension", "Diabetic"],
    aiRecommendations: ["Monitor BP"],
    patientId: "p1",
    consultationId: "c1",
  },
  {
    id: "2",
    title: "Consultation",
    patientName: "John Dlamini",
    start: new Date(Date.now() + 60 * 60000).toISOString(),
    end: new Date(Date.now() + 90 * 60000).toISOString(),
    status: "ongoing",
    type: "video",
    reason: "Chest pain",
    riskScore: 92,
    riskColor: "red",
    riskFactors: ["CAD"],
    aiRecommendations: ["Urgent ECG"],
    patientId: "p2",
    consultationId: "c2",
  },
  {
    id: "3",
    title: "Consultation",
    patientName: "Amira Khan",
    start: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
    end: new Date(new Date().setHours(14, 30, 0, 0)).toISOString(),
    status: "scheduled",
    type: "chat",
    reason: "Asthma follow-up",
    riskScore: 45,
    riskColor: "gray",
    riskFactors: ["Chronic asthma"],
    aiRecommendations: [],
    patientId: "p3",
    consultationId: "c3",
  },
];

const typeIcon = (type: string, size = 11) => {
  if (type === "video") return <BiVideo size={size} />;
  if (type === "chat") return <BiChat size={size} />;
  return <BiClinic size={size} />;
};

import Button from "@/components/ui/Button";

export default function AppointmentCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [soapModal, setSoapModal] = useState({
    isOpen: false,
    consultationId: "",
    patientName: "",
  });

  const weekDays = getWeekDays(currentDate);
  const today = new Date();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const from = weekDays[0].toISOString();
      const to = weekDays[6].toISOString();
      const res = await fetch(
        `/api/practitioner/consultations?from=${from}&to=${to}`,
      );
      const data = await res.json();
      if (data.success) setEvents(data.data.events);
      else setEvents(MOCK_EVENTS);
    } catch (err) {
      console.error("Calendar fetch error", err);
      setEvents(MOCK_EVENTS);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/consultations/${id}/approve`, {
        method: "POST",
      });
      if (res.ok) {
        fetchEvents();
        setSelectedEvent(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const navigateWeek = (dir: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  };

  return (
    <>
      <div className="h-full flex flex-col bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-none">
        {/* Calendar Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-400  tracking-normal leading-none mb-2 font-grotesk">
              Clinical Schedule
            </h3>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-800 font-grotesk">
                {weekDays[0]?.toLocaleDateString("en-ZA", {
                  month: "short",
                  day: "numeric",
                })}
                {" — "}
                {weekDays[6]?.toLocaleDateString("en-ZA", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </h4>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setCurrentDate(new Date())}
              className="text-sm font-bold text-primary hover:bg-primary/5 px-3 py-1.5 rounded-full transition-all border-none bg-transparent h-auto !min-w-0  tracking-normal"
            >
              Today
            </Button>
            <div className="flex items-center bg-slate-50 p-1 rounded-full border border-slate-100">
              <Button
                variant="ghost"
                onClick={() => navigateWeek(-1)}
                className="w-8 h-8 p-0 rounded-full bg-white hover:bg-primary/5 text-slate-500 hover:text-primary flex items-center justify-center transition-all border-none shadow-none !min-w-0"
              >
                <BiChevronLeft size={18} />
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigateWeek(1)}
                className="w-8 h-8 p-0 rounded-full bg-white hover:bg-primary/5 text-slate-500 hover:text-primary flex items-center justify-center transition-all border-none shadow-none !min-w-0 ml-1"
              >
                <BiChevronRight size={18} />
              </Button>
            </div>
          </div>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-8 border-b border-slate-50 shrink-0 pl-12 bg-slate-50/30">
          {weekDays.map((day, i) => {
            const isToday = day.toDateString() === today.toDateString();
            return (
              <div
                key={i}
                className={`py-3 text-center border-l border-slate-100 transition-colors ${isToday ? "bg-primary/5" : ""}`}
              >
                <p
                  className={`text-[9px] font-bold  tracking-[0.25em] ${isToday ? "text-primary" : "text-slate-400"}`}
                >
                  {DAYS[i]}
                </p>
                <p
                  className={`text-sm font-bold mt-1 ${isToday ? "text-white bg-primary w-6 h-6 rounded-full flex items-center justify-center mx-auto text-sm shadow-none shadow-primary/30" : "text-slate-600"}`}
                >
                  {day.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Grid Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <BiLoader className="text-primary text-2xl animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="relative grid grid-cols-8 min-h-[728px]">
              {/* Hour labels */}
              <div className="col-span-1 bg-slate-50/20">
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="h-14 flex items-start justify-end pr-3 pt-1"
                  >
                    <span className="text-sm text-slate-300 font-bold tabular-nums">
                      {String(h).padStart(2, "0")}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((day, dayIdx) => {
                const dayEvents = events.filter((e) => {
                  const evtDay = new Date(e.start);
                  return evtDay.toDateString() === day.toDateString();
                });

                return (
                  <div
                    key={dayIdx}
                    className="col-span-1 border-l border-slate-100 relative"
                  >
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        className="h-14 border-b border-slate-50/50"
                      />
                    ))}
                    {/* Events overlay */}
                    {dayEvents.map((evt) => {
                      const startMins = toMinutes(evt.start) - 8 * 60;
                      const endMins = toMinutes(evt.end) - 8 * 60;
                      const top = (startMins / 60) * 56;
                      const height = Math.max(
                        ((endMins - startMins) / 60) * 56,
                        28,
                      );
                      const col = eventColor(evt.status, evt.riskColor);

                      return (
                        <Button
                          key={evt.id}
                          variant="ghost"
                          onClick={() => setSelectedEvent(evt)}
                          className={`absolute inset-x-0.5 rounded-xl border px-2 py-1.5 text-left overflow-hidden transition-all hover:z-10 hover:shadow-none hover:scale-[1.02] active:scale-[0.98] ${col.bg} ${col.text} flex flex-col items-start !justify-start normal-case !min-w-0 h-auto`}
                          style={{ top: `${top}px`, height: `${height}px` }}
                          title={`${evt.patientName} — ${evt.reason}`}
                        >
                          <div className="flex items-center gap-1.5 w-full">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 shadow-none ${col.dot}`}
                            />
                            <span className="text-sm font-bold truncate leading-tight  tracking-tight">
                              {evt.patientName.split(" ")[0]}
                            </span>
                          </div>
                          {height > 40 && (
                            <div className="flex items-center gap-1 mt-1 opacity-70">
                              {typeIcon(evt.type, 10)}
                              <span className="text-[9px] font-bold tabular-nums">
                                {new Date(evt.start).toLocaleTimeString(
                                  "en-ZA",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </span>
                            </div>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Event Detail Sidebar */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[120] flex items-center justify-end p-6 pointer-events-none bg-slate-900/10 backdrop-blur-[2px]">
          <div className="pointer-events-auto w-full max-w-sm bg-white rounded-lg shadow-none border border-slate-100 overflow-hidden animate-in slide-in-from-right-8 duration-500">
            <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between bg-gradient-to-r from-primary/5 to-primary/0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  {typeIcon(selectedEvent.type, 20)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 leading-tight font-grotesk">
                    {selectedEvent.patientName}
                  </h4>
                  <p className="text-sm font-bold text-slate-400  tracking-normal mt-1">
                    {selectedEvent.reason}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => setSelectedEvent(null)}
                className="w-8 h-8 p-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors border-none !min-w-0"
              >
                <BiX size={18} />
              </Button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100">
                  <p className="text-[9px] text-slate-400 font-bold  tracking-normal mb-1">
                    Time Window
                  </p>
                  <p className="text-xs font-bold text-slate-700 tabular-nums">
                    {new Date(selectedEvent.start).toLocaleTimeString("en-ZA", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" – "}
                    {new Date(selectedEvent.end).toLocaleTimeString("en-ZA", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100">
                  <p className="text-[9px] text-slate-400 font-bold  tracking-normal mb-1">
                    Session Type
                  </p>
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5  tracking-tight">
                    {typeIcon(selectedEvent.type, 12)} {selectedEvent.type}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="text-sm text-slate-400 font-bold  tracking-normal">
                    Clinical Risk
                  </p>
                  <p className="text-[9px] text-slate-300 font-bold  tracking-normal mt-0.5">
                    Automated Score
                  </p>
                </div>
                <RiskScoreCard
                  score={selectedEvent.riskScore}
                  color={selectedEvent.riskColor}
                  factors={selectedEvent.riskFactors}
                  size="sm"
                />
              </div>
              {selectedEvent.aiRecommendations.length > 0 && (
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-[1.5rem] p-4">
                  <p className="text-sm font-bold text-emerald-600 mb-2  tracking-normal">
                    AI Triage Insights
                  </p>
                  <ul className="space-y-2">
                    {selectedEvent.aiRecommendations
                      .slice(0, 3)
                      .map((rec, i) => (
                        <li
                          key={i}
                          className="text-[11px] font-medium text-slate-600 flex items-start gap-2 leading-relaxed"
                        >
                          <span className="text-emerald-500 font-bold shrink-0">
                            ·
                          </span>{" "}
                          {rec}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              <div className="flex flex-col gap-3 pt-2">
                {selectedEvent.status === "requested" ? (
                  <Button
                    onClick={() => handleApprove(selectedEvent.consultationId)}
                    fullWidth
                    className="py-4 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold  tracking-normal rounded-2xl transition-all h-auto shadow-none shadow-emerald-200"
                    icon={<BiCheckCircle size={14} />}
                  >
                    Approve Clinical Session
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    className="py-4 bg-primary hover:bg-primary/90 text-white text-[11px] font-bold  tracking-normal rounded-2xl transition-all h-auto shadow-none shadow-primary/20"
                    icon={typeIcon(selectedEvent.type, 14)}
                  >
                    Join Session
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setSoapModal({
                      isOpen: true,
                      consultationId: selectedEvent.consultationId,
                      patientName: selectedEvent.patientName,
                    });
                    setSelectedEvent(null);
                  }}
                  variant="outline"
                  fullWidth
                  className="py-4 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold  tracking-normal rounded-2xl transition-all h-auto border-slate-200"
                  icon={<BiNote size={14} />}
                >
                  Document SOAP Note
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SoapNoteModal
        isOpen={soapModal.isOpen}
        onClose={() =>
          setSoapModal({ isOpen: false, consultationId: "", patientName: "" })
        }
        consultationId={soapModal.consultationId}
        patientName={soapModal.patientName}
      />
    </>
  );
}
