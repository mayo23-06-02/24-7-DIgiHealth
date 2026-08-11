"use client";

import React, { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import type { BadgeStatus } from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { Plus, Loader2, Calendar, Search, X } from "lucide-react";

const STATUS_MAP: Record<string, BadgeStatus> = {
  scheduled: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "error",
};

const emptyAppointmentForm = {
  type: "consultation",
  room: "",
  scheduledStart: "",
  scheduledEnd: "",
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const [modalOpen, setModalOpen] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState(emptyAppointmentForm);
  const [isSavingAppointment, setIsSavingAppointment] = useState(false);
  const [appointmentError, setAppointmentError] = useState("");

  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);

  const [doctorSearch, setDoctorSearch] = useState("");
  const [doctorResults, setDoctorResults] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [isSearchingDoctor, setIsSearchingDoctor] = useState(false);

  useEffect(() => {
    if (patientSearch.length < 2 || selectedPatient) {
      setPatientResults([]);
      return;
    }
    setIsSearchingPatient(true);
    const debounce = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/hospital/patients/search?search=${encodeURIComponent(patientSearch)}`,
        );
        const json = await res.json();
        if (json.success) setPatientResults(json.data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingPatient(false);
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [patientSearch, selectedPatient]);

  useEffect(() => {
    if (doctorSearch.length < 2 || selectedDoctor) {
      setDoctorResults([]);
      return;
    }
    setIsSearchingDoctor(true);
    const debounce = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/hospital/doctors/search?search=${encodeURIComponent(doctorSearch)}&role=doctor`,
        );
        const json = await res.json();
        if (json.success) setDoctorResults(json.data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingDoctor(false);
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [doctorSearch, selectedDoctor]);

  const resetAppointmentForm = () => {
    setAppointmentForm(emptyAppointmentForm);
    setPatientSearch("");
    setPatientResults([]);
    setSelectedPatient(null);
    setDoctorSearch("");
    setDoctorResults([]);
    setSelectedDoctor(null);
    setAppointmentError("");
  };

  const handleSaveAppointment = async () => {
    if (!selectedPatient || !selectedDoctor) {
      setAppointmentError("Select a patient and a practitioner");
      return;
    }
    if (!appointmentForm.room.trim()) {
      setAppointmentError("Room is required");
      return;
    }
    if (!appointmentForm.scheduledStart || !appointmentForm.scheduledEnd) {
      setAppointmentError("Start and end time are required");
      return;
    }

    setIsSavingAppointment(true);
    setAppointmentError("");
    try {
      const res = await fetch("/api/hospital/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient._id,
          practitionerId: selectedDoctor._id,
          type: appointmentForm.type,
          room: appointmentForm.room,
          scheduledStart: appointmentForm.scheduledStart,
          scheduledEnd: appointmentForm.scheduledEnd,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setModalOpen(false);
        resetAppointmentForm();
        fetchAppointments();
      } else {
        setAppointmentError(json.error || "Failed to create appointment");
      }
    } catch (e) {
      console.error(e);
      setAppointmentError("An error occurred while saving");
    } finally {
      setIsSavingAppointment(false);
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      let url = "/api/hospital/appointments?";
      if (filterStatus !== "all") url += `status=${filterStatus}&`;
      if (filterDate) url += `date=${filterDate}&`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setAppointments(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [filterStatus, filterDate]);

  const filtered = appointments.filter((a) => {
    if (!search) return true;
    const patient =
      `${a.patientId?.firstName} ${a.patientId?.lastName}`.toLowerCase();
    const practitioner =
      `${a.practitionerId?.firstName} ${a.practitionerId?.lastName}`.toLowerCase();
    return (
      patient.includes(search.toLowerCase()) ||
      practitioner.includes(search.toLowerCase())
    );
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const cancelAppointment = async (id: string) => {
    try {
      const res = await fetch(`/api/hospital/appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if ((await res.json()).success) {
        setAppointments((prev) =>
          prev.map((a) => (a._id === id ? { ...a, status: "cancelled" } : a)),
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full pb-10 flex flex-col gap-6">
      <PageHeader
        title="Appointments"
        subtitle="All consultations, procedures, and lab referrals"
        right={
          <Button
            onClick={() => setModalOpen(true)}
            icon={<Plus size={18} />}
            iconPosition="left"
            className="!rounded-lg !max-w-none normal-case !tracking-normal"
          >
            New Appointment
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <Input
            type="text"
            placeholder="Search patient or practitioner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={18} />}
          />
        </div>
        <div className="w-full sm:w-56">
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { value: "all", label: "All Statuses" },
              { value: "scheduled", label: "Scheduled" },
              { value: "in_progress", label: "In Progress" },
              { value: "completed", label: "Completed" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
        </div>
        <div className="w-full sm:w-48">
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            icon={<Calendar size={18} />}
          />
        </div>
        {filterDate && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFilterDate("")}
            icon={<X size={16} />}
            iconPosition="left"
            className="!rounded-lg !max-w-none normal-case !tracking-normal"
          >
            Clear Date
          </Button>
        )}
      </div>

      <Card className="flex flex-col p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : paginated.length === 0 ? (
          <EmptyState
            title="No appointments found"
            description="Try adjusting your filters or search."
            className="py-12"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="py-3 px-5 text-xs font-bold text-slate-500  tracking-wider">
                    Patient
                  </th>
                  <th className="py-3 px-5 text-xs font-bold text-slate-500  tracking-wider">
                    Practitioner
                  </th>
                  <th className="py-3 px-5 text-xs font-bold text-slate-500  tracking-wider">
                    Type
                  </th>
                  <th className="py-3 px-5 text-xs font-bold text-slate-500  tracking-wider">
                    Room
                  </th>
                  <th className="py-3 px-5 text-xs font-bold text-slate-500  tracking-wider">
                    Time
                  </th>
                  <th className="py-3 px-5 text-xs font-bold text-slate-500  tracking-wider">
                    Status
                  </th>
                  <th className="py-3 px-5 text-xs font-bold text-slate-500  tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                {paginated.map((a, i) => (
                  <tr
                    key={i}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-4 px-5 text-sm font-bold text-slate-700">
                      {a.patientId
                        ? `${a.patientId.firstName} ${a.patientId.lastName}`
                        : "Unknown"}
                    </td>
                    <td className="py-4 px-5 text-sm text-slate-600">
                      {a.practitionerId
                        ? `Dr. ${a.practitionerId.firstName} ${a.practitionerId.lastName}`
                        : "Unassigned"}
                    </td>
                    <td className="py-4 px-5">
                      <Badge label={a.type} status="neutral" size="sm" className="capitalize" />
                    </td>
                    <td className="py-4 px-5 text-sm text-slate-600">
                      {a.room}
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-500">
                      <div>
                        {new Date(a.scheduledStart).toLocaleDateString("en-ZA")}
                      </div>
                      <div className="font-bold text-slate-700">
                        {new Date(a.scheduledStart).toLocaleTimeString(
                          "en-ZA",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <Badge
                        label={a.status?.replace("_", " ") || "scheduled"}
                        status={STATUS_MAP[a.status] || "info"}
                        size="sm"
                        className="capitalize"
                      />
                    </td>
                    <td className="py-4 px-5 text-right">
                      {a.status === "scheduled" && (
                        <button
                          onClick={() => cancelAppointment(a._id)}
                          className="text-xs font-bold text-rose-500 hover:text-rose-700 border border-rose-200 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-500">
              {filtered.length} appointments
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors"
              >
                ←
              </button>
              <span className="px-3 py-1 text-sm text-slate-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors"
              >
                →
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Create Appointment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg w-full max-w-md shadow-none p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold font-grotesk">
                New Appointment
              </h2>
              <button
                onClick={() => {
                  setModalOpen(false);
                  resetAppointmentForm();
                }}
                className="text-slate-500 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              {/* Patient picker */}
              <div className="relative">
                {selectedPatient ? (
                  <>
                    <label className="block text-ink-600 font-semibold text-sm tracking-wide mb-1.5">
                      Patient
                    </label>
                    <div className="flex items-center justify-between border border-slate-200 rounded-full h-11 px-4 text-sm bg-slate-50">
                      <span>
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedPatient(null);
                          setPatientSearch("");
                        }}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Input
                      label="Patient"
                      type="text"
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      placeholder="Search patient by name or email..."
                      icon={<Search size={16} />}
                    />
                    {(isSearchingPatient || patientResults.length > 0) && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {isSearchingPatient ? (
                          <div className="p-3 text-center text-sm text-slate-500">
                            <Loader2 size={16} className="animate-spin inline mr-2" />
                            Searching...
                          </div>
                        ) : (
                          patientResults.map((p) => (
                            <button
                              key={p._id}
                              onClick={() => {
                                setSelectedPatient(p);
                                setPatientResults([]);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
                            >
                              {p.firstName} {p.lastName}{" "}
                              <span className="text-slate-400">
                                ({p.email})
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Practitioner picker */}
              <div className="relative">
                {selectedDoctor ? (
                  <>
                    <label className="block text-ink-600 font-semibold text-sm tracking-wide mb-1.5">
                      Practitioner
                    </label>
                    <div className="flex items-center justify-between border border-slate-200 rounded-full h-11 px-4 text-sm bg-slate-50">
                      <span>
                        Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedDoctor(null);
                          setDoctorSearch("");
                        }}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Input
                      label="Practitioner"
                      type="text"
                      value={doctorSearch}
                      onChange={(e) => setDoctorSearch(e.target.value)}
                      placeholder="Search practitioner by name or email..."
                      icon={<Search size={16} />}
                    />
                    {(isSearchingDoctor || doctorResults.length > 0) && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {isSearchingDoctor ? (
                          <div className="p-3 text-center text-sm text-slate-500">
                            <Loader2 size={16} className="animate-spin inline mr-2" />
                            Searching...
                          </div>
                        ) : (
                          doctorResults.map((d) => (
                            <button
                              key={d._id}
                              onClick={() => {
                                setSelectedDoctor(d);
                                setDoctorResults([]);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
                            >
                              Dr. {d.firstName} {d.lastName}{" "}
                              <span className="text-slate-400">
                                ({d.email})
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <Select
                label="Type"
                value={appointmentForm.type}
                onChange={(value) =>
                  setAppointmentForm({ ...appointmentForm, type: value })
                }
                options={[
                  { value: "consultation", label: "Consultation" },
                  { value: "procedure", label: "Procedure" },
                  { value: "lab", label: "Lab" },
                ]}
              />
              <Input
                label="Room"
                type="text"
                value={appointmentForm.room}
                onChange={(e) =>
                  setAppointmentForm({ ...appointmentForm, room: e.target.value })
                }
                placeholder="e.g. R-5"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Start"
                  type="datetime-local"
                  value={appointmentForm.scheduledStart}
                  onChange={(e) =>
                    setAppointmentForm({
                      ...appointmentForm,
                      scheduledStart: e.target.value,
                    })
                  }
                />
                <Input
                  label="End"
                  type="datetime-local"
                  value={appointmentForm.scheduledEnd}
                  onChange={(e) =>
                    setAppointmentForm({
                      ...appointmentForm,
                      scheduledEnd: e.target.value,
                    })
                  }
                />
              </div>

              {appointmentError && (
                <p className="text-xs font-medium text-rose-600">
                  {appointmentError}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setModalOpen(false);
                  resetAppointmentForm();
                }}
                disabled={isSavingAppointment}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAppointment}
                loading={isSavingAppointment}
              >
                Save Appointment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
