"use client";
import React, { useState, useMemo, useEffect } from "react";
import AppointmentList from "@/components/shared/Appointments/AppointmentList";
import AppointmentFilters from "@/components/shared/Appointments/AppointmentFilters";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import BookingModal from "@/components/doctor/BookingModal";
import { BiPlus } from "react-icons/bi";
import { toast } from "react-hot-toast";
import { useAppointments } from "@/lib/hooks/useAppointments";

type Tab =
  | "all"
  | "upcoming"
  | "ongoing"
  | "past"
  | "missed"
  | "cancelled"
  | "requests";

export default function PatientAppointments() {
  const { appointments, loading, fetchAppointments } = useAppointments(
    "/api/patient/appointments",
  );
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showBooking, setShowBooking] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // Tabs configuration
  const tabs: Tab[] = [
    "all",
    "upcoming",
    "ongoing",
    "past",
    "missed",
    "cancelled",
    "requests",
  ];

  // Filtered and sorted list
  const filtered = useMemo(() => {
    let list = appointments;
    if (activeTab !== "all")
      list = list.filter((a) => a.computedStatus === activeTab);
    if (search)
      list = list.filter((a) =>
        a.patientName.toLowerCase().includes(search.toLowerCase()),
      );
    if (dateFrom)
      list = list.filter(
        (a) => new Date(a.scheduledStart) >= new Date(dateFrom),
      );
    if (dateTo) {
      const d = new Date(dateTo);
      d.setHours(23, 59, 59, 999);
      list = list.filter((a) => new Date(a.scheduledStart) <= d);
    }
    list.sort((a, b) =>
      sortBy === "newest"
        ? new Date(b.scheduledStart).getTime() -
          new Date(a.scheduledStart).getTime()
        : new Date(a.scheduledStart).getTime() -
          new Date(b.scheduledStart).getTime(),
    );
    return list;
  }, [appointments, activeTab, search, dateFrom, dateTo, sortBy]);

  // Counts per tab
  const counts = useMemo(() => {
    const result: Record<Tab, number> = {} as any;
    tabs.forEach((t) => {
      let list = appointments;
      if (t !== "all") list = list.filter((a) => a.computedStatus === t);
      result[t] = list.length;
    });
    return result;
  }, [appointments]);

  // Actions
  const handleJoin = async (id: string) => {
    const appt = appointments.find((a) => a.id === id);
    if (!appt) return;
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: appt.practitionerId }),
      });
      const data = await res.json();
      if (res.ok && data.conversationId) {
        window.location.href = `/patient/messages?chatId=${data.conversationId}&join=video`;
      } else {
        toast.error("Unable to join consultation room");
      }
    } catch {
      toast.error("Unable to join consultation room");
    }
  };

  const handleReschedule = async (id: string) => {
    // Open reschedule modal (simplified: prompt for new time)
    const newDate = prompt("Enter new date (YYYY-MM-DD)");
    const newTime = prompt("Enter new time (HH:MM)");
    if (newDate && newTime) {
      const dt = new Date(`${newDate}T${newTime}`);
      if (isNaN(dt.getTime())) {
        toast.error("Invalid date/time");
        return;
      }
      if (dt < new Date()) {
        toast.error("Cannot reschedule to past");
        return;
      }
      try {
        const res = await fetch(`/api/consultations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduledStartTime: dt.toISOString() }),
        });
        if (res.ok) {
          toast.success("Rescheduled!");
          fetchAppointments(false);
        } else {
          const err = await res.json();
          toast.error(err.error || "Failed to reschedule");
        }
      } catch {
        toast.error("Error rescheduling");
      }
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this appointment?")) return;
    try {
      const res = await fetch(`/api/consultations/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Cancelled");
        fetchAppointments(false);
      } else {
        toast.error("Failed to cancel");
      }
    } catch {
      toast.error("Error cancelling");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinical Appointments"
        subtitle="Manage your scheduled consultations and medical history."
        right={
          <Button
            onClick={() => setShowBooking(true)}
            icon={<BiPlus size={18} />}
            iconPosition="left"
          >
            Book New
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1.5 bg-slate-50 rounded-2xl p-1 overflow-x-auto custom-scrollbar w-fit max-w-full">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 h-auto text-xs font-bold rounded-xl transition-all flex items-center gap-1 whitespace-nowrap ${
              activeTab === t
                ? "bg-primary text-white shadow-primary/20"
                : "text-slate-500 hover:text-slate-600"
            }`}
          >
            <span className="capitalize">{t}</span>
            <span
              className={`ml-1 px-2 py-0.5 rounded-lg text-[9px] font-bold border ${activeTab === t ? "bg-white/20 border-white/20 text-white" : "bg-white border-slate-100 text-slate-500"}`}
            >
              {counts[t] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <AppointmentFilters
        searchQuery={search}
        onSearchChange={setSearch}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onClearDates={() => {
          setDateFrom("");
          setDateTo("");
        }}
      />

      {/* List */}
      <Card className="p-4">
        {loading ? (
          <div className="animate-pulse space-y-3">Loading...</div>
        ) : (
          <AppointmentList
            appointments={filtered}
            onJoin={handleJoin}
            onEdit={handleReschedule}
            onCancel={handleCancel}
            emptyMessage={`No ${activeTab} appointments`}
          />
        )}
      </Card>

      {/* Booking Modal */}
      <BookingModal
        isOpen={showBooking}
        onClose={() => {
          setShowBooking(false);
          setSelectedDoctor(null);
        }}
        doctor={selectedDoctor}
        onSuccess={() => fetchAppointments(false)}
        mode="patient"
      />
    </div>
  );
}
