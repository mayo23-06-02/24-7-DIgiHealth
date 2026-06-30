"use client";

import React from "react";
import Card from "@/components/ui/Card";
import { usePractitionerDashboard } from "@/hooks/usePractitionerDashboard";
import StatsGrid from "./StatsGrid";
import PatientChart from "./PatientChart";
import CalendarCarousel from "./CalendarCarousel";
import ScheduleList from "./ScheduleList";
import PendingRequests from "./PendingRequests";
import { BiPlus } from "react-icons/bi";

export default function PractitionerOverview() {
  const { data, loading, actionLoading, handleRequestAction } =
    usePractitionerDashboard();
  const [viewDate, setViewDate] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState(new Date());

  // Filter schedule for selected date
  const filteredSchedule = React.useMemo(() => {
    if (!data.queue) return [];
    return data.queue.filter((item) => {
      const itemDate = new Date(item.scheduledStart);
      return (
        itemDate.getDate() === selectedDate.getDate() &&
        itemDate.getMonth() === selectedDate.getMonth() &&
        itemDate.getFullYear() === selectedDate.getFullYear()
      );
    });
  }, [data.queue, selectedDate]);

  // When month changes, reset selected date
  React.useEffect(() => {
    const today = new Date();
    const isCurrentMonth =
      viewDate.getMonth() === today.getMonth() &&
      viewDate.getFullYear() === today.getFullYear();
    setSelectedDate(
      isCurrentMonth
        ? today
        : new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
    );
  }, [viewDate]);

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 rounded-full border-4 border-slate-200 border-t-primary" />
      </div>
    );
  }

  if (data.isNewUser) {
    return (
      <div className="w-full pb-10 flex flex-col gap-8 max-w-4xl mx-auto py-12">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto mb-6">
            <BiPlus size={40} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 font-grotesk">
            Welcome to DigiHealth, Dr.{" "}
            {data.practitioner?.name?.split(" ")[1] || "Practitioner"}
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Your clinical workspace is almost ready. Let's complete your
            professional profile so patients can find and book consultations
            with you.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Card
            className="p-8 hover:border-primary transition-all cursor-pointer group"
            onClick={() => (window.location.href = "/practitioner/profile")}
          >
            <h3 className="text-xl font-bold text-slate-800 mb-2 font-grotesk">
              1. Complete Professional Profile
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Set your specialization, bio, and consultation rates.
            </p>
            <span className="text-primary font-bold flex items-center gap-2 group-hover:gap-3 transition-all">
              Edit Profile →
            </span>
          </Card>
          <Card
            className="p-8 hover:border-primary transition-all cursor-pointer group"
            onClick={() => (window.location.href = "/practitioner/patients")}
          >
            <h3 className="text-xl font-bold text-slate-800 mb-2 font-grotesk">
              2. Browse Patient Database
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Explore the living digital twins and clinical histories of
              patients.
            </p>
            <span className="text-primary font-bold flex items-center gap-2 group-hover:gap-3 transition-all">
              View Patients →
            </span>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-10">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          {/* Stats + Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <StatsGrid
                upcomingCount={data.upcomingCount}
                upcomingTrend={data.upcomingTrend}
                totalVisitors={data.totalVisitors}
                visitorsTrend={data.visitorsTrend}
                riskAlerts={data.riskAlerts.length}
                canceledThisWeek={data.canceledThisWeek}
              />
            </div>
            <div className="lg:col-span-5">
              <PatientChart data={data.chartData || []} />
            </div>
          </div>

          {/* Schedule */}
          <Card className="flex flex-col gap-8">
            <CalendarCarousel
              viewDate={viewDate}
              selectedDate={selectedDate}
              onViewDateChange={setViewDate}
              onSelectedDateChange={setSelectedDate}
            />
            <ScheduleList items={filteredSchedule} selectedDate={selectedDate} />
          </Card>
        </div>

        {/* RIGHT COLUMN – Pending Requests */}
        <Card className="xl:col-span-4 min-h-full">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-800 font-grotesk">
              Pending Requests
            </h3>
          </div>
          <PendingRequests
            requests={data.pendingRequests || []}
            onAccept={(id) => handleRequestAction(id, "scheduled")}
            onDecline={(id) => handleRequestAction(id, "cancelled")}
            actionLoading={actionLoading}
          />
        </Card>
      </div>
    </div>
  );
}