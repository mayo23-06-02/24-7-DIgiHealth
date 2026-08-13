"use client";
import React, { useMemo, useState } from "react";
import { BiChevronLeft, BiChevronRight } from "react-icons/bi";
import { Appointment } from "@/lib/hooks/useAppointments";

interface Props {
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  userType: "patient" | "practitioner";
  emptyMessage?: string;
  /** Small screens render a compact dot-per-event day cell (see design note
   * above the grid) — tapping the day, rather than an individual chip, opens
   * a day-detail view. Optional: callers that don't pass it keep the desktop
   * per-event-chip behavior at every width. */
  onDayClick?: (date: Date, dayAppointments: Appointment[]) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE_PER_DAY = 3;
const MAX_VISIBLE_DOTS = 4;

function chipClasses(appt: Appointment) {
  const status = appt.computedStatus || appt.status;
  switch (status) {
    case "requests":
      return "bg-amber-100 text-amber-800 hover:bg-amber-200";
    case "ongoing":
      return "bg-blue-100 text-blue-700 hover:bg-blue-200";
    case "missed":
    case "cancelled":
      return "bg-red-100 text-red-700 hover:bg-red-200";
    case "upcoming":
      return "bg-accent/40 text-slate-800 hover:bg-accent/60";
    default:
      return "bg-primary/10 text-primary hover:bg-primary/20";
  }
}

function dotClasses(appt: Appointment) {
  const status = appt.computedStatus || appt.status;
  switch (status) {
    case "requests":
      return "bg-amber-500";
    case "ongoing":
      return "bg-blue-500";
    case "missed":
    case "cancelled":
      return "bg-red-500";
    case "upcoming":
      return "bg-accent";
    default:
      return "bg-primary";
  }
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function AppointmentCalendarView({
  appointments,
  onAppointmentClick,
  userType,
  emptyMessage = "No appointments in this period",
  onDayClick,
}: Props) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const today = new Date();

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    appointments.forEach((appt) => {
      if (!appt.scheduledStart) return;
      const d = new Date(appt.scheduledStart);
      const key = dayKey(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(appt);
    });
    map.forEach((list) =>
      list.sort(
        (a, b) =>
          new Date(a.scheduledStart).getTime() -
          new Date(b.scheduledStart).getTime(),
      ),
    );
    return map;
  }, [appointments]);

  const weeks = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = firstOfMonth.getDay();
    const gridStart = new Date(year, month, 1 - startOffset);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      days.push(
        new Date(
          gridStart.getFullYear(),
          gridStart.getMonth(),
          gridStart.getDate() + i,
        ),
      );
    }
    const result: Date[][] = [];
    for (let i = 0; i < 6; i++) result.push(days.slice(i * 7, i * 7 + 7));
    return result;
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });

  const hasAnyAppointments = appointments.length > 0;

  return (
    <div className="bg-white border border-slate-100 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100">
        <h3 className="text-lg font-bold text-slate-900 font-grotesk">
          {monthLabel}
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const d = new Date();
              d.setDate(1);
              d.setHours(0, 0, 0, 0);
              setCursor(d);
            }}
            className="px-3 py-2 text-xs font-bold uppercase rounded-full border border-slate-200 text-slate-600 hover:border-primary hover:text-primary transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Previous month"
            onClick={() =>
              setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))
            }
            className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <BiChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() =>
              setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))
            }
            className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <BiChevronRight size={18} />
          </button>
        </div>
      </div>

      {!hasAnyAppointments ? (
        <div className="py-12 text-center text-slate-400 font-medium">
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {weeks.flat().map((day, idx) => {
              const inMonth = day.getMonth() === cursor.getMonth();
              const key = dayKey(day);
              const dayAppts = byDay.get(key) || [];
              const isToday = isSameDay(day, today);
              const isExpanded = expandedDay === key;
              const visible = isExpanded
                ? dayAppts
                : dayAppts.slice(0, MAX_VISIBLE_PER_DAY);
              const hiddenCount = dayAppts.length - visible.length;

              const dayNumber = (
                <span
                  className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday
                      ? "bg-primary text-white"
                      : inMonth
                        ? "text-slate-700"
                        : "text-slate-300"
                  }`}
                >
                  {day.getDate()}
                </span>
              );

              return (
                <div
                  key={idx}
                  className={`min-h-[60px] sm:min-h-[110px] border-b border-r border-slate-100 ${
                    inMonth ? "bg-white" : "bg-slate-50/60"
                  }`}
                >
                  {/* Small screens: whole cell is a tap target, events collapse to
                      status-colored dots so the grid stays readable at 320-420px —
                      tapping opens the day-detail modal instead of an individual chip. */}
                  <button
                    type="button"
                    onClick={() => onDayClick?.(day, dayAppts)}
                    className="flex sm:hidden w-full h-full min-h-[60px] flex-col items-center gap-1 py-2 active:bg-slate-50 transition-colors"
                  >
                    {dayNumber}
                    {dayAppts.length > 0 && (
                      <span className="flex items-center gap-0.5">
                        {dayAppts.slice(0, MAX_VISIBLE_DOTS).map((appt) => (
                          <span
                            key={appt.id}
                            className={`w-1.5 h-1.5 rounded-full ${dotClasses(appt)}`}
                          />
                        ))}
                        {dayAppts.length > MAX_VISIBLE_DOTS && (
                          <span className="text-[9px] font-bold text-slate-400 leading-none">
                            +{dayAppts.length - MAX_VISIBLE_DOTS}
                          </span>
                        )}
                      </span>
                    )}
                  </button>

                  {/* sm+: full per-event chip list, unchanged */}
                  <div className="hidden sm:block p-1.5 sm:p-2">
                    <div className="flex items-center justify-between mb-1">
                      {dayNumber}
                    </div>
                    <div className="space-y-1">
                      {visible.map((appt) => {
                        const time = new Date(
                          appt.scheduledStart,
                        ).toLocaleTimeString("en-ZA", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        const label =
                          userType === "patient"
                            ? appt.practitionerName || appt.patientName
                            : appt.patientName;
                        return (
                          <button
                            key={appt.id}
                            type="button"
                            onClick={() => onAppointmentClick(appt)}
                            title={`${time} · ${label}`}
                            className={`w-full text-left truncate px-2 py-1 rounded text-[11px] font-semibold transition-colors ${chipClasses(appt)}`}
                          >
                            {time} {label}
                          </button>
                        );
                      })}
                      {hiddenCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedDay(key)}
                          className="w-full text-left px-2 text-[11px] font-bold text-primary hover:underline"
                        >
                          +{hiddenCount} more
                        </button>
                      )}
                      {isExpanded && dayAppts.length > MAX_VISIBLE_PER_DAY && (
                        <button
                          type="button"
                          onClick={() => setExpandedDay(null)}
                          className="w-full text-left px-2 text-[11px] font-bold text-slate-400 hover:underline"
                        >
                          Show less
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
