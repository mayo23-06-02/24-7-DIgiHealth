"use client";
import React, { useState, useMemo, useEffect } from "react";
import AppointmentList from "@/components/shared/Appointments/AppointmentList";
import AppointmentFilters from "@/components/shared/Appointments/AppointmentFilters";
import AppointmentDetailsModal from "@/components/shared/Appointments/AppointmentDetailsModal";
import AppointmentTabs, {
  AppointmentTab,
  ALL_TABS,
} from "@/components/shared/Appointments/AppointmentTabs";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import BookingModal from "@/components/doctor/BookingModal";
import { BiPlus } from "react-icons/bi";
import { toast } from "react-hot-toast";
import { useAppointments } from "@/lib/hooks/useAppointments";

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
  const tabs = ALL_TABS;

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
      const res = await fetch(`/api/consultations/${id}/approve`, {
        method: "POST",
      });
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
      const res = await fetch(`/api/consultations/${id}/decline`, {
        method: "POST",
      });
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

      <AppointmentTabs
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab)}
        counts={counts}
        tabs={tabs}
      />

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
      <div className="">
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
            userType="patient"
          />
        )}
      </div>

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
