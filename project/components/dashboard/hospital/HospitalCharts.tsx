"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { BiBarChartAlt2, BiGroup, BiBuildings } from "react-icons/bi";
import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import type { HospitalOverviewData } from "./types";

const COLORS = [
  "#4493b8",
  "#36B37E",
  "#6554C0",
  "#FFAB00",
  "#FF5630",
  "#00A3BF",
];

const tip = {
  borderRadius: "8px",
  border: "none",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  fontSize: 12,
};

export function ConsultationVolumeChart({
  data,
}: {
  data: HospitalOverviewData["monthlyData"];
}) {
  return (
    <Card className="!rounded-lg min-h-[300px] flex flex-col">
      <SectionHeader
        compact
        icon={<BiBarChartAlt2 />}
        title="Consultation volume"
        subtitle="Booked vs completed · 6 months"
        className="mb-4"
      />
      <div className="flex-1 min-h-[220px]">
        {!data?.length ? (
          <EmptyState
            title="No volume data"
            description="Appointments will populate this chart."
            className="py-8"
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={4}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={tip} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="consultations"
                name="Booked"
                fill="#4493b8"
                radius={[4, 4, 0, 0]}
                barSize={16}
              />
              <Bar
                dataKey="completed"
                name="Completed"
                fill="#36B37E"
                radius={[4, 4, 0, 0]}
                barSize={16}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

export function StaffRoleChart({
  data,
}: {
  data: HospitalOverviewData["staffByRole"];
}) {
  const chart = data.map((d) => ({
    name: d.role.charAt(0).toUpperCase() + d.role.slice(1),
    value: d.count,
    onDuty: d.onDuty,
  }));

  return (
    <Card className="!rounded-lg min-h-[300px] flex flex-col">
      <SectionHeader
        compact
        icon={<BiGroup />}
        title="Staff by role"
        subtitle="Roster composition"
        className="mb-4"
      />
      <div className="flex-1 min-h-[200px]">
        {chart.length === 0 ? (
          <EmptyState
            title="No staff data"
            description="Add staff to see role breakdown."
            icon={<BiGroup size={32} />}
            className="py-8"
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chart}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {chart.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tip}
                formatter={(v, _n, item) => [
                  `${v} (${(item as any)?.payload?.onDuty ?? 0} on duty)`,
                  (item as any)?.payload?.name,
                ]}
              />
              <Legend
                formatter={(v) => (
                  <span className="text-xs text-slate-600">{v}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

export function DepartmentChart({
  data,
}: {
  data: HospitalOverviewData["departmentBreakdown"];
}) {
  return (
    <Card className="!rounded-lg min-h-[300px] flex flex-col">
      <SectionHeader
        compact
        icon={<BiBuildings />}
        title="Departments"
        subtitle="Staff & doctors by unit"
        className="mb-4"
      />
      <div className="flex-1 min-h-[200px]">
        {data.length === 0 ? (
          <EmptyState
            title="No departments"
            description="Staff departments will appear here."
            icon={<BiBuildings size={32} />}
            className="py-8"
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.slice(0, 8)}
              layout="vertical"
              margin={{ left: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="#f1f5f9"
              />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="department"
                width={90}
                tick={{ fontSize: 10, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={tip} />
              <Bar
                dataKey="staff"
                name="Staff"
                fill="#4493b8"
                radius={[0, 4, 4, 0]}
                barSize={12}
              />
              <Bar
                dataKey="doctors"
                name="Doctors"
                fill="#36B37E"
                radius={[0, 4, 4, 0]}
                barSize={12}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
