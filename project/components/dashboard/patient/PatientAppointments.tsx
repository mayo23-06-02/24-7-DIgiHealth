"use client";
import React, { useState, useMemo, useEffect } from "react";
import AppointmentList from "@/components/shared/Appointments/AppointmentList";
import AppointmentFilters from "@/components/shared/Appointments/AppointmentFilters";
import AppointmentDetailsModal from "@/components/shared/Appointments/AppointmentDetailsModal";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import BookingModal from "@/components/doctor/BookingModal";
import { BiPlus, BiCalendar, BiCalendarCheck, BiCalendarExclamation, BiCalendarX, BiCalendarPlus, BiGridAlt } from "react-icons/bi";
import Select from "@/components/ui/Select";
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

const tabConfig: Record<Tab, { label1: string; label2: string; icon: React.ElementType; bgColor: string; iconColor: string }> = {
  all: {
    label1: "All",
    label2: "Appointments",
    icon: BiGridAlt,
    bgColor: "#e8f0f4",
    iconColor: "text-slate-600",
  },
  upcoming: {
    label1: "Upcoming",
    label2: "Appointments",
    icon: BiCalendar,
    bgColor: "#fef9e7",
    iconColor: "text-yellow-600",
  },
  ongoing: {
    label1: "Ongoing",
    label2: "Appointments",
    icon: BiCalendarCheck,
    bgColor: "#e8f5e9",
    iconColor: "text-green-600",
  },
  past: {
    label1: "Completed",
    label2: "Appointments",
    icon: BiCalendarCheck,
    bgColor: "#d6e8f4",
    iconColor: "text-blue-600",
  },
  missed: {
    label1: "Missed",
    label2: "Appointments",
    icon: BiCalendarExclamation,
    bgColor: "#fff3e0",
    iconColor: "text-orange-500",
  },
  cancelled: {
    label1: "Cancelled",
    label2: "Appointments",
    icon: BiCalendarX,
    bgColor: "#fdecea",
    iconColor: "text-red-500",
  },
  requests: {
    label1: "Appointment",
    label2: "Requests",
    icon: BiCalendarPlus,
    bgColor: "#fef9e7",
    iconColor: "text-yellow-700",
  },
};

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
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

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

  const handleAccept = async (id: string) => {
    try {
      const res = await fetch(`/api/consultations/${id}/approve`, { method: "POST" });
      if (res.ok) {
        toast.success("Appointment accepted");
        fetchAppointments(false);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to accept");
      }
    } catch {
      toast.error("Error accepting");
    }
  };

  const handleDecline = async (id: string) => {
    if (!confirm("Decline this appointment request?")) return;
    try {
      const res = await fetch(`/api/consultations/${id}/decline`, { method: "POST" });
      if (res.ok) {
        toast.success("Appointment declined");
        fetchAppointments(false);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to decline");
      }
    } catch {
      toast.error("Error declining");
    }
  };

  const handleViewDoctorProfile = (doctorId: string) => {
    window.location.href = `/patient/doctors/${doctorId}`;
  };

  const handleAppointmentClick = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
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
            onAccept={handleAccept}
            onDecline={handleDecline}
            onClick={handleAppointmentClick}
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

      {/* Appointment Details Modal */}
      <AppointmentDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        userType="patient"
        onViewProfile={handleViewDoctorProfile}
      />
    </div>
  );
}
