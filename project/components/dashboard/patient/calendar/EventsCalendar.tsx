"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  BiPlus,
  BiLoaderAlt,
  BiTrendingUp,
  BiPencil,
  BiTrash,
} from "react-icons/bi";
import { Calendar as CalendarIcon, Clock, AlertCircle } from "lucide-react";
import AppointmentCalendarView from "@/components/shared/Appointments/AppointmentCalendarView";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { toast } from "react-hot-toast";
import { Appointment } from "@/lib/hooks/useAppointments";

// ─── Local date/time helpers (avoid UTC drift from toISOString) ────────────
function toLocalDateStr(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalTimeStr(d: Date) {
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function roundUpToNext30(d: Date) {
  const result = new Date(d);
  const minutes = result.getMinutes();
  const remainder = minutes % 30;
  if (remainder !== 0) result.setMinutes(minutes + (30 - remainder));
  result.setSeconds(0, 0);
  return result;
}

function isDateTimeInPast(dateStr: string, timeStr: string) {
  if (!dateStr || !timeStr) return false;
  return new Date(`${dateStr}T${timeStr}`).getTime() < Date.now();
}

function createDefaultAddForm() {
  const now = new Date();
  const rounded = roundUpToNext30(now);
  return {
    title: "",
    date: toLocalDateStr(now),
    time: toLocalTimeStr(rounded),
    type: "reminder" as "reminder" | "note",
    notes: "",
  };
}

const QUICK_TIME_SLOTS = [
  { label: "Morning", time: "09:00" },
  { label: "Afternoon", time: "13:00" },
  { label: "Evening", time: "18:00" },
];

type EventFilterType = "all" | "doctor" | "reminder" | "refill" | "note";

const EVENT_FILTER_TABS: EventFilterType[] = [
  "all",
  "doctor",
  "reminder",
  "refill",
  "note",
];

/** Mirrors the badge/underline pattern in AppointmentTabs.tsx for design-system consistency. */
const eventTabConfig: Record<
  EventFilterType,
  { label: string; badgeBg: string; badgeText: string }
> = {
  all: { label: "All", badgeBg: "bg-primary", badgeText: "text-white" },
  doctor: {
    label: "Appointments",
    badgeBg: "bg-primary",
    badgeText: "text-white",
  },
  reminder: {
    label: "Reminders",
    badgeBg: "bg-warning-500",
    badgeText: "text-warning-50",
  },
  refill: {
    label: "Refills",
    badgeBg: "bg-success-500",
    badgeText: "text-success-50",
  },
  note: { label: "Notes", badgeBg: "bg-info-500", badgeText: "text-info-50" },
};

interface AgendaItem {
  id: string;
  type: "doctor" | "refill" | "reminder" | "note" | "appointment";
  title?: string;
  dr?: string;
  field?: string;
  date: string; // e.g. "Mon Jan 01 2026"
  time: string; // e.g. "09:00 AM"
  concern?: string;
  status?: string;
}

const EVENT_TYPES = [
  { label: "Reminder", value: "reminder", icon: <BiTrendingUp /> },
  { label: "Note", value: "note", icon: <BiPencil /> },
];

export default function EventsCalendar() {
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<EventFilterType>("all");

  const [selectedEvent, setSelectedEvent] = useState<AgendaItem | null>(null);
  const [selectedDay, setSelectedDay] = useState<{
    date: Date;
    items: AgendaItem[];
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add-event modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [addForm, setAddForm] = useState(createDefaultAddForm);

  const todayStr = toLocalDateStr(new Date());
  const isFormDateToday = addForm.date === todayStr;
  const minTimeForSelectedDate = isFormDateToday
    ? toLocalTimeStr(new Date())
    : undefined;
  const isPastSelection = isDateTimeInPast(addForm.date, addForm.time);

  const fetchAgenda = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/patient/agenda");
      if (res.ok) setAgenda(await res.json());
    } catch {
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgenda();
  }, [fetchAgenda]);

  // Reset to a fresh, always-future date/time whenever the modal is (re)opened
  useEffect(() => {
    if (showAddModal) setAddForm(createDefaultAddForm());
  }, [showAddModal]);

  const filtered = useMemo(() => {
    if (selectedType === "all") return agenda;
    if (selectedType === "doctor")
      return agenda.filter((a) => a.type === "doctor");
    return agenda.filter((a) => a.type === selectedType);
  }, [agenda, selectedType]);

  const typeCounts = useMemo(() => {
    const counts: Partial<Record<EventFilterType, number>> = {
      all: agenda.length,
    };
    agenda.forEach((item) => {
      const key = item.type as EventFilterType;
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [agenda]);

  // Map agenda items -> Appointment shape expected by AppointmentCalendarView
  const calendarAppointments = useMemo<Appointment[]>(
    () =>
      filtered.map((item) => {
        const start = new Date(`${item.date} ${item.time}`);
        return {
          id: item.id,
          patientName: "",
          practitionerName:
            item.type === "doctor"
              ? item.dr
              : item.title || labelForType(item.type),
          scheduledStart: start.toISOString(),
          scheduledEnd: new Date(start.getTime() + 30 * 60000).toISOString(),
          computedStatus: item.status || "upcoming",
          status: item.status,
          notes: item.concern,
          specialisation: item.type === "doctor" ? item.field : item.type,
        } as unknown as Appointment;
      }),
    [filtered],
  );

  const eventById = useMemo(() => {
    const map = new Map<string, AgendaItem>();
    filtered.forEach((item) => map.set(String(item.id), item));
    return map;
  }, [filtered]);

  const handleAppointmentClick = (appt: Appointment) => {
    const original = eventById.get(String(appt.id));
    if (original) setSelectedEvent(original);
  };

  const handleDayClick = (date: Date, dayAppointments: Appointment[]) => {
    const items = dayAppointments
      .map((appt) => eventById.get(String(appt.id)))
      .filter((item): item is AgendaItem => !!item);
    setSelectedDay({ date, items });
  };

  const handleAddSubmit = async () => {
    if (!addForm.title.trim()) return;
    if (isDateTimeInPast(addForm.date, addForm.time)) {
      toast.error("Please choose a future date and time");
      return;
    }
    setIsSaving(true);
    try {
      const dateStr = new Date(`${addForm.date}T00:00:00`).toDateString();
      const res = await fetch("/api/patient/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addForm, date: dateStr }),
      });
      if (res.ok) {
        await fetchAgenda();
        setShowAddModal(false);
        setAddForm(createDefaultAddForm());
        toast.success("Event added to calendar");
      } else {
        toast.error("Failed to save event");
      }
    } catch {
      toast.error("Failed to save event");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (event: AgendaItem) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/patient/agenda/${event.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchAgenda();
        toast.success("Event removed");
        setSelectedEvent(null);
      }
    } catch {
      toast.error("Failed to remove event");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumbs */}

      {/* Page Header */}
      <div className="px-4 lg:px-0">
        <PageHeader
          title="Events Calendar"
          subtitle="View all your appointments, reminders, refills, and notes in one place"
          right={
            <Button onClick={() => setShowAddModal(true)} size="sm">
              Add Event
            </Button>
          }
        />
      </div>

      {/* Type Filter — mirrors AppointmentTabs.tsx for design-system consistency */}
      {/* Mobile Dropdown */}
      <div className="sm:hidden">
        <Select
          value={selectedType}
          onChange={(val) => setSelectedType(val as EventFilterType)}
          options={EVENT_FILTER_TABS.map((t) => ({
            value: t,
            label: `${eventTabConfig[t].label} (${typeCounts[t] ?? 0})`,
          }))}
          icon={<CalendarIcon size={18} className="text-ink-600" />}
        />
      </div>

      {/* Desktop: Underline Tab Design (Design System Pattern) */}
      <div className="hidden sm:flex gap-1 border-b border-border overflow-x-auto no-scrollbar pb-0">
        {EVENT_FILTER_TABS.map((t) => {
          const config = eventTabConfig[t];
          const count = typeCounts[t] ?? 0;
          const isActive = selectedType === t;

          return (
            <button
              key={t}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => setSelectedType(t)}
              className={`
                relative flex items-center gap-2 px-4 py-3 text-sm font-semibold
                whitespace-nowrap transition-colors
                ${isActive ? "text-primary" : "text-ink-600 hover:text-ink-900"}
              `}
            >
              <span>{config.label}</span>
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${config.badgeBg} ${config.badgeText}`}
                >
                  {count}
                </span>
              )}
              {isActive && (
                <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Calendar View */}
      <Card noPadding className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-ink-600">Loading events...</div>
        ) : (
          <AppointmentCalendarView
            appointments={calendarAppointments}
            onAppointmentClick={handleAppointmentClick}
            onDayClick={handleDayClick}
            userType="patient"
            emptyMessage="No events yet — click Add Event to create your first reminder, refill, or note."
          />
        )}
      </Card>

      {/* Day Detail Modal — opened by tapping a day cell on small screens,
          where individual event chips collapse to dots (see AppointmentCalendarView) */}
      <Modal
        isOpen={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        title={
          selectedDay
            ? selectedDay.date.toLocaleDateString("en-ZA", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })
            : "Day Events"
        }
      >
        {selectedDay && (
          <div className="space-y-2">
            {selectedDay.items.length === 0 ? (
              <p className="text-sm text-ink-600 py-4 text-center">
                No events on this day.
              </p>
            ) : (
              selectedDay.items.map((item) => {
                const config =
                  eventTabConfig[
                    item.type === "doctor"
                      ? "doctor"
                      : (item.type as EventFilterType)
                  ];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedDay(null);
                      setSelectedEvent(item);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-surface-soft transition-colors text-left"
                  >
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${config.badgeBg} ${config.badgeText}`}
                    >
                      {config.label}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-ink-900 truncate">
                        {item.title || item.dr || labelForType(item.type)}
                      </span>
                      <span className="block text-xs text-ink-600">
                        {item.time}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </Modal>

      {/* Event Details Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title || selectedEvent?.dr || "Event Details"}
      >
        {selectedEvent && (
          <div className="space-y-4">
            <p className="text-sm text-ink-600">
              {new Date(
                `${selectedEvent.date} ${selectedEvent.time}`,
              ).toLocaleString("en-ZA", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {selectedEvent.concern && (
              <p className="text-sm text-ink-900">{selectedEvent.concern}</p>
            )}
            {selectedEvent.type !== "doctor" && (
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  icon={<BiTrash />}
                  disabled={isDeleting}
                  onClick={() => handleDelete(selectedEvent)}
                >
                  {isDeleting ? "Removing..." : "Delete"}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add Event Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Event"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() =>
                    setAddForm({ ...addForm, type: opt.value as any })
                  }
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                    addForm.type === opt.value
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-slate-500 border-slate-200 hover:border-primary/50"
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Date"
                  type="date"
                  icon={<CalendarIcon size={18} />}
                  min={todayStr}
                  value={addForm.date}
                  onChange={(e) => {
                    const nextDate = e.target.value;
                    setAddForm((prev) => {
                      // Bumping to today shouldn't leave a stale past time behind
                      if (
                        nextDate === todayStr &&
                        isDateTimeInPast(nextDate, prev.time)
                      ) {
                        return {
                          ...prev,
                          date: nextDate,
                          time: toLocalTimeStr(roundUpToNext30(new Date())),
                        };
                      }
                      return { ...prev, date: nextDate };
                    });
                  }}
                />
                <Input
                  label="Time"
                  type="time"
                  icon={<Clock size={18} />}
                  min={minTimeForSelectedDate}
                  value={addForm.time}
                  onChange={(e) =>
                    setAddForm({ ...addForm, time: e.target.value })
                  }
                />
              </div>

              {/* Quick date picks */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Today", date: toLocalDateStr(new Date()) },
                  {
                    label: "Tomorrow",
                    date: toLocalDateStr(new Date(Date.now() + 86400000)),
                  },
                  {
                    label: "Next Week",
                    date: toLocalDateStr(new Date(Date.now() + 7 * 86400000)),
                  },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() =>
                      setAddForm((prev) => {
                        if (isDateTimeInPast(opt.date, prev.time)) {
                          return {
                            ...prev,
                            date: opt.date,
                            time: toLocalTimeStr(roundUpToNext30(new Date())),
                          };
                        }
                        return { ...prev, date: opt.date };
                      })
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      addForm.date === opt.date
                        ? "bg-primary/10 text-primary border-primary/40"
                        : "bg-white text-slate-500 border-slate-200 hover:border-primary/40"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}

                {/* Quick time picks */}
                <span className="w-px bg-slate-200 mx-1" />
                {QUICK_TIME_SLOTS.map((slot) => {
                  const disabled = isDateTimeInPast(addForm.date, slot.time);
                  return (
                    <button
                      key={slot.label}
                      type="button"
                      disabled={disabled}
                      title={
                        disabled ? "This time has already passed" : undefined
                      }
                      onClick={() =>
                        setAddForm({ ...addForm, time: slot.time })
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        disabled
                          ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                          : addForm.time === slot.time
                            ? "bg-primary/10 text-primary border-primary/40"
                            : "bg-white text-slate-500 border-slate-200 hover:border-primary/40"
                      }`}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>

              {isPastSelection && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-danger-700">
                  <AlertCircle size={14} />
                  Please choose a future date and time.
                </p>
              )}
            </div>

            {addForm.type === "reminder" && (
              <>
                <Input
                  label="Reminder Title"
                  type="text"
                  placeholder="e.g. Take medication"
                  value={addForm.title}
                  onChange={(e) =>
                    setAddForm({ ...addForm, title: e.target.value })
                  }
                />
                <Input
                  label="Notes (optional)"
                  textarea
                  placeholder="Additional info..."
                  value={addForm.notes}
                  onChange={(e) =>
                    setAddForm({ ...addForm, notes: e.target.value })
                  }
                />
              </>
            )}

            {addForm.type === "note" && (
              <>
                <Input
                  label="Note Title"
                  type="text"
                  placeholder="e.g. Blood pressure reading"
                  value={addForm.title}
                  onChange={(e) =>
                    setAddForm({ ...addForm, title: e.target.value })
                  }
                />
                <Input
                  label="Note Content"
                  textarea
                  placeholder="Write your note here..."
                  value={addForm.notes}
                  onChange={(e) =>
                    setAddForm({ ...addForm, notes: e.target.value })
                  }
                />
              </>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={isSaving || isPastSelection || !addForm.title.trim()}
              onClick={handleAddSubmit}
            >
              {isSaving ? <BiLoaderAlt className="animate-spin mr-2" /> : ""}
              Save Event
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function labelForType(type: string) {
  switch (type) {
    case "reminder":
      return "Reminder";
    case "refill":
      return "Refill";
    case "note":
      return "Note";
    default:
      return "Event";
  }
}
