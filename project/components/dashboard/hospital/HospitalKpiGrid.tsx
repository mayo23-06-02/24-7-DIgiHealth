"use client";

import React from "react";
import KPICard from "@/components/ui/KPICard";
import {
  BiCalendar,
  BiDollarCircle,
  BiUserCheck,
  BiGroup,
  BiUser,
  BiPlusMedical,
  BiShield,
  BiStar,
} from "react-icons/bi";
import type { HospitalOverviewData } from "./types";

export default function HospitalKpiGrid({
  kpi,
}: {
  kpi: HospitalOverviewData["kpi"];
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
      <KPICard
        label="Consults today"
        value={kpi.consultationsToday}
        icon={<BiCalendar size={22} />}
        color="primary"
        description={`${kpi.upcomingAppointments} upcoming`}
      />
      <KPICard
        label="Doctors"
        value={`${kpi.doctorsOnDuty}/${kpi.totalDoctors}`}
        icon={<BiPlusMedical size={22} />}
        color="emerald"
        description="On duty / roster"
      />
      <KPICard
        label="Patients"
        value={kpi.uniquePatients}
        icon={<BiUser size={22} />}
        color="slate"
        description={`${kpi.patientsThisMonth} this month`}
      />
      <KPICard
        label="Staff on duty"
        value={kpi.staffOnDuty}
        icon={<BiUserCheck size={22} />}
        color="primary"
        description={`of ${kpi.totalStaff} total · ${kpi.totalNurses} nurses`}
      />
      <KPICard
        label="Revenue (month)"
        value={`R ${(kpi.revenueMonth || 0).toLocaleString("en-ZA")}`}
        icon={<BiDollarCircle size={22} />}
        color="emerald"
        description={`Today R ${(kpi.revenueToday || 0).toLocaleString("en-ZA")}`}
      />
      <KPICard
        label="Completed (month)"
        value={kpi.completedThisMonth}
        icon={<BiGroup size={22} />}
        color="slate"
        description={`${kpi.cancelledThisMonth} cancelled`}
      />
      <KPICard
        label="High-risk patients"
        value={kpi.highRiskPatients}
        icon={<BiShield size={22} />}
        color="primary"
        description="Score 76–100"
      />
      <KPICard
        label="Avg doctor rating"
        value={kpi.avgDoctorRating > 0 ? `${kpi.avgDoctorRating}/5` : "—"}
        icon={<BiStar size={22} />}
        color="slate"
        description="Facility practitioners"
      />
    </div>
  );
}
