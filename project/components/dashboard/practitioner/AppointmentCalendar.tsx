'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BiChevronLeft,
  BiChevronRight,
  BiVideo,
  BiChat,
  BiClinic,
  BiX,
  BiNote,
  BiLoader,
} from 'react-icons/bi';
import RiskScoreCard from './RiskScoreCard';
import SoapNoteModal from './SoapNoteModal';

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
  riskColor: 'green' | 'amber' | 'red';
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
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
  if (riskColor === 'red') return { bg: 'bg-red-100 border-red-300 hover:bg-red-200', text: 'text-red-800', dot: 'bg-red-500' };
  if (status === 'ongoing') return { bg: 'bg-emerald-100 border-emerald-300 hover:bg-emerald-200', text: 'text-emerald-800', dot: 'bg-emerald-500' };
  if (status === 'completed') return { bg: 'bg-slate-100 border-slate-200 hover:bg-slate-200', text: 'text-slate-500', dot: 'bg-slate-400' };
  if (riskColor === 'amber') return { bg: 'bg-amber-100 border-amber-300 hover:bg-amber-200', text: 'text-amber-800', dot: 'bg-amber-500' };
  return { bg: 'bg-blue-100 border-blue-200 hover:bg-blue-200', text: 'text-blue-800', dot: 'bg-blue-500' };
};

const MOCK_EVENTS: CalendarEvent[] = [
  { id: '1', title: 'Consultation', patientName: 'Thandiwe Mokoena', start: new Date(Date.now() + 18 * 60000).toISOString(), end: new Date(Date.now() + 48 * 60000).toISOString(), status: 'scheduled', type: 'video', reason: 'Persistent headache', riskScore: 82, riskColor: 'red', riskFactors: ['Hypertension', 'Diabetic'], aiRecommendations: ['Monitor BP'], patientId: 'p1', consultationId: 'c1' },
  { id: '2', title: 'Consultation', patientName: 'John Dlamini', start: new Date(Date.now() + 60 * 60000).toISOString(), end: new Date(Date.now() + 90 * 60000).toISOString(), status: 'ongoing', type: 'video', reason: 'Chest pain', riskScore: 92, riskColor: 'red', riskFactors: ['CAD'], aiRecommendations: ['Urgent ECG'], patientId: 'p2', consultationId: 'c2' },
  { id: '3', title: 'Consultation', patientName: 'Amira Khan', start: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(), end: new Date(new Date().setHours(14, 30, 0, 0)).toISOString(), status: 'scheduled', type: 'chat', reason: 'Asthma follow-up', riskScore: 45, riskColor: 'amber', riskFactors: ['Chronic asthma'], aiRecommendations: [], patientId: 'p3', consultationId: 'c3' },
];

const typeIcon = (type: string, size = 11) => {
  if (type === 'video') return <BiVideo size={size} />;
  if (type === 'chat') return <BiChat size={size} />;
  return <BiClinic size={size} />;
};

export default function AppointmentCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [soapModal, setSoapModal] = useState({ isOpen: false, consultationId: '', patientName: '' });

  const weekDays = getWeekDays(currentDate);
  const today = new Date();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const from = weekDays[0].toISOString();
      const to = weekDays[6].toISOString();
      const res = await fetch(`/api/practitioner/consultations?from=${from}&to=${to}`);
      const data = await res.json();
      if (data.success) setEvents(data.data.events);
      else setEvents(MOCK_EVENTS);
    } catch (err) {
      console.error('Calendar fetch error', err);
      setEvents(MOCK_EVENTS);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const navigateWeek = (dir: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  };

  return (
    <>
      <div className="h-full flex flex-col bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        {/* Calendar Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-sm font-black text-slate-800">
              {weekDays[0]?.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}
              {' — '}
              {weekDays[6]?.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' })}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">Week view · Click a slot to view details</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentDate(new Date())}
              className="text-[10px] font-bold text-[#0052CC] hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => navigateWeek(-1)}
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-[#0052CC]/10 text-slate-500 hover:text-[#0052CC] flex items-center justify-center transition-all"
            >
              <BiChevronLeft size={16} />
            </button>
            <button
              onClick={() => navigateWeek(1)}
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-[#0052CC]/10 text-slate-500 hover:text-[#0052CC] flex items-center justify-center transition-all"
            >
              <BiChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-8 border-b border-slate-100 shrink-0 pl-10">
          {weekDays.map((day, i) => {
            const isToday = day.toDateString() === today.toDateString();
            return (
              <div key={i} className="py-2 text-center border-l border-slate-100">
                <p className={`text-[10px] font-bold uppercase tracking-wide ${isToday ? 'text-[#0052CC]' : 'text-slate-400'}`}>
                  {DAYS[i]}
                </p>
                <p className={`text-sm font-black mt-0.5 ${isToday ? 'text-white bg-[#0052CC] w-6 h-6 rounded-full flex items-center justify-center mx-auto text-xs' : 'text-slate-600'}`}>
                  {day.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Grid Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <BiLoader className="text-[#0052CC] text-2xl animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="relative grid grid-cols-8 min-h-[728px]">
              {/* Hour labels */}
              <div className="col-span-1">
                {HOURS.map((h) => (
                  <div key={h} className="h-14 flex items-start justify-end pr-2 pt-1">
                    <span className="text-[10px] text-slate-300 font-bold">{String(h).padStart(2, '0')}:00</span>
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
                  <div key={dayIdx} className="col-span-1 border-l border-slate-100 relative">
                    {HOURS.map((h) => (
                      <div key={h} className="h-14 border-b border-slate-50" />
                    ))}
                    {/* Events overlay */}
                    {dayEvents.map((evt) => {
                      const startMins = toMinutes(evt.start) - 8 * 60;
                      const endMins = toMinutes(evt.end) - 8 * 60;
                      const top = (startMins / 60) * 56;
                      const height = Math.max(((endMins - startMins) / 60) * 56, 28);
                      const col = eventColor(evt.status, evt.riskColor);

                      return (
                        <button
                          key={evt.id}
                          onClick={() => setSelectedEvent(evt)}
                          className={`absolute inset-x-0.5 rounded-lg border px-1 py-0.5 text-left overflow-hidden transition-all hover:z-10 hover:shadow-md ${col.bg} ${col.text}`}
                          style={{ top: `${top}px`, height: `${height}px` }}
                          title={`${evt.patientName} — ${evt.reason}`}
                        >
                          <div className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${col.dot}`} />
                            <span className="text-[9px] font-black truncate leading-tight">{evt.patientName.split(' ')[0]}</span>
                          </div>
                          {height > 40 && (
                            <div className="flex items-center gap-0.5 mt-0.5 opacity-70">
                              {typeIcon(evt.type, 9)}
                              <span className="text-[8px]">{new Date(evt.start).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          )}
                        </button>
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
        <div className="fixed inset-0 z-[120] flex items-center justify-end p-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-xs bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-right duration-400">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#0052CC]/5 to-[#00A3BF]/5">
              <div>
                <h4 className="text-sm font-black text-slate-800">{selectedEvent.patientName}</h4>
                <p className="text-[10px] text-slate-400">{selectedEvent.reason}</p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <BiX size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-xl p-2.5">
                  <p className="text-[10px] text-slate-400 font-medium">Time</p>
                  <p className="text-xs font-bold text-slate-700">
                    {new Date(selectedEvent.start).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                    {' – '}
                    {new Date(selectedEvent.end).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5">
                  <p className="text-[10px] text-slate-400 font-medium">Type</p>
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    {typeIcon(selectedEvent.type, 12)} {selectedEvent.type}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-slate-400 font-medium">Risk Score</p>
                <RiskScoreCard score={selectedEvent.riskScore} color={selectedEvent.riskColor} factors={selectedEvent.riskFactors} size="sm" />
              </div>
              {selectedEvent.aiRecommendations.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-[10px] font-black text-[#0052CC] mb-1 uppercase tracking-wide">AI Recommendations</p>
                  <ul className="space-y-1">
                    {selectedEvent.aiRecommendations.slice(0, 3).map((rec, i) => (
                      <li key={i} className="text-[10px] text-blue-700 flex items-start gap-1">
                        <span className="text-[#0052CC] shrink-0">→</span> {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button className="flex-1 py-2 bg-[#0052CC] hover:bg-[#0047B3] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5">
                  {typeIcon(selectedEvent.type, 13)} Join
                </button>
                <button
                  onClick={() => {
                    setSoapModal({ isOpen: true, consultationId: selectedEvent.consultationId, patientName: selectedEvent.patientName });
                    setSelectedEvent(null);
                  }}
                  className="flex-1 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border border-purple-100"
                >
                  <BiNote size={13} /> SOAP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SoapNoteModal
        isOpen={soapModal.isOpen}
        onClose={() => setSoapModal({ isOpen: false, consultationId: '', patientName: '' })}
        consultationId={soapModal.consultationId}
        patientName={soapModal.patientName}
      />
    </>
  );
}
