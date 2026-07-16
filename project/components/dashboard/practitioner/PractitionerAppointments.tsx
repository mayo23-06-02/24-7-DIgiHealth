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
import AppointmentDetailsModal from "@/components/shared/Appointments/AppointmentDetailsModal";
import AppointmentCalendarView from "@/components/shared/Appointments/AppointmentCalendarView";
import ViewToggle, { AppointmentView } from "@/components/shared/Appointments/ViewToggle";
import AppointmentTabs, { AppointmentTab, ALL_TABS } from "@/components/shared/Appointments/AppointmentTabs";
import BookingModal from "@/components/doctor/BookingModal";
import SoapNoteModal from "@/components/dashboard/practitioner/SoapNoteModal";
import { useAppointments, Appointment } from "@/lib/hooks/useAppointments";
import { goToAppointmentRoom } from "@/lib/appointments/joinRoom";

type Tab = AppointmentTab;

export default function PractitionerAppointments() {
  const router = useRouter();
  const { appointments, loading, fetchAppointments } = useAppointments(
    "/api/practitioner/appointments?tab=all",
  );
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [view, setView] = useState<AppointmentView>("list");
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
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const tabs = ALL_TABS;

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
    await goToAppointmentRoom({
      appointmentId: id,
      scheduledStart: appt.scheduledStart,
      contactId: appt.patientId,
      contactName: appt.patientName,
      contactAvatar: appt.patientAvatar,
      role: "practitioner",
      router,
    });
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
    const y = start.getFullYear();
    const m = String(start.getMonth() + 1).padStart(2, "0");
    const day = String(start.getDate()).padStart(2, "0");
    setEditingApptId(id);
    setEditingPatient({ id: appt.patientId, name: appt.patientName });
    setEditingInitialForm({
      date: `${y}-${m}-${day}`,
      time: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
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

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
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

      <AppointmentTabs
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab)}
        counts={counts}
        tabs={tabs}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
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
        </div>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {/* List / Calendar */}
      <div className="">
        {loading ? (
          <div className="animate-pulse space-y-3">Loading...</div>
        ) : view === "list" ? (
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
        ) : (
          <AppointmentCalendarView
            appointments={filtered}
            onAppointmentClick={handleAppointmentClick}
            userType="practitioner"
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

      {/* Appointment Details Modal (used by calendar view) */}
      <AppointmentDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        userType="practitioner"
        onJoin={handleJoin}
        onAccept={handleAccept}
        onDecline={handleDecline}
        onReschedule={(id) => {
          setShowDetailsModal(false);
          handleEdit(id);
        }}
        onCancel={(id) => {
          setShowDetailsModal(false);
          handleCancel(id);
        }}
        onRebook={(id) => {
          setShowDetailsModal(false);
          handleRebook(id);
        }}
      />
    </div>
  );
}
