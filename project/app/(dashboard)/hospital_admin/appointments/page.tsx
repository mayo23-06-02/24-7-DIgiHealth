"use client";

import React, { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { BiPlus, BiLoaderAlt, BiCalendar, BiSearch, BiX } from "react-icons/bi";

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-gray-50 text-gray-700 border-gray-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-600 border-rose-200",
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 font-grotesk">
            Appointments
          </h1>
          <p className="text-sm text-slate-500">
            All consultations, procedures, and lab referrals
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} icon={<BiPlus size={18} />}>
          New Appointment
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <BiSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search patient or practitioner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white">
          <BiCalendar className="text-slate-400" size={16} />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="text-sm outline-none"
          />
        </div>
        {filterDate && (
          <button
            onClick={() => setFilterDate("")}
            className="text-xs text-slate-500 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 flex items-center gap-1"
          >
            <BiX /> Clear Date
          </button>
        )}
      </div>

      <Card className="flex flex-col p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <BiLoaderAlt className="animate-spin text-primary text-3xl" />
          </div>
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
                      <span className="text-xs capitalize bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-medium">
                        {a.type}
                      </span>
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
                      <span
                        className={`text-xs font-bold  tracking-wider px-2 py-1 rounded-lg border ${STATUS_STYLES[a.status] || STATUS_STYLES.scheduled}`}
                      >
                        {a.status?.replace("_", " ")}
                      </span>
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
                {paginated.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-10 text-center text-slate-400"
                    >
                      No appointments found.
                    </td>
                  </tr>
                )}
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
          <div className="bg-white rounded-3xl w-full max-w-md shadow-none p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold font-grotesk">
                New Appointment
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <BiX size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <h1 className="text-xs font-bold text-slate-500  tracking-wider mb-1 block">
                  Type
                </h1>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option>Consultation</option>
                  <option>Procedure</option>
                  <option>Lab</option>
                </select>
              </div>
              <div>
                <h1 className="text-xs font-bold text-slate-500  tracking-wider mb-1 block">
                  Room
                </h1>
                <input
                  type="text"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. R-5"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <h1 className="text-xs font-bold text-slate-500  tracking-wider mb-1 block">
                    Start
                  </h1>
                  <input
                    type="datetime-local"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <h1 className="text-xs font-bold text-slate-500  tracking-wider mb-1 block">
                    End
                  </h1>
                  <input
                    type="datetime-local"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setModalOpen(false)}>
                Save Appointment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
