"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import {
  BiCalendar,
  BiTime,
  BiVideo,
  BiMessageDetail,
  BiSearch,
  BiListUl,
  BiChevronRight,
  BiDownload,
  BiStar,
  BiTrash,
  BiCalendarEdit,
  BiCheckShield,
  BiPlus,
  BiCheckCircle,
  BiXCircle,
  BiFile,
  BiUser,
  BiUserPlus,
} from "react-icons/bi";
import { StarIcon, VerifiedIcon } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import PatientCalendar from "./PatientCalendar";
import BookingModal from "@/components/doctor/BookingModal";

import type { Appointment, AppointmentStatus, ViewType } from "./appointments/types";
import { parseDuration } from "./appointments/types";
import AppointmentsToolbar from "./appointments/AppointmentsToolbar";
import {
  WaitingRoomModal,
  RescheduleModal,
  CancelAppointmentModal,
} from "./appointments/AppointmentActionModals";

const AppointmentsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppointmentStatus>("upcoming");
  const [viewType, setViewType] = useState<ViewType>("list");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [selectedPractitioner, setSelectedPractitioner] = useState<any | null>(
    null,
  );
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [rebookDoctor, setRebookDoctor] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState("newest");
  const router = useRouter();
  const [waitingRoomAppt, setWaitingRoomAppt] = useState<Appointment | null>(
    null,
  );
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(
    null,
  );
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelAppt, setCancelAppt] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Helper to get formatted waiting room countdown
  const getWaitingRoomTimeLeft = useCallback(
    (appt: Appointment) => {
      const start = new Date(appt.scheduledStartTime);
      const diff = start.getTime() - currentTime.getTime();
      if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      return { hours, minutes, seconds, totalMs: diff };
    },
    [currentTime],
  );

  const joiningRef = useRef(false);

  const joinChat = useCallback(
    async (appt: Appointment) => {
      if (!appt.practitionerId) {
        joiningRef.current = false;
        return;
      }
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactId: appt.practitionerId }),
        });
        const data = await res.json();
        if (res.ok && data.conversationId) {
          setWaitingRoomAppt(null);
          router.push(
            `/patient/messages?chatId=${data.conversationId}&join=video`,
          );
        } else {
          joiningRef.current = false;
        }
      } catch (e) {
        console.error("Failed to join consultation room", e);
        joiningRef.current = false;
      }
    },
    [router],
  );

  // Navigate to the consultation room when the waiting room countdown reaches zero
  useEffect(() => {
    if (waitingRoomAppt && !joiningRef.current) {
      const timeLeft = getWaitingRoomTimeLeft(waitingRoomAppt);
      if (timeLeft.totalMs <= 0) {
        joiningRef.current = true;
        joinChat(waitingRoomAppt);
      }
    }
    if (!waitingRoomAppt) joiningRef.current = false;
  }, [currentTime, waitingRoomAppt, getWaitingRoomTimeLeft, joinChat]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ─── Fetch appointments (initial load) ───
  const fetchAppointments = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/patient/appointments");
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API Error ${res.status}: ${text.substring(0, 100)}`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setAppointments((prev) => {
          const prevIds = new Set(prev.map((a) => a.id));
          const newApps = data.filter((a: Appointment) => !prevIds.has(a.id));
          const updated = data.map((a: Appointment) => ({
            ...a,
            isNew: newApps.some((n) => n.id === a.id),
          }));
          return updated;
        });
      } else {
        setAppointments([]);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      setAppointments([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Initial fetch on mount (with loading)
  useEffect(() => {
    fetchAppointments(true);
  }, []); // only once

  // ─── Background polling every 5 seconds (no loading spinner) ───
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAppointments(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchAppointments]);

  // ─── Mark appointments as seen when tab changes ───
  const handleTabChange = (tab: AppointmentStatus) => {
    setActiveTab(tab);
    // Mark all appointments in the new tab as seen (using the filtered list)
    const ids = filteredAppointments.map((a) => a.id);
    setSeenIds((prev) => new Set([...prev, ...ids]));
  };

  // ─── Compute dynamic statuses based on currentTime ───
  const computeStatus = useCallback(
    (appt: Appointment) => {
      const start = new Date(appt.scheduledStartTime);
      if (isNaN(start.getTime())) {
        return "past";
      }

      const durationMins = parseDuration(appt.duration);
      const end = new Date(start.getTime() + durationMins * 60000);
      const tenMinsAfterStart = new Date(start.getTime() + 10 * 60000);
      const now = currentTime;

      const status = appt.status;

      if (status === "cancelled") return "cancelled";
      if (status === "completed") return "past";
      if (status === "missed") return "missed";

      if (status === "in_progress") {
        if (now < end) return "ongoing";
        return "past";
      }

      // For statuses like 'scheduled', 'requested', 'pending'
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

  // ─── Enrich appointments with computed status and isNew (respecting seenIds) ───
  const appointmentsWithStatus = useMemo(() => {
    return appointments.map((appt) => {
      const computed = computeStatus(appt);
      // If server already says missed/completed, keep that
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

  // ─── Filtered and sorted appointments for the active tab ───
  const filteredAppointments = useMemo(() => {
    let list = appointmentsWithStatus;

    // Filter by tab
    if (activeTab === "all") {
      // keep all
    } else {
      list = list.filter((a) => a.computedStatus === activeTab);
    }

    // Search filters
    list = list.filter((a) => {
      const matchesGeneral =
        a.doctor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDoctor =
        doctorSearch === "" ||
        a.doctor.toLowerCase().includes(doctorSearch.toLowerCase()) ||
        (a.specialization &&
          a.specialization.toLowerCase().includes(doctorSearch.toLowerCase()));
      return matchesGeneral && matchesDoctor;
    });

    // Sorting
    if (sortBy === "newest") {
      list.sort(
        (a, b) =>
          new Date(b.scheduledStartTime).getTime() -
          new Date(a.scheduledStartTime).getTime(),
      );
    } else {
      list.sort(
        (a, b) =>
          new Date(a.scheduledStartTime).getTime() -
          new Date(b.scheduledStartTime).getTime(),
      );
    }
    return list;
  }, [appointmentsWithStatus, activeTab, searchQuery, doctorSearch, sortBy]);

  // ─── Counts per tab (total and new) ───
  const counts = useMemo(() => {
    const tabs: AppointmentStatus[] = [
      "all",
      "upcoming",
      "ongoing",
      "past",
      "missed",
      "cancelled",
    ];
    const result: Record<AppointmentStatus, { total: number; new: number }> =
      {} as any;
    tabs.forEach((tab) => {
      let list = appointmentsWithStatus;
      if (tab !== "all") {
        list = list.filter((a) => a.computedStatus === tab);
      }
      const total = list.length;
      const newCount = list.filter((a) => a.isNew).length;
      result[tab] = { total, new: newCount };
    });
    return result;
  }, [appointmentsWithStatus]);

  // ─── Modal handlers ───
  const handleDoctorClick = async (practitionerId: string) => {
    if (!practitionerId) return;
    try {
      const res = await fetch(`/api/patient/practitioners/${practitionerId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPractitioner(data);
      } else {
        console.error("Failed to fetch practitioner");
      }
    } catch (err) {
      console.error("Fetch Doctor Error:", err);
    }
  };

  const handleJoinCell = useCallback(
    (appt: Appointment) => {
      const start = new Date(appt.scheduledStartTime);
      if (
        !appt.scheduledStartTime ||
        isNaN(start.getTime()) ||
        new Date() >= start
      ) {
        joinChat(appt);
      } else {
        setWaitingRoomAppt(appt);
      }
    },
    [joinChat],
  );

  const handleReschedule = (appt: Appointment) => {
    // Pre-fill with existing appointment date/time
    const existing = new Date(appt.scheduledStartTime);
    if (!isNaN(existing.getTime())) {
      setRescheduleDate(existing.toISOString().split("T")[0]);
      setRescheduleTime(
        `${String(existing.getHours()).padStart(2, "0")}:${String(existing.getMinutes()).padStart(2, "0")}`,
      );
    } else {
      setRescheduleDate(new Date().toISOString().split("T")[0]);
      setRescheduleTime("");
    }
    setRescheduleAppt(appt);
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleAppt || !rescheduleDate || !rescheduleTime) return;
    setRescheduling(true);
    try {
      const dt = new Date(`${rescheduleDate}T${rescheduleTime}`);
      const res = await fetch(`/api/consultations/${rescheduleAppt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledStartTime: dt.toISOString() }),
      });
      if (res.ok) {
        setRescheduleAppt(null);
        fetchAppointments(false);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to reschedule.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRescheduling(false);
    }
  };

  const handleCancel = (appt: Appointment) => {
    setCancelAppt(appt);
  };

  const handleConfirmCancel = async () => {
    if (!cancelAppt) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/consultations/${cancelAppt.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCancelAppt(null);
        fetchAppointments(false);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to cancel.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCancelling(false);
    }
  };

  // ─── Helper: countdown timers ───
  const getCountdown = (appt: Appointment) => {
    const start = new Date(appt.scheduledStartTime);
    if (isNaN(start.getTime())) return null;
    const diff = start.getTime() - currentTime.getTime();
    if (diff <= 0) return null;
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    if (mins > 5) return null;
    return { mins, secs };
  };

  const getMissedCountdown = (appt: Appointment) => {
    const start = new Date(appt.scheduledStartTime);
    if (isNaN(start.getTime())) return null;
    const diff = currentTime.getTime() - start.getTime();
    if (diff < 0) return null;
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    if (mins > 10) return null;
    return { mins, secs };
  };

  // ─── Empty state messages ───
  const getEmptyStateMessage = () => {
    switch (activeTab) {
      case "all":
        return "No appointments found at all.";
      case "upcoming":
        return "You have no upcoming appointments.";
      case "ongoing":
        return "There are no ongoing consultations right now.";
      case "past":
        return "You have no past appointments.";
      case "missed":
        return "You have no missed appointments.";
      case "cancelled":
        return "You have no cancelled appointments.";
      default:
        return "No appointments found.";
    }
  };

  // ─── RENDER ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* HEADER */}
      <PageHeader
        title="Clinical Appointments"
        subtitle="Manage your scheduled consultations and medical history."
        right={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="hidden sm:flex"
              icon={<BiDownload />}
              iconPosition="left"
            >
              Export History
            </Button>
            <Button
              onClick={() => setShowBookingModal(true)}
              icon={<BiPlus />}
              iconPosition="left"
            >
              Book New
            </Button>
          </div>
        }
      />

      {/* TABS & TOOLS */}
      <AppointmentsToolbar
        activeTab={activeTab}
        viewType={viewType}
        searchQuery={searchQuery}
        sortBy={sortBy}
        counts={counts}
        onTabChange={handleTabChange}
        onSearchChange={setSearchQuery}
        onSortChange={setSortBy}
        onViewTypeChange={setViewType}
      />

      {/* APPOINTMENTS LIST / EMPTY STATE */}
      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-4">
          <div className="w-14 h-14 border-[5px] border-primary/10 border-t-primary rounded-full animate-spin" />
          <p className="text-slate-500 font-bold text-sm tracking-normal">
            Syncing Encrypted Clinical Data...
          </p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <Card className="p-12 border-dashed border-2 border-slate-100 bg-slate-50/30">
          <EmptyState
            title={getEmptyStateMessage()}
            description="All verified clinical sessions scheduled via 24/7 DigiHealth will be organized here."
            icon={<BiCalendar size={48} className="text-slate-200" />}
          />
        </Card>
      ) : viewType === "calendar" ? (
        <div className="h-[800px] w-full mt-4 bg-white rounded-lg border border-slate-100 shadow-none shadow-slate-900/5 overflow-hidden">
          <PatientCalendar />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <Card
            className="hidden md:block p-0 overflow-hidden border border-slate-100 shadow-none shadow-slate-900/5 rounded-lg"
            variant="solid"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b font-semibold border-slate-100 text-sm text-slate-500 tracking-normal">
                    <th className="px-6 py-5">Medical Specialist</th>
                    <th className="px-6 py-5">Timeline Details</th>
                    <th className="px-6 py-5">Consultation Type</th>
                    <th className="px-6 py-5">Clinical Status</th>
                    <th className="px-6 py-5 text-right">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredAppointments.map((appt) => {
                    const countdown = getCountdown(appt);
                    const missedCountdown = getMissedCountdown(appt);
                    const showGreenTimer =
                      countdown &&
                      (countdown.mins < 5 ||
                        (countdown.mins === 5 && countdown.secs === 0));
                    const showRedTimer =
                      missedCountdown &&
                      missedCountdown.mins < 10 &&
                      appt.computedStatus === "upcoming";
                    return (
                      <tr
                        key={appt.id}
                        className="hover:bg-primary/2 transition-colors group cursor-default"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <Avatar
                              name={appt.doctor}
                              size="md"
                              className="shadow-none shadow-slate-200"
                            />
                            <div>
                              <h1
                                className="font-bold text-slate-800 text-sm leading-none mb-1 cursor-pointer hover:text-primary transition-all underline-offset-4 decoration-2"
                                onClick={() =>
                                  appt.practitionerId &&
                                  handleDoctorClick(appt.practitionerId)
                                }
                              >
                                {appt.doctor}
                              </h1>
                              <p className="text-sm text-slate-600 tracking-normal opacity-80">
                                {appt.specialization || "Clinical specialist"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="space-y-2">
                            <p className="text-sm font-bold text-slate-700 tracking-tight">
                              {appt.date}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-slate-600 tracking-normal">
                              <BiTime size={14} className="text-slate-500" />
                              <p>{appt.time}</p>{" "}
                              <span className="opacity-50">·</span>{" "}
                            </div>
                            {showGreenTimer && (
                              <div className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                                <span className="animate-pulse">●</span>
                                Starts in{" "}
                                {String(countdown.mins).padStart(2, "0")}:
                                {String(countdown.secs).padStart(2, "0")}
                              </div>
                            )}
                            {showRedTimer && (
                              <div className="text-rose-600 font-bold text-xs flex items-center gap-1">
                                <span className="animate-pulse">●</span>
                                Missed in{" "}
                                {String(missedCountdown.mins).padStart(2, "0")}:
                                {String(missedCountdown.secs).padStart(2, "0")}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <Badge
                            label={appt.type.replace("_", " ")}
                            status="info"
                            variant="soft"
                            className="text-sm font-bold tracking-normal px-3 py-1"
                          />
                        </td>
                        <td className="px-6 py-5">
                          <Badge
                            label={appt.computedStatus || appt.status}
                            status={
                              appt.computedStatus === "scheduled" ||
                              appt.computedStatus === "upcoming"
                                ? "warning"
                                : appt.computedStatus === "completed" ||
                                    appt.computedStatus === "past"
                                  ? "success"
                                  : appt.computedStatus === "ongoing"
                                    ? "info"
                                    : appt.computedStatus === "missed"
                                      ? "error"
                                      : "error"
                            }
                            variant="solid"
                            className="uppercase text-xs font-bold"
                          />
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex justify-end gap-2">
                            {(appt.computedStatus === "upcoming" ||
                              appt.computedStatus === "ongoing") && (
                              <Button
                                size="sm"
                                className="h-10 px-4 rounded-lg text-sm font-bold tracking-normal bg-emerald-500 hover:bg-emerald-600 shadow-none shadow-emerald-100"
                                onClick={() => handleJoinCell(appt)}
                                icon={<BiVideo size={14} />}
                              >
                                {appt.computedStatus === "ongoing"
                                  ? "Join Now"
                                  : "Join Room"}
                              </Button>
                            )}
                            {appt.computedStatus !== "upcoming" &&
                            appt.computedStatus !== "ongoing" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-10 px-4 rounded-lg text-xs font-bold border-slate-200 text-primary hover:bg-primary/5"
                                onClick={() => {
                                  setRebookDoctor({
                                    id: appt.practitionerId || "",
                                    name: appt.doctor.replace("Dr. ", ""),
                                    specialisation:
                                      appt.specialization ||
                                      "Clinical Specialist",
                                    avatar: appt.doctorAvatar,
                                  });
                                  setShowBookingModal(true);
                                }}
                              >
                                Re-book
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                onClick={() => setSelectedAppt(appt)}
                                className="w-10 h-10 p-0 rounded-lg flex items-center justify-center bg-slate-50 hover:bg-primary/5 text-slate-500 hover:text-primary transition-all border-none min-w-0!"
                              >
                                <BiChevronRight size={22} />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden space-y-4">
            {filteredAppointments.map((appt) => {
              const countdown = getCountdown(appt);
              const missedCountdown = getMissedCountdown(appt);
              const showGreenTimer =
                countdown &&
                (countdown.mins < 5 ||
                  (countdown.mins === 5 && countdown.secs === 0));
              const showRedTimer =
                missedCountdown &&
                missedCountdown.mins < 10 &&
                appt.computedStatus === "upcoming";
              return (
                <Card
                  key={appt.id}
                  className="p-4 border border-slate-100 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <Avatar
                      name={appt.doctor}
                      size="md"
                      className="shadow-none shadow-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3
                            className="font-bold text-slate-800 text-sm cursor-pointer hover:text-primary transition-colors"
                            onClick={() =>
                              appt.practitionerId &&
                              handleDoctorClick(appt.practitionerId)
                            }
                          >
                            {appt.doctor}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {appt.specialization || "Clinical specialist"}
                          </p>
                        </div>
                        <Badge
                          label={appt.computedStatus || appt.status}
                          status={
                            appt.computedStatus === "scheduled" ||
                            appt.computedStatus === "upcoming"
                              ? "warning"
                              : appt.computedStatus === "completed" ||
                                  appt.computedStatus === "past"
                                ? "success"
                                : appt.computedStatus === "ongoing"
                                  ? "info"
                                  : appt.computedStatus === "missed"
                                    ? "error"
                                    : "error"
                          }
                          variant="solid"
                          className="uppercase text-[9px] font-bold"
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <BiCalendar size={12} />
                          {appt.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <BiTime size={12} />
                          {appt.time}
                        </span>
                        <Badge
                          label={appt.type.replace("_", " ")}
                          status="info"
                          variant="soft"
                          className="text-[10px] font-bold px-2 py-0.5"
                        />
                      </div>
                      {showGreenTimer && (
                        <div className="mt-1 text-emerald-600 font-bold text-xs flex items-center gap-1">
                          <span className="animate-pulse">●</span>
                          Starts in {String(countdown.mins).padStart(2, "0")}:
                          {String(countdown.secs).padStart(2, "0")}
                        </div>
                      )}
                      {showRedTimer && (
                        <div className="mt-1 text-rose-600 font-bold text-xs flex items-center gap-1">
                          <span className="animate-pulse">●</span>
                          Missed in{" "}
                          {String(missedCountdown.mins).padStart(2, "0")}:
                          {String(missedCountdown.secs).padStart(2, "0")}
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(appt.computedStatus === "upcoming" ||
                          appt.computedStatus === "ongoing") && (
                          <Button
                            size="sm"
                            className="h-8 px-3 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-600"
                            onClick={() => handleJoinCell(appt)}
                            icon={<BiVideo size={12} />}
                          >
                            {appt.computedStatus === "ongoing"
                              ? "Join"
                              : "Join Room"}
                          </Button>
                        )}
                        {appt.computedStatus !== "upcoming" &&
                          appt.computedStatus !== "ongoing" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 text-xs font-bold rounded-lg border-slate-200 text-primary hover:bg-primary/5"
                              onClick={() => {
                                setRebookDoctor({
                                  id: appt.practitionerId || "",
                                  name: appt.doctor.replace("Dr. ", ""),
                                  specialisation:
                                    appt.specialization ||
                                    "Clinical Specialist",
                                  avatar: appt.doctorAvatar,
                                });
                                setShowBookingModal(true);
                              }}
                            >
                              Re-book
                            </Button>
                          )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedAppt(appt)}
                          className="h-8 px-3 text-xs font-bold rounded-lg border border-slate-200"
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ─── APPOINTMENT DETAIL MODAL ─── */}
      <Modal
        isOpen={!!selectedAppt}
        onClose={() => setSelectedAppt(null)}
        title={
          activeTab === "upcoming" || activeTab === "ongoing"
            ? "Consultation Management"
            : "Clinical Session Summary"
        }
        width="md"
      >
        {selectedAppt && (
          <div className="space-y-6 py-2">
            <div className="flex flex-col sm:flex-row gap-5 items-center p-4 sm:p-6 bg-slate-50/50 rounded-lg border border-slate-100">
              <Avatar
                src={selectedAppt.doctorAvatar}
                name={selectedAppt.doctor}
                size="xl"
                className="shadow-none shadow-slate-200"
              />
              <div className="flex-1 text-center sm:text-left">
                <h4 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight leading-tight mb-1 font-grotesk">
                  {selectedAppt.doctor}
                </h4>
                <p className="text-primary font-bold tracking-normal text-sm mb-3 opacity-80">
                  {selectedAppt.specialization || "Clinical Specialist"}
                </p>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                  <Badge
                    label={selectedAppt.date}
                    status="info"
                    variant="soft"
                    className="font-bold text-[9px]"
                  />
                  <Badge
                    label={selectedAppt.time}
                    status="premium"
                    variant="soft"
                    className="font-bold text-[9px]"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 rounded-lg space-y-4 bg-white border border-slate-100">
              <div>
                <h6 className="text-sm font-bold text-slate-500 tracking-normal mb-2 flex items-center gap-2 font-grotesk">
                  <BiMessageDetail size={14} /> Chief Complaint
                </h6>
                <p className="text-sm font-bold text-slate-600 italic leading-relaxed pl-4 border-l-2 border-primary/20">
                  "
                  {selectedAppt.description ||
                    "Routing clinical follow-up regarding treatment plan and progress."}
                  "
                </p>
              </div>
              {selectedAppt.computedStatus === "cancelled" && (
                <div className="pt-4 border-t border-slate-100">
                  <h6 className="text-sm font-bold text-rose-400 tracking-normal mb-2 flex items-center gap-2 font-grotesk">
                    <BiXCircle size={14} /> Cancellation Intel
                  </h6>
                  <p className="text-sm font-bold text-rose-600 pl-4 border-l-2 border-rose-200">
                    {selectedAppt.reason ||
                      "Patient scheduling conflict identified."}
                  </p>
                  <p className="text-sm text-rose-400 font-bold mt-2 pl-4 tracking-normal opacity-60">
                    Authority: {selectedAppt.cancelledBy || "Patient"}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              {selectedAppt.computedStatus === "upcoming" ||
              selectedAppt.computedStatus === "ongoing" ? (
                <>
                  <Button
                    fullWidth
                    className="h-14 sm:h-16 justify-between px-6 bg-primary hover:bg-primary/95 text-white shadow-none shadow-primary/20 rounded-lg"
                    onClick={() => {
                      const appt = selectedAppt!;
                      setSelectedAppt(null);
                      handleJoinCell(appt);
                    }}
                    icon={<BiVideo size={20} />}
                    iconPosition="right"
                  >
                    <span className="text-sm font-bold tracking-normal">
                      {selectedAppt.computedStatus === "ongoing"
                        ? "Join Now"
                        : "Launch Virtual Consulting Room"}
                    </span>
                  </Button>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-12 border-slate-100 text-[11px] font-bold tracking-normal rounded-lg hover:bg-slate-50"
                      onClick={() => {
                        const appt = selectedAppt!;
                        setSelectedAppt(null);
                        handleReschedule(appt);
                      }}
                      icon={<BiCalendarEdit size={16} />}
                    >
                      Reschedule
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-12 bg-rose-50 hover:bg-rose-100 text-rose-500 text-[11px] font-bold tracking-normal rounded-lg border-none"
                      onClick={() => {
                        const appt = selectedAppt!;
                        setSelectedAppt(null);
                        handleCancel(appt);
                      }}
                      icon={<BiTrash size={16} />}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : selectedAppt.computedStatus === "past" ||
                selectedAppt.computedStatus === "completed" ? (
                <>
                  <Button
                    fullWidth
                    className="h-14 sm:h-16 justify-between px-6 bg-emerald-500 hover:bg-emerald-600 text-white shadow-none shadow-emerald-100 rounded-lg"
                    icon={<BiFile size={20} />}
                    iconPosition="right"
                  >
                    <span className="text-[11px] font-bold tracking-normal">
                      Download Clinical Briefing (PDF)
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 justify-between px-6 border-slate-100 rounded-lg hover:bg-slate-50"
                  >
                    <span className="text-[11px] font-bold tracking-normal text-slate-600">
                      View Encrypted SOAP Logs
                    </span>
                    <BiCheckShield size={18} className="text-primary" />
                  </Button>
                  <div className="pt-6 border-t border-slate-100">
                    <h6 className="text-center text-sm font-bold text-slate-300 tracking-normal mb-4 font-grotesk">
                      Practitioner Feedback Efficiency
                    </h6>
                    <div className="flex justify-center gap-2 sm:gap-3">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Button
                          key={s}
                          variant="ghost"
                          className="w-12 h-12 sm:w-14 sm:h-14 p-0 bg-slate-50 hover:text-gray-400 hover:bg-gray-50 rounded-lg border-none transition-all duration-300 transform hover:scale-110 active:scale-90"
                        >
                          <BiStar
                            size={22}
                            className={
                              s <= 4
                                ? "fill-gray-400 text-gray-400"
                                : "text-slate-300"
                            }
                          />
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <Button
                  fullWidth
                  className="h-14 shadow-none shadow-primary/20 rounded-lg text-sm font-bold tracking-normal"
                  onClick={() => {
                    const appt = selectedAppt!;
                    setSelectedAppt(null); // Close the detail modal
                    setRebookDoctor({
                      id: appt.practitionerId || "",
                      name: appt.doctor.replace("Dr. ", ""),
                      specialisation:
                        appt.specialization || "Clinical Specialist",
                      avatar: appt.doctorAvatar,
                    });
                    setShowBookingModal(true);
                  }}
                >
                  Book Clinical Re-appointment
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ─── SECURE CLINICAL BOOKING MODAL ─── */}
      <BookingModal
        isOpen={showBookingModal}
        onClose={() => {
          setShowBookingModal(false);
          setRebookDoctor(null);
        }}
        doctor={rebookDoctor}
        onSuccess={() => fetchAppointments(false)}
      />

      {/* Action modals */}
      <WaitingRoomModal
        appt={waitingRoomAppt}
        timeLeft={
          waitingRoomAppt
            ? getWaitingRoomTimeLeft(waitingRoomAppt)
            : { hours: 0, minutes: 0, seconds: 0 }
        }
        onClose={() => setWaitingRoomAppt(null)}
      />
      <RescheduleModal
        appt={rescheduleAppt}
        date={rescheduleDate}
        time={rescheduleTime}
        loading={rescheduling}
        onDateChange={setRescheduleDate}
        onTimeChange={setRescheduleTime}
        onClose={() => setRescheduleAppt(null)}
        onConfirm={handleConfirmReschedule}
      />
      <CancelAppointmentModal
        appt={cancelAppt}
        loading={cancelling}
        onClose={() => setCancelAppt(null)}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
};

export default AppointmentsView;
