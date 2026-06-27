"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { toast } from "react-hot-toast";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import Select from "@/components/ui/Select";
import RiskScoreCard from "@/components/dashboard/practitioner/RiskScoreCard";
import SoapNoteModal from "@/components/dashboard/practitioner/SoapNoteModal";
import BookingModal from "@/components/doctor/BookingModal";
import {
  BiSearch,
  BiPlus,
  BiVideo,
  BiChat,
  BiX,
  BiNote,
  BiDownload,
  BiCalendar,
  BiPencil,
} from "react-icons/bi";

type AppointmentStatus =
  | "all"
  | "upcoming"
  | "ongoing"
  | "past"
  | "missed"
  | "cancelled"
  | "requests";

const TYPE_ICON: Record<string, React.ReactNode> = {
  video: <BiVideo className="text-emerald-500" size={16} />,
  chat: <BiChat className="text-blue-500" size={16} />,
};

const STATUS_BADGE: Record<string, string> = {
  scheduled: "bg-primary/20 text-primary border-primary-200",
  ongoing: "bg-gray-50 text-gray-700 border-gray-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-600 border-rose-200",
  pending: "bg-gray-50 text-gray-700 border-gray-200",
  requested: "bg-indigo-50 text-indigo-700 border-indigo-200",
  missed: "bg-red-50 text-red-700 border-red-200",
};

export default function PractitionerAppointmentsPage() {
  const [activeTab, setActiveTab] = useState<AppointmentStatus>("upcoming");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [newModal, setNewModal] = useState(false);
  const [soapModal, setSoapModal] = useState({
    isOpen: false,
    consultationId: "",
    patientName: "",
  });
  const [editingApptId, setEditingApptId] = useState<string | null>(null);
  const [editingPatient, setEditingPatient] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editingInitialForm, setEditingInitialForm] = useState<any>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [currentTime, setCurrentTime] = useState(new Date());
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState("newest");

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch all appointments (tab=all)
  const fetchAppointments = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/practitioner/appointments?tab=all");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAppointments((prev) => {
          const prevIds = new Set(prev.map((a) => a.id));
          const newApps = json.data.filter((a: any) => !prevIds.has(a.id));
          return json.data.map((a: any) => ({
            ...a,
            isNew: newApps.some((n: any) => n.id === a.id),
          }));
        });
      } else {
        setAppointments([]);
      }
    } catch (err) {
      console.error(err);
      setAppointments([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchAppointments(true);
  }, [fetchAppointments]);

  // Background polling every 5 seconds (no loading spinner)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAppointments(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchAppointments]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await fetch(`/api/practitioner/appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a)),
      );
      if (newStatus === "scheduled") {
        toast.success("Appointment accepted and scheduled.");
      } else if (newStatus === "cancelled") {
        toast.error("Appointment declined/cancelled.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to update status.");
    }
  };

  const cancelAppt = async (id: string) => {
    await updateStatus(id, "cancelled");
  };

  const handleJoinRoom = async (consultationId: string) => {
    try {
      const res = await fetch(`/api/chat/conversations/${consultationId}`);
      const conv = await res.json();
      if (!res.ok || !conv._id) {
        toast.error("Unable to find consultation room");
        return;
      }
      window.location.href = `/practitioner/messages?chatId=${conv._id}&join=video`;
    } catch {
      toast.error("Unable to join consultation room");
    }
  };

  const handleEditAppt = (a: any) => {
    const start = new Date(a.scheduledStart);
    setEditingApptId(a.id);
    setEditingPatient({ id: a.patientId, name: a.patientName });
    setEditingInitialForm({
      date: start.toISOString().split("T")[0],
      time: start.toTimeString().split(" ")[0].slice(0, 5),
      type: a.type,
      reason: a.reason,
      durationMinutes: a.durationMinutes || 30,
    });
    setNewModal(true);
  };

  // Mark items as seen when tab changes
  const handleTabChange = (t: AppointmentStatus) => {
    setActiveTab(t);
    setPage(1);
    const ids = filteredAppointments.map((a) => a.id);
    setSeenIds((prev) => new Set([...prev, ...ids]));
  };

  // Compute status helper (matches patient logic with requests tab addition)
  const computeStatus = useCallback(
    (appt: any) => {
      const start = new Date(appt.scheduledStart);
      if (isNaN(start.getTime())) {
        return "past";
      }

      const durationMins = appt.durationMinutes || 30;
      const end = new Date(start.getTime() + durationMins * 60000);
      const tenMinsAfterStart = new Date(start.getTime() + 10 * 60000);
      const now = currentTime;

      const status = appt.status;

      if (status === "cancelled") return "cancelled";
      if (status === "completed") return "past";
      if (status === "missed") return "missed";
      if (status === "requested" || status === "pending") return "requests";

      if (status === "in_progress") {
        if (now < end) return "ongoing";
        return "past";
      }

      if (now < start) {
        return "upcoming";
      }
      if (now >= start && now < tenMinsAfterStart) {
        return "ongoing";
      }
      return "missed";
    },
    [currentTime],
  );

  // Enrich appointments with computed status
  const appointmentsWithStatus = useMemo(() => {
    return appointments.map((appt) => {
      const computed = computeStatus(appt);
      if (appt.status === "completed") {
        return {
          ...appt,
          computedStatus: "past" as AppointmentStatus,
          isNew: appt.isNew && !seenIds.has(appt.id),
        };
      }
      if (appt.status === "missed") {
        return {
          ...appt,
          computedStatus: "missed" as AppointmentStatus,
          isNew: appt.isNew && !seenIds.has(appt.id),
        };
      }
      return {
        ...appt,
        computedStatus: computed as AppointmentStatus,
        isNew: appt.isNew && !seenIds.has(appt.id),
      };
    });
  }, [appointments, computeStatus, seenIds]);

  // Filtered and sorted list
  const filteredAppointments = useMemo(() => {
    let list = appointmentsWithStatus;

    if (activeTab !== "all") {
      list = list.filter((a) => a.computedStatus === activeTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.patientName.toLowerCase().includes(q) ||
          (a.reason && a.reason.toLowerCase().includes(q)),
      );
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      list = list.filter((a) => new Date(a.scheduledStart) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      list = list.filter((a) => new Date(a.scheduledStart) <= toDate);
    }

    if (sortBy === "newest") {
      list.sort(
        (a, b) =>
          new Date(b.scheduledStart).getTime() -
          new Date(a.scheduledStart).getTime(),
      );
    } else {
      list.sort(
        (a, b) =>
          new Date(a.scheduledStart).getTime() -
          new Date(a.scheduledStart).getTime(),
      );
    }

    return list;
  }, [
    appointmentsWithStatus,
    activeTab,
    searchQuery,
    dateFrom,
    dateTo,
    sortBy,
  ]);

  // Dynamic counts per tab
  const counts = useMemo(() => {
    const tabs: AppointmentStatus[] = [
      "all",
      "upcoming",
      "ongoing",
      "past",
      "missed",
      "cancelled",
      "requests",
    ];
    const result: Record<AppointmentStatus, { total: number; new: number }> =
      {} as any;
    tabs.forEach((t) => {
      let list = appointmentsWithStatus;
      if (t !== "all") {
        list = list.filter((a) => a.computedStatus === t);
      }
      const total = list.length;
      const newCount = list.filter((a) => a.isNew).length;
      result[t] = { total, new: newCount };
    });
    return result;
  }, [appointmentsWithStatus]);

  const paginated = useMemo(() => {
    return filteredAppointments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filteredAppointments, page]);

  const totalPages = Math.ceil(filteredAppointments.length / PAGE_SIZE);

  const exportCSV = () => {
    const headers = ["Patient", "Date", "Time", "Type", "Status", "Reason"];
    const rows = filteredAppointments.map((a) => [
      a.patientName,
      new Date(a.scheduledStart).toLocaleDateString("en-ZA"),
      new Date(a.scheduledStart).toLocaleTimeString("en-ZA", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      a.type,
      a.status,
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

  const Skeleton = () => (
    <div className="animate-pulse space-y-3 p-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-16 bg-slate-100 rounded-xl" />
      ))}
    </div>
  );

  return (
    <div className="w-full pb-10 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 font-grotesk">
            Clinical Appointments
          </h1>
          <p className="text-sm text-slate-500">
            Manage your clinical consultation schedule
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <BiDownload size={18} /> Export
          </button>
          <Button
            onClick={() => {
              setNewModal(true);
              setEditingApptId(null);
              setEditingPatient(null);
              setEditingInitialForm(null);
            }}
            icon={<BiPlus size={18} />}
          >
            New Appointment
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-slate-50 rounded-2xl p-1 overflow-x-auto custom-scrollbar w-fit max-w-full">
        {(
          [
            "all",
            "upcoming",
            "ongoing",
            "past",
            "missed",
            "cancelled",
            "requests",
          ] as AppointmentStatus[]
        ).map((t) => (
          <Button
            key={t}
            onClick={() => handleTabChange(t)}
            variant={activeTab === t ? "primary" : "ghost"}
            className={`px-4 py-2 h-auto text-xs font-bold tracking-normal rounded-xl transition-all flex items-center gap-1 whitespace-nowrap ${
              activeTab === t
                ? "shadow-primary/20"
                : "text-slate-500 hover:text-slate-600"
            }`}
          >
            <span className="capitalize">{t}</span>
            <span
              className={`ml-1 px-2 py-0.5 rounded-lg text-[9px] font-bold border ${
                activeTab === t
                  ? "bg-white/20 border-white/20 text-white"
                  : "bg-white border-slate-100 text-slate-500"
              }`}
            >
              {counts[t]?.total || 0}
            </span>
            {counts[t]?.new > 0 && (
              <span className="ml-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </Button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <BiSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            size={16}
          />
          <input
            type="text"
            placeholder="Search patient name or fields..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-white">
          <BiCalendar className="text-slate-500" size={15} />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-sm outline-none text-slate-700 font-medium"
          />
        </div>
        <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-white">
          <BiCalendar className="text-slate-500" size={15} />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-sm outline-none text-slate-700 font-medium"
          />
        </div>
        <Select
          value={sortBy}
          onChange={(v) => setSortBy(v)}
          options={[
            { value: "newest", label: "Newest" },
            { value: "oldest", label: "Oldest" },
          ]}
          className="w-36"
        />
        {(dateFrom || dateTo) && (
          <button
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
            className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <BiX size={14} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <Card className="flex flex-col p-0 overflow-hidden border border-slate-100 shadow-none">
        {loading ? (
          <div className="p-4">
            <Skeleton />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="py-4 px-5 text-xs font-bold text-slate-500 tracking-wider">
                    Patient
                  </th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-500 tracking-wider">
                    Date & Time
                  </th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-500 tracking-wider">
                    Method
                  </th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-500 tracking-wider">
                    Risk Assessment
                  </th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-500 tracking-wider">
                    Status
                  </th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-500 tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginated.map((a, i) => (
                  <tr
                    key={i}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={a.patientName} size="sm" />
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {a.patientName}
                          </p>
                          <p className="text-xs text-slate-500 line-clamp-1">
                            {a.reason || "Clinical Consultation"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <p className="text-xs font-bold text-slate-700">
                        {new Date(a.scheduledStart).toLocaleDateString(
                          "en-ZA",
                          { day: "numeric", month: "short", year: "numeric" },
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(a.scheduledStart).toLocaleTimeString(
                          "en-ZA",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </p>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-1.5">
                        {TYPE_ICON[a.type] || TYPE_ICON["video"]}
                        <span className="text-xs capitalize text-slate-600">
                          {a.type || "telehealth"}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <RiskScoreCard
                        score={a.riskScore || 0}
                        color={a.riskColor || "green"}
                        size="sm"
                        showRing={false}
                      />
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-lg  uppercase ${
                          STATUS_BADGE[a.computedStatus] ||
                          STATUS_BADGE.scheduled
                        }`}
                      >
                        {a.computedStatus}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex justify-end gap-2">
                        {a.computedStatus === "requests" && (
                          <>
                            <button
                              onClick={() => updateStatus(a.id, "scheduled")}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => updateStatus(a.id, "cancelled")}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 transition-colors"
                            >
                              Decline
                            </button>
                          </>
                        )}
                        {(a.computedStatus === "upcoming" ||
                          a.computedStatus === "ongoing") && (
                          <button
                            onClick={() => handleJoinRoom(a.consultationId)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-primary hover:bg-primary/95 transition-colors"
                          >
                            <BiVideo size={14} /> Join Room
                          </button>
                        )}
                        <button
                          onClick={() =>
                            setSoapModal({
                              isOpen: true,
                              consultationId: a.consultationId,
                              patientName: a.patientName,
                            })
                          }
                          className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-100 transition-colors"
                          title="SOAP Notes"
                        >
                          <BiNote size={15} />
                        </button>
                        <button
                          onClick={() => handleEditAppt(a)}
                          className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors"
                          title="Edit Appointment"
                        >
                          <BiPencil size={15} />
                        </button>
                        {(a.computedStatus === "upcoming" ||
                          a.computedStatus === "ongoing" ||
                          a.computedStatus === "requests") && (
                          <button
                            onClick={() => cancelAppt(a.id)}
                            className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors"
                            title="Cancel/Decline"
                          >
                            <BiX size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-16 text-center text-slate-400 font-medium"
                    >
                      No {activeTab} appointments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-500 font-bold">
              {filteredAppointments.length} records found
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3.5 py-1 text-sm border border-slate-200 rounded-xl bg-white disabled:opacity-40 hover:bg-slate-50 transition-colors font-bold text-slate-600"
              >
                ←
              </button>
              <span className="px-3 py-1 text-xs text-slate-500 font-bold flex items-center">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3.5 py-1 text-sm border border-slate-200 rounded-xl bg-white disabled:opacity-40 hover:bg-slate-50 transition-colors font-bold text-slate-600"
              >
                →
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* SOAP Note Modal */}
      <SoapNoteModal
        isOpen={soapModal.isOpen}
        onClose={() =>
          setSoapModal({ isOpen: false, consultationId: "", patientName: "" })
        }
        consultationId={soapModal.consultationId}
        patientName={soapModal.patientName}
      />

      {/* New/Edit Appointment Modal */}
      <BookingModal
        isOpen={newModal}
        mode="practitioner"
        editingApptId={editingApptId}
        patient={editingPatient}
        initialForm={editingInitialForm ?? undefined}
        onClose={() => {
          setNewModal(false);
          setEditingApptId(null);
          setEditingPatient(null);
          setEditingInitialForm(null);
        }}
        onSuccess={() => {
          fetchAppointments();
        }}
      />
    </div>
  );
}
