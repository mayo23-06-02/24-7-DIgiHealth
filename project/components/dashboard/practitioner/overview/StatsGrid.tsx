

"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import KPICard from '@/components/ui/KPICard';
import { BiCalendarEvent, BiShow, BiPulse, BiCalendarX } from 'react-icons/bi';

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
  const router = useRouter();

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

  const handleAppointmentsTodayClick = () => {
    const today = getCurrentDate();
    router.push(`/practitioner/appointments?tab=all&dateFrom=${today}&dateTo=${today}`);
  };

  const handleNewPatientsClick = () => {
    const today = getCurrentDate();
    router.push(`/practitioner/appointments?tab=requests&dateFrom=${today}&dateTo=${today}`);
  };

  const handleHighRiskPatientsClick = () => {
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();
    router.push(`/practitioner/patients?dateFrom=${weekStart}&dateTo=${weekEnd}`);
  };

  const handleCanceledAppointmentsClick = () => {
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();
    router.push(`/practitioner/appointments?tab=cancelled&dateFrom=${weekStart}&dateTo=${weekEnd}`);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <KPICard
        label="Appointments Today"
        value={upcomingCount.toString()}
        trend={upcomingTrend}
        description="vs. Yesterday"
        icon={<BiCalendarEvent size={24} />}
        color="primary"
        onClick={handleAppointmentsTodayClick}
      />
      <KPICard
        label="Total Visitors"
        value={totalVisitors.toString()}
        trend={visitorsTrend}
        description="Total unique patients"
        icon={<BiShow size={24} />}
        color="emerald"
        onClick={handleNewPatientsClick}
      />
      <KPICard
        label="High Risk Patients"
        value={riskAlerts.toString()}
        trend={-4.0}
        description="This week"
        icon={<BiPulse size={24} />}
        color="red"
        onClick={handleHighRiskPatientsClick}
      />
      <KPICard
        label="Canceled Appointments"
        value={canceledThisWeek.toString()}
        trend={0}
        description="This week"
        icon={<BiCalendarX size={24} />}
        color="slate"
        onClick={handleCanceledAppointmentsClick}
      />
    </div>
  );
}