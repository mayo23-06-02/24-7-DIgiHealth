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
  const { data, loading, actionLoading, handleRequestAction, refetch } =
    usePractitionerDashboard();
  const [viewDate, setViewDate] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [chartPeriod, setChartPeriod] = React.useState('current');

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

  // Handle chart period change
  const handleChartPeriodChange = React.useCallback((period: string) => {
    setChartPeriod(period);
    // In a real implementation, this would trigger a new API call with the period parameter
    // For now, we'll just update the state
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 rounded-full border-4 border-slate-200 border-t-primary" />
      </div>
    );
  }

 

  return (
    <div className="w-full pb-10">
       
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          {/* Stats + Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
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
              <PatientChart 
                data={data.chartData || []} 
                selectedPeriod={chartPeriod}
                onPeriodChange={handleChartPeriodChange}
              />
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