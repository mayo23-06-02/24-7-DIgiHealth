"use client";
import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppointmentCalendarView from "@/components/shared/Appointments/AppointmentCalendarView";
import ViewToggle, { AppointmentView } from "@/components/shared/Appointments/ViewToggle";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Card from "@/components/ui/Card";
import { toast } from "react-hot-toast";

interface CalendarEvent {
  id: string;
  title: string;
  type: "appointment" | "reminder" | "refill" | "note";
  date: string;
  description?: string;
  status?: string;
  doctorName?: string;
  doctorSpecialization?: string;
}

export default function EventsCalendar() {
  const router = useRouter();
  const [view, setView] = useState<AppointmentView>("calendar");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | "appointment" | "reminder" | "refill" | "note">("all");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllEvents();
  }, []);

  const fetchAllEvents = async () => {
    try {
      setLoading(true);
      const [appointmentsRes, remindersRes] = await Promise.all([
        fetch("/api/patient/appointments"),
        fetch("/api/patient/events"),
      ]);

      let allEvents: CalendarEvent[] = [];

      if (appointmentsRes.ok) {
        const appointments = await appointmentsRes.json();
        allEvents = allEvents.concat(
          appointments.map((a: any) => ({
            id: a.id,
            title: `Appointment with ${a.doctorName || "Dr."}`,
            type: "appointment" as const,
            date: a.scheduledStart,
            description: a.notes,
            status: a.computedStatus,
            doctorName: a.doctorName,
            doctorSpecialization: a.specialisation,
          }))
        );
      }

      if (remindersRes.ok) {
        const reminders = await remindersRes.json();
        allEvents = allEvents.concat(
          reminders.map((r: any) => ({
            id: r.id,
            title: r.title,
            type: (r.type || "reminder") as "reminder" | "refill" | "note",
            date: r.date,
            description: r.description,
            status: r.status,
          }))
        );
      }

      setEvents(allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    } catch (error) {
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = events;

    if (selectedType !== "all") {
      list = list.filter((e) => e.type === selectedType);
    }

    if (search) {
      list = list.filter((e) =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (dateFrom) {
      list = list.filter((e) => new Date(e.date) >= new Date(dateFrom));
    }

    if (dateTo) {
      const d = new Date(dateTo);
      d.setHours(23, 59, 59, 999);
      list = list.filter((e) => new Date(e.date) <= d);
    }

    return list;
  }, [events, selectedType, search, dateFrom, dateTo]);

  // Transform events to appointment format for calendar view
  const calendarAppointments = filtered.map((event) => ({
    id: event.id,
    patientName: "",
    doctorName: event.doctorName || event.title,
    scheduledStart: event.date,
    scheduledEnd: new Date(new Date(event.date).getTime() + 60 * 60 * 1000).toISOString(),
    computedStatus: event.status || "upcoming",
    notes: event.description,
    specialisation: event.doctorSpecialization || event.type,
  })) as any[];

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/patient" },
          { label: "Calendar", current: true },
        ]}
      />

      {/* Page Header */}
      <PageHeader
        title="Events Calendar"
        description="View all your appointments, reminders, refills, and notes in one place"
      />

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["all", "appointment", "reminder", "refill", "note"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                selectedType === type
                  ? "bg-primary text-white"
                  : "bg-surface-soft text-ink-600 hover:bg-surface"
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
        <ViewToggle view={view} onViewChange={setView} />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm"
          />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm"
          />
        </div>
      </Card>

      {/* Calendar View */}
      {view === "calendar" && (
        <Card>
          <AppointmentCalendarView appointments={calendarAppointments} />
        </Card>
      )}

      {/* List View */}
      {view === "list" && (
        <Card className="p-0 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-ink-600">Loading events...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-ink-600">No events found</div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((event) => (
                <div
                  key={event.id}
                  className="p-4 hover:bg-surface-soft transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            event.type === "appointment"
                              ? "bg-blue-100 text-blue-700"
                              : event.type === "reminder"
                                ? "bg-yellow-100 text-yellow-700"
                                : event.type === "refill"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {event.type.toUpperCase()}
                        </span>
                        {event.status && (
                          <span className="text-xs text-ink-600 capitalize">
                            ({event.status})
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2 font-semibold text-ink-900">
                        {event.title}
                      </h3>
                      {event.description && (
                        <p className="mt-1 text-sm text-ink-600">
                          {event.description}
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-ink-600 whitespace-nowrap ml-4">
                      {new Date(event.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
