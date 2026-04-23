"use client";

import React from "react";
import {
  BiGroup,
  BiCalendarCheck,
  BiUserPlus,
  BiCalendarX,
  BiShow,
  BiCalendarEvent,
  BiVideo,
  BiPhone,
  BiDotsVerticalRounded,
  BiFilter,
  BiChevronDown,
  BiPlus,
  BiChevronRight,
  BiPulse,
} from "react-icons/bi";
import Avatar from "@/components/ui/Avatar";
import Card from "@/components/ui/Card";
import { toast } from "react-hot-toast";
import KPICard from "@/components/ui/KPICard";
import Link from "next/link";
import Carousel from "@/components/ui/Carousel";
import Button from "@/components/ui/Button";

export default function PractitionerDashboard() {
  const [dashboardData, setDashboardData] = React.useState<any>({
    upcomingCount: 0,
    queue: [],
    pendingRequests: [],
    riskAlerts: [],
  });
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [menuOpenRow, setMenuOpenRow] = React.useState<string | null>(null);

  // Calendar State
  const [viewDate, setViewDate] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [isMonthOpen, setIsMonthOpen] = React.useState(false);
  // Filtered Schedule List
  const filteredSchedule = React.useMemo(() => {
    if (!dashboardData.queue) return [];
    return dashboardData.queue.filter((item: any) => {
      const itemDate = new Date(item.scheduledStart);
      return (
        itemDate.getDate() === selectedDate.getDate() &&
        itemDate.getMonth() === selectedDate.getMonth() &&
        itemDate.getFullYear() === selectedDate.getFullYear()
      );
    });
  }, [dashboardData.queue, selectedDate]);

  // Generate Month Range (-2 to +5) for dropdown
  const monthOptions = React.useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = -2; i <= 5; i++) {
      options.push(new Date(today.getFullYear(), today.getMonth() + i, 1));
    }
    return options;
  }, []);

  // Generate 10-day window — from today if current month, else from 1st of selected month
  const calendarDays = React.useMemo(() => {
    const today = new Date();
    const isCurrentMonth =
      viewDate.getMonth() === today.getMonth() &&
      viewDate.getFullYear() === today.getFullYear();
    const startDay = isCurrentMonth
      ? today
      : new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    return Array.from({ length: 10 }, (_, i) => {
      const d = new Date(startDay);
      d.setDate(startDay.getDate() + i);
      return d;
    });
  }, [viewDate]);

  // When month changes, reset selected date to first day of new calendarDays
  React.useEffect(() => {
    const today = new Date();
    const isCurrentMonth =
      viewDate.getMonth() === today.getMonth() &&
      viewDate.getFullYear() === today.getFullYear();
    setSelectedDate(
      isCurrentMonth
        ? today
        : new Date(viewDate.getFullYear(), viewDate.getMonth(), 1),
    );
  }, [viewDate]);

  React.useEffect(() => {
    let isMounted = true;
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/practitioner/dashboard");
        const data = await res.json();
        if (data.success && isMounted) {
          setDashboardData(data.data);
        }
        if (isMounted) setLoading(false);
      } catch (err) {
        console.error(err);
        if (isMounted) setLoading(false);
      }
    };

    // Initial fetch
    fetchDashboard();

    // Live feed polling
    const interval = setInterval(fetchDashboard, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleRequestAction = async (
    id: string,
    newStatus: "scheduled" | "cancelled",
  ) => {
    setActionLoading(id);
    const toastId = toast.loading(
      newStatus === "scheduled"
        ? "Accepting request..."
        : "Declining request...",
    );

    try {
      const res = await fetch(`/api/practitioner/consultations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(
          `Request ${newStatus === "scheduled" ? "Accepted" : "Declined"}! Patient notified.`,
          { id: toastId },
        );

        // Optimistically update live feed to feel instantaneous without reload
        setDashboardData((prev: any) => ({
          ...prev,
          pendingRequests: prev.pendingRequests.filter(
            (req: any) => req.consultationId !== id,
          ),
          // if accepted, we could theoretically push it into queue array immediately, but polling catches it in <5s anyway
        }));
      } else {
        toast.error(data.error || "Failed to process request", { id: toastId });
      }
    } catch (err) {
      toast.error("Network error while processing", { id: toastId });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 rounded-full border-4 border-slate-200 border-t-primary"></div>
      </div>
    );
  }

  // Removed hardcoded scheduleList and requests as they are now replaced by database-driven 'queue' and 'pendingRequests'

  return (
    <div className="w-full pb-10">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (Stats + Schedule) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          {/* Top Row: Stats Grid + Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Stats Grid */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <KPICard
                label="Appointments Today"
                value={dashboardData.upcomingCount.toString()}
                trend={5.6}
                description="vs. Yesterday"
                icon={<BiCalendarEvent size={24} />}
                color="primary"
              />
              <KPICard
                label="Total Visitors"
                value={dashboardData.totalVisitors?.toString() || "0"}
                trend={12.5}
                description="Total unique patients"
                icon={<BiShow size={24} />}
                color="emerald"
              />
              <KPICard
                label="High Risk Patients"
                value={dashboardData.riskAlerts.length.toString()}
                trend={-4.0}
                description="This week"
                icon={<BiPulse size={24} />}
                color="red"
              />
              <KPICard
                label="Canceled Appointments"
                value={dashboardData.canceledThisWeek?.toString() || "0"}
                trend={0}
                description="This week"
                icon={<BiCalendarX size={24} />}
                color="slate"
              />
            </div>

            {/* Patients Overview Chart */}
            <Card className="lg:col-span-5 flex flex-col min-h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-slate-800">
                  Patients Overview
                </h3>
                <button className="flex items-center gap-1.5 text-xs font-bold text-slate-500 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                  This Month <BiChevronDown />
                </button>
              </div>

              <div className="flex-1 flex w-full relative min-h-[180px]">
                {/* Y Axis */}
                <div className="flex flex-col justify-between items-end pr-4 text-xs font-bold text-slate-400 h-[150px]">
                  {[10, 8, 6, 4, 2, 0].map((l, i) => (
                    <span key={i}>{l}</span>
                  ))}
                </div>

                {/* Bars */}
                <div className="flex-1 flex justify-between items-end h-[150px] relative border-b border-slate-100">
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="w-full border-t border-slate-50 border-dashed"
                      ></div>
                    ))}
                  </div>

                  {(dashboardData.chartData || []).map(
                    (item: any, i: number) => {
                      const maxVal = Math.max(
                        ...(dashboardData.chartData || []).map(
                          (d: any) => d.value,
                        ),
                        1,
                      );
                      const isActive = item.value === maxVal && item.value > 0;

                      return (
                        <div
                          key={i}
                          className="flex flex-col items-center justify-end gap-2 group w-full h-full relative z-10 px-1 xl:px-2"
                        >
                          <span className="text-xs font-bold text-slate-500 border border-slate-200 bg-white rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 shadow-none">
                            {item.value} patients
                          </span>
                          <div className="w-full h-full max-w-[40px] bg-slate-100 rounded-t flex flex-col justify-end group-hover:bg-slate-200 transition-colors">
                            <div
                              className={`w-full rounded-t transition-all duration-500 ${isActive ? "bg-primary shadow-[0_4px_15px_rgba(46,49,146,0.4)]" : "bg-primary/20"}`}
                              style={{
                                height: `${(item.value / item.max) * 100}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>

                <div className="absolute bottom-0 right-0 left-[35px] flex justify-between transform translate-y-full pt-3">
                  {(dashboardData.chartData || []).map(
                    (item: any, i: number) => (
                      <div
                        key={i}
                        className="w-full text-center text-xs font-bold text-slate-400"
                      >
                        {item.label}
                      </div>
                    ),
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Upcoming Appointments & Schedule List */}
          <Card className="flex flex-col gap-8">
            {/* Calendar Carousel */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-slate-800">
                  Upcoming Appointments
                </h3>
                <div className="relative">
                  <button
                    onClick={() => setIsMonthOpen(!isMonthOpen)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-500 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    {viewDate.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                    <BiChevronDown
                      className={`transition-transform duration-200 ${isMonthOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isMonthOpen && (
                    <div className="absolute top-full right-0 mt-1 w-40 bg-white border border-slate-100 rounded-xl shadow-none z-[60] py-2 animate-in fade-in zoom-in-95 duration-200">
                      {monthOptions.map((m, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setViewDate(m);
                            setIsMonthOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${
                            m.getMonth() === viewDate.getMonth() &&
                            m.getFullYear() === viewDate.getFullYear()
                              ? "text-primary bg-primary/5"
                              : "text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          {m.toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          })}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar">
                {calendarDays.map((date, i) => {
                  const isActive =
                    date.getDate() === selectedDate.getDate() &&
                    date.getMonth() === selectedDate.getMonth() &&
                    date.getFullYear() === selectedDate.getFullYear();
                  const isToday = i === 0;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(new Date(date))}
                      className={`flex flex-col items-center gap-1 shrink-0 w-14 py-3 rounded-xl border font-bold transition-all duration-200 ${
                        isActive
                          ? "border-primary bg-primary/5 text-primary shadow-none ring-1 ring-primary/20"
                          : "border-slate-100 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`text-[9px] uppercase tracking-normal font-bold ${
                          isActive
                            ? "text-primary"
                            : isToday
                              ? "text-primary/60"
                              : "text-slate-400"
                        }`}
                      >
                        {date.toLocaleDateString("en-US", { weekday: "short" })}
                      </span>
                      <span className="text-base leading-none">
                        {date.getDate()}
                      </span>
                      {isToday && !isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Schedule List */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-slate-800">
                  Schedule List (
                  {selectedDate.toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "short",
                  })}
                  )
                </h3>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 text-xs"
                  >
                    <BiFilter size={16} /> Filter
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50/80">
                      <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-normal first:rounded-tl-lg">
                        Appoint for
                      </th>
                      <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-normal">
                        Name
                      </th>
                      <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-normal">
                        Time
                      </th>
                      <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-normal text-center">
                        Method
                      </th>
                      <th className="py-4 px-6 last:rounded-tr-lg"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredSchedule.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-12 text-center text-slate-400 text-sm font-medium bg-slate-50/30 rounded-xl"
                        >
                          No appointments scheduled for this day
                        </td>
                      </tr>
                    ) : (
                      filteredSchedule.map((item: any, i: number) => (
                        <tr
                          key={item.consultationId || i}
                          className="hover:bg-slate-50/50 transition-colors group"
                        >
                          <td className="py-4 px-6 border-b border-transparent">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-2 h-2 rounded-full ${item.type === "video" ? "bg-indigo-500" : "bg-rose-400"}`}
                              ></div>
                              <span className="text-xs font-bold text-slate-700 capitalize">
                                {item.type} Consultation
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6 border-b border-transparent">
                            <div className="flex items-center gap-3">
                              <Avatar name={item.patientName} size="sm" />
                              <span className="text-xs font-bold text-slate-800">
                                {item.patientName}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6 border-b border-transparent">
                            <span className="text-xs font-bold text-slate-500">
                              {new Date(item.scheduledStart).toLocaleTimeString(
                                "en-ZA",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                              {" - "}
                              {new Date(item.scheduledEnd).toLocaleTimeString(
                                "en-ZA",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                          </td>
                          <td className="py-4 px-6 border-b border-transparent">
                            <div className="flex items-center justify-center">
                              <div className="w-8 h-8 rounded-lg bg-slate-50 shadow-none border border-slate-100 flex items-center justify-center">
                                {item.type === "video" ? (
                                  <BiVideo
                                    className="text-emerald-500"
                                    size={16}
                                  />
                                ) : (
                                  <BiPhone
                                    className="text-amber-500"
                                    size={16}
                                  />
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 border-b border-transparent text-right relative">
                            <Button
                              variant="ghost"
                              onClick={() =>
                                setMenuOpenRow(
                                  menuOpenRow === item.consultationId
                                    ? null
                                    : item.consultationId,
                                )
                              }
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors ml-auto p-0"
                            >
                              <BiDotsVerticalRounded size={20} />
                            </Button>
                            {menuOpenRow === item.consultationId && (
                              <div className="absolute right-12 top-10 bg-white border border-slate-200 rounded-lg shadow-none shadow-slate-200/50 flex flex-col py-2 w-40 z-50 animate-in fade-in zoom-in-95 duration-100">
                                <Link
                                  href={`/practitioner/messages?patient=${item.patientId}`}
                                  className="text-left px-4 py-2 text-xs font-bold text-slate-600 hover:text-primary hover:bg-primary/5 flex items-center gap-2"
                                >
                                  Message Patient
                                </Link>
                                <Link
                                  href={`/practitioner/patients/${item.patientId}`}
                                  className="text-left px-4 py-2 text-xs font-bold text-slate-600 hover:text-primary hover:bg-primary/5 flex items-center gap-2"
                                >
                                  View Profile
                                </Link>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN (Appoint Request) */}
        <Card className="xl:col-span-4 min-h-full">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-bold text-slate-800">
              Pending Requests
            </h3>
          </div>

          <div className="flex flex-col gap-4">
            {dashboardData.pendingRequests &&
            dashboardData.pendingRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium text-sm bg-slate-50/50 rounded-xl border border-slate-100 border-dashed">
                No pending requests
              </div>
            ) : (
              (dashboardData.pendingRequests || []).map(
                (req: any, i: number) => (
                  <div
                    key={req.consultationId || i}
                    onClick={() =>
                      (window.location.href = `/practitioner/patients/${req.patientId}`)
                    }
                    className="p-5 rounded-lg border border-slate-100 bg-white hover:border-slate-200 transition-colors shadow-none shadow-slate-100/50 cursor-pointer"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <Avatar name={req.patientName} size="md" />
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-slate-800 mb-1 leading-none">
                          {req.patientName}
                        </h4>
                        <p className="text-xs font-medium text-slate-500 mb-1">
                          {new Date(req.scheduledStart).toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                          <p className="text-xs font-bold text-slate-400 capitalize">
                            {req.type} Consultation
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRequestAction(req.consultationId, "cancelled");
                        }}
                        isLoading={actionLoading === req.consultationId}
                        className="flex-1 text-rose-500 bg-rose-50 hover:bg-rose-100"
                      >
                        Reject
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRequestAction(req.consultationId, "scheduled");
                        }}
                        isLoading={actionLoading === req.consultationId}
                        className="flex-1"
                      >
                        Accept
                      </Button>
                    </div>
                  </div>
                ),
              )
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
