"use client";

import React, { useState, useMemo, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import Select from "@/components/ui/Select";
import {
  BiPlus,
  BiDownload,
  BiCalendar,
  BiCalendarEvent,
  BiCalendarEdit,
  BiCalendarCheck,
  BiCalendarExclamation,
  BiCalendarX,
  BiCalendarPlus,
} from "react-icons/bi";
import AppointmentList from "@/components/shared/Appointments/AppointmentList";
import AppointmentFilters from "@/components/shared/Appointments/AppointmentFilters";
import BookingModal from "@/components/doctor/BookingModal";
import SoapNoteModal from "@/components/dashboard/practitioner/SoapNoteModal";
import { useAppointments } from "@/lib/hooks/useAppointments";

type Tab =
  "all" | "upcoming" | "ongoing" | "past" | "missed" | "cancelled" | "requests";

const tabConfig: Record<
  Tab,
  {
    label1: string;
    label2: string;
    icon: any;
    bgColor: string;
    iconColor: string;
  }
> = {
  all: {
    label1: "All",
    label2: "Appointments",
    icon: BiCalendar,
    bgColor: "#d6e8f4",
    iconColor: "text-purple-600",
  },
  upcoming: {
    label1: "Upcoming",
    label2: "Appointments",
    icon: BiCalendarEvent,
    bgColor: "#d6e8f4",
    iconColor: "text-[#8b9a46]",
  },
  ongoing: {
    label1: "Ongoing",
    label2: "Appointments",
    icon: BiCalendarEdit,
    bgColor: "#d6e8f4",
    iconColor: "text-blue-600",
  },
  past: {
    label1: "Completed",
    label2: "Appointments",
    icon: BiCalendarCheck,
    bgColor: "#d6e8f4",
    iconColor: "text-green-700",
  },
  missed: {
    label1: "Missed",
    label2: "Appointments",
    icon: BiCalendarExclamation,
    bgColor: "#d6e8f4",
    iconColor: "text-orange-600",
  },
  cancelled: {
    label1: "Cancelled",
    label2: "Appointments",
    icon: BiCalendarX,
    bgColor: "#d6e8f4",
    iconColor: "text-red-500",
  },
  requests: {
    label1: "Appointment",
    label2: "Requests",
    icon: BiCalendarPlus,
    bgColor: "#d6e8f4",
    iconColor: "text-yellow-700",
  },
};

export default function PractitionerAppointments() {
  const router = useRouter();
  const { appointments, loading, fetchAppointments } = useAppointments(
    "/api/practitioner/appointments?tab=all",
  );
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showBooking, setShowBooking] = useState(false);
  const [editingApptId, setEditingApptId] = useState<string | null>(null);
  const [editingPatient, setEditingPatient] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editingInitialForm, setEditingInitialForm] = useState<any>(null);
  const [soapModal, setSoapModal] = useState({
    isOpen: false,
    consultationId: "",
    patientName: "",
  });

  const tabs: Tab[] = [
    "all",
    "upcoming",
    "ongoing",
    "past",
    "missed",
    "cancelled",
    "requests",
  ];

  // ─── Filtered and sorted list ──────────────────────────────────────
  const filtered = useMemo(() => {
    let list = appointments;
    if (activeTab !== "all") {
      list = list.filter((a) => a.computedStatus === activeTab);
    }
    if (search) {
      list = list.filter((a) =>
        a.patientName.toLowerCase().includes(search.toLowerCase()),
      );
    }
    if (dateFrom) {
      list = list.filter(
        (a) => new Date(a.scheduledStart) >= new Date(dateFrom),
      );
    }
    if (dateTo) {
      const d = new Date(dateTo);
      d.setHours(23, 59, 59, 999);
      list = list.filter((a) => new Date(a.scheduledStart) <= d);
    }
    if (typeFilter && typeFilter !== "all") {
      list = list.filter((a) => (a.type || "video").toLowerCase() === typeFilter);
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

  // ─── Counts per tab ──────────────────────────────────────────────
  const counts = useMemo(() => {
    const result: Record<Tab, number> = {} as any;
    tabs.forEach((t) => {
      let list = appointments;
      if (t !== "all") {
        list = list.filter((a) => a.computedStatus === t);
      }
      result[t] = list.length;
    });
    return result;
  }, [appointments]);

  // ─── Actions ──────────────────────────────────────────────────────
  const handleJoin = async (id: string) => {
    const appt = appointments.find((a) => a.id === id);
    if (!appt) return;
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: appt.patientId }),
      });
      const data = await res.json();
      if (res.ok && data.conversationId) {
        router.push(
          `/practitioner/messages?chatId=${data.conversationId}&join=video`,
        );
      } else {
        toast.error("Unable to join consultation room");
      }
    } catch {
      toast.error("Unable to join consultation room");
    }
  };

  const handleAccept = async (id: string) => {
    try {
      const res = await fetch(`/api/practitioner/appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "scheduled" }),
      });
      if (res.ok) {
        toast.success("Appointment accepted");
        fetchAppointments(false);
      } else {
        toast.error("Failed to accept");
      }
    } catch {
      toast.error("Error accepting appointment");
    }
  };

  const handleDecline = async (id: string) => {
    try {
      const res = await fetch(`/api/practitioner/appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (res.ok) {
        toast.success("Appointment declined");
        fetchAppointments(false);
      } else {
        toast.error("Failed to decline");
      }
    } catch {
      toast.error("Error declining appointment");
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel/decline this appointment?")) return;
    try {
      const res = await fetch(`/api/practitioner/appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
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

  const handleEdit = (id: string) => {
    const appt = appointments.find((a) => a.id === id);
    if (!appt) return;
    const start = new Date(appt.scheduledStart);
    setEditingApptId(id);
    setEditingPatient({ id: appt.patientId, name: appt.patientName });
    setEditingInitialForm({
      date: start.toISOString().split("T")[0],
      time: start.toTimeString().slice(0, 5),
      type: appt.type,
      reason: appt.reason,
      durationMinutes: 30,
    });
    setShowBooking(true);
  };

  const handleRebook = (id: string) => {
    const appt = appointments.find((a) => a.id === id);
    if (!appt) return;
    setEditingApptId(null); // Don't set this so it creates a new appointment
    setEditingPatient({ id: appt.patientId, name: appt.patientName });
    setEditingInitialForm({
      type: appt.type,
      reason: appt.reason,
      durationMinutes: 30,
    });
    setShowBooking(true);
  };

  const handleExport = () => {
    // Simple CSV export
    const headers = ["Patient", "Date", "Time", "Type", "Status", "Reason"];
    const rows = filtered.map((a) => [
      a.patientName,
      new Date(a.scheduledStart).toLocaleDateString("en-ZA"),
      new Date(a.scheduledStart).toLocaleTimeString("en-ZA", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      a.type,
      a.computedStatus || a.status,
      a.reason || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `appointments_${activeTab}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinical Appointments"
        subtitle="Manage your consultation schedule and patient requests."
        right={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="hidden sm:flex"
              icon={<BiDownload />}
              iconPosition="left"
              onClick={handleExport}
            >
              Export
            </Button>
            <Button
              onClick={() => {
                setEditingApptId(null);
                setEditingPatient(null);
                setEditingInitialForm(null);
                setShowBooking(true);
              }}
              icon={<BiPlus />}
              iconPosition="left"
            >
              New Appointment
            </Button>
          </div>
        }
      />

      {/* Tabs - Mobile Dropdown */}
      <div className="md:hidden pb-4">
        <Select
          value={activeTab}
          onChange={(val) => setActiveTab(val as Tab)}
          options={tabs.map((t) => ({
            value: t,
            label: `${tabConfig[t].label1} ${tabConfig[t].label2} (${counts[t] || 0})`,
          }))}
          icon={<BiCalendar className="text-slate-500 text-lg" />}
        />
      </div>

      {/* Tabs - Desktop Cards */}
      <div className="hidden md:flex gap-2 overflow-x-auto custom-scrollbar pb-4 w-full">
        {tabs.map((t) => {
          const config = tabConfig[t];
          const Icon = config.icon;
          return (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex items-center gap-3 cursor-pointer p-3 ease-in-out duration-300 py-4 rounded-lg transition-all min-w-[180px] text-left border-2 ${
                activeTab === t
                  ? "border-gray-400 opacity-100"
                  : "border-transparent opacity-80 hover:opacity-100 hover:scale-[1.02]"
              }`}
              style={{ backgroundColor: config.bgColor }}
            >
              <Icon className={`${config.iconColor} text-2xl shrink-0`} />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-slate-900 leading-none">
                  {counts[t] || 0}
                </span>
                <span className="text-xs font-medium text-slate-600 leading-tight mt-0.5">
                  {config.label1}
                  <br />
                  {config.label2}
                </span>
              </div>
            </button>
          );
        })}
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
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        onClearDates={() => {
          setDateFrom("");
          setDateTo("");
        }}
      />

      {/* List */}
      <div className="">
        {loading ? (
          <div className="animate-pulse space-y-3">Loading...</div>
        ) : (
          <AppointmentList
            appointments={filtered}
            onJoin={handleJoin}
            onEdit={handleEdit}
            onCancel={handleCancel}
            onAccept={handleAccept}
            onDecline={handleDecline}
            onRebook={handleRebook}
            emptyMessage={`No ${activeTab} appointments`}
          />
        )}
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={showBooking}
        mode="practitioner"
        editingApptId={editingApptId}
        patient={editingPatient}
        initialForm={editingInitialForm ?? undefined}
        onClose={() => {
          setShowBooking(false);
          setEditingApptId(null);
          setEditingPatient(null);
          setEditingInitialForm(null);
        }}
        onSuccess={() => fetchAppointments(false)}
      />

      {/* SOAP Modal */}
      <SoapNoteModal
        isOpen={soapModal.isOpen}
        onClose={() =>
          setSoapModal({ isOpen: false, consultationId: "", patientName: "" })
        }
        consultationId={soapModal.consultationId}
        patientName={soapModal.patientName}
      />
    </div>
  );
}
