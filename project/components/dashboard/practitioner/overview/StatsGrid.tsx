

"use client";

import React from 'react';
import { useNavigate } from '@/hooks/useNavigate';
import KPICard from '@/components/ui/KPICard';
import { BiCalendarEvent, BiShow, BiPulse, BiCalendarX, BiUserPlus } from 'react-icons/bi';

interface StatsGridProps {
  upcomingCount: number;
  upcomingTrend?: number;
  totalVisitors?: number;
  visitorsTrend?: number;
  riskAlerts: number;
  canceledThisWeek?: number;
}

export default function StatsGrid({
  upcomingCount,
  upcomingTrend = 0,
  totalVisitors = 0,
  visitorsTrend = 0,
  riskAlerts,
  canceledThisWeek = 0,
}: StatsGridProps) {
  const { navigate, isPending, pendingHref } = useNavigate();

  // Helper to get current date in YYYY-MM-DD format
  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Helper to get start of current week (Monday)
  const getWeekStart = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  // Helper to get end of current week (Sunday)
  const getWeekEnd = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? 0 : 7);
    const sunday = new Date(today.setDate(diff));
    return sunday.toISOString().split('T')[0];
  };

  const today = getCurrentDate();
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();

  // Hrefs are hoisted so each card can tell whether *it* is the pending one.
  const appointmentsTodayHref = `/practitioner/appointments?tab=all&dateFrom=${today}&dateTo=${today}`;
  const newPatientsHref = `/practitioner/appointments?tab=requests&dateFrom=${today}&dateTo=${today}`;
  const highRiskHref = `/practitioner/patients?dateFrom=${weekStart}&dateTo=${weekEnd}`;
  const canceledHref = `/practitioner/appointments?tab=cancelled&dateFrom=${weekStart}&dateTo=${weekEnd}`;

  const isLoadingHref = (href: string) => isPending && pendingHref === href;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <KPICard
        label="Appointments Today"
        value={upcomingCount.toString()}
        trend={upcomingTrend}
        description="vs. Yesterday"
        icon={<BiCalendarEvent size={24} />}
        color="primary"
        onClick={() => navigate(appointmentsTodayHref)}
        loading={isLoadingHref(appointmentsTodayHref)}
      />
      <KPICard
        label="Total Visitors"
        value={totalVisitors.toString()}
        trend={visitorsTrend}
        description="Total unique patients"
        icon={<BiUserPlus size={24} />}
        color="emerald"
        onClick={() => navigate(newPatientsHref)}
        loading={isLoadingHref(newPatientsHref)}
      />
      </div>
     <div className="flex gap-2 w-full">
      <KPICard
        label="High Risk Patients"
        value={riskAlerts.toString()}
        trend={-4.0}
        description="This week"
        icon={<BiPulse size={24} />}
        color="red"
        onClick={() => navigate(highRiskHref)}
        loading={isLoadingHref(highRiskHref)}
      />
      <KPICard
        label="Canceled Appointments"
        value={canceledThisWeek.toString()}
        trend={0}
        description="This week"
        icon={<BiCalendarX size={24} />}
        color="slate"
        onClick={() => navigate(canceledHref)}
        loading={isLoadingHref(canceledHref)}
      />
     </div>
    </div>
  );
}