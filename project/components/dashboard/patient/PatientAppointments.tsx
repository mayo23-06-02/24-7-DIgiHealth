"use client";
import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppointmentList from "@/components/shared/Appointments/AppointmentList";
import AppointmentFilters from "@/components/shared/Appointments/AppointmentFilters";
import AppointmentDetailsModal from "@/components/shared/Appointments/AppointmentDetailsModal";
import AppointmentCalendarView from "@/components/shared/Appointments/AppointmentCalendarView";
import ViewToggle, {
  AppointmentView,
} from "@/components/shared/Appointments/ViewToggle";
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
import { cancelBooking } from "@/lib/booking/service";
import { goToAppointmentRoom } from "@/lib/appointments/joinRoom";

export default function PatientAppointments() {
  const router = useRouter();
  const { appointments, loading, fetchAppointments } = useAppointments(
    "/api/patient/appointments",
  );
  const [activeTab, setActiveTab] = useState<AppointmentTab>("upcoming");
  const [view, setView] = useState<AppointmentView>("list");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showBooking, setShowBooking] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<{
    id: string;
    name: string;
    specialisation: string;
    avatar?: string;
  } | null>(null);
  const [editingApptId, setEditingApptId] = useState<string | null>(null);
  const [editingInitialForm, setEditingInitialForm] = useState<any>(null);
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
    const result: Record<AppointmentTab, number> = {} as any;
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
    if (!appt || !appt.practitionerId) return;
    await goToAppointmentRoom({
      appointmentId: id,
      scheduledStart: appt.scheduledStart,
      contactId: appt.practitionerId,
      contactName: appt.practitionerName,
      contactAvatar: appt.practitionerAvatar,
      role: "patient",
      router,
    });
  };

  const handleReschedule = (id: string) => {
    const appt = appointments.find((a) => a.id === id);
    if (!appt) return;
    const start = new Date(appt.scheduledStart);
    const y = start.getFullYear();
    const m = String(start.getMonth() + 1).padStart(2, "0");
    const day = String(start.getDate()).padStart(2, "0");
    setEditingApptId(id);
    setSelectedDoctor({
      id: appt.practitionerId || "",
      name: appt.practitionerName || "Practitioner",
      specialisation: "",
      avatar: appt.practitionerAvatar,
    });
    setEditingInitialForm({
      date: `${y}-${m}-${day}`,
      time: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
      type: appt.type,
      reason: appt.reason,
      durationMinutes: 30,
    });
    setShowBooking(true);
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this appointment?")) return;
    const result = await cancelBooking(id);
    if (result.success) {
      toast.success("Cancelled");
      fetchAppointments(false);
    } else {
      toast.error(result.error || "Failed to cancel");
    }
  };

  // Patients cannot accept their own booking requests — only the practitioner can.
  // Patient actions for requests: reschedule or cancel (see handleReschedule / handleCancel).

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
            onClick={() => {
              setEditingApptId(null);
              setSelectedDoctor(null);
              setEditingInitialForm(null);
              setShowBooking(true);
            }}
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
            onEdit={handleReschedule}
            onCancel={handleCancel}
            onClick={handleAppointmentClick}
            emptyMessage={`No ${activeTab} appointments`}
            userType="patient"
          />
        ) : (
          <AppointmentCalendarView
            appointments={filtered}
            onAppointmentClick={handleAppointmentClick}
            userType="patient"
            emptyMessage={`No ${activeTab} appointments`}
          />
        )}
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={showBooking}
        onClose={() => {
          setShowBooking(false);
          setSelectedDoctor(null);
          setEditingApptId(null);
          setEditingInitialForm(null);
        }}
        doctor={selectedDoctor}
        editingApptId={editingApptId}
        initialForm={editingInitialForm ?? undefined}
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
        onJoin={handleJoin}
        onReschedule={(id) => {
          setShowDetailsModal(false);
          handleReschedule(id);
        }}
        onCancel={(id) => {
          setShowDetailsModal(false);
          handleCancel(id);
        }}
      />
    </div>
  );
}
