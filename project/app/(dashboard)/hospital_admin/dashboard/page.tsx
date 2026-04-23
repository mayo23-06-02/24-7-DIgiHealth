"use client";

import React, { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import KPICard from "@/components/ui/KPICard";
import {
  BiCalendar,
  BiDollarCircle,
  BiUserCheck,
  BiGroup,
  BiLoaderAlt,
} from "react-icons/bi";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const MONTHLY_DATA = [
  { month: "Nov", consultations: 312 },
  { month: "Dec", consultations: 289 },
  { month: "Jan", consultations: 401 },
  { month: "Feb", consultations: 378 },
  { month: "Mar", consultations: 455 },
  { month: "Apr", consultations: 432 },
];

export default function HospitalDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/hospital/dashboard");
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[60vh]">
        <BiLoaderAlt className="animate-spin text-primary text-4xl" />
      </div>
    );
  }

  if (!data)
    return (
      <div className="p-8 text-center text-slate-500">
        Failed to load dashboard data.
      </div>
    );

  const { kpi, upcomingAppointments } = data;

  return (
    <div className="w-full pb-10 flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 font-grotesk">Facility Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Overview of today's operations</p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          label="Consultations Today"
          value={kpi.consultationsToday?.toString() ?? "0"}
          icon={<BiCalendar size={24} />}
          color="primary"
          trend={5.2}
          description="vs yesterday"
        />
        <KPICard
          label="Today's Revenue"
          value={`R ${(kpi.revenueToday ?? 0).toLocaleString()}`}
          icon={<BiDollarCircle size={24} />}
          color="emerald"
        />
        <KPICard
          label="Staff on Duty"
          value={(kpi.staffOnDuty ?? 0).toString()}
          icon={<BiUserCheck size={24} />}
          color="slate"
          description={`of ${kpi.totalStaff ?? 0} total`}
        />
        <KPICard
          label="Total Staff"
          value={(kpi.totalStaff ?? 0).toString()}
          icon={<BiGroup size={24} />}
          color="primary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 items-start">
        {/* Consultation Volume Chart */}
        <Card className="lg:col-span-4 min-h-[350px] flex flex-col">
          <div className="mb-4">
            <h3 className="font-bold text-slate-800 font-grotesk">Consultation Volume</h3>
            <p className="text-xs text-slate-500">Last 6 months</p>
          </div>
          <div className="flex-1 w-full relative min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={MONTHLY_DATA}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                barSize={32}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#f1f5f9" }}
                  contentStyle={{
                    borderRadius: "10px",
                    border: "none",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  }}
                />
                <Bar
                  dataKey="consultations"
                  fill="var(--primary)"
                  radius={[6, 6, 0, 0]}
                  name="Consultations"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Upcoming Appointments */}
        <Card className="lg:col-span-2 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-4 font-grotesk">Upcoming Appointments</h3>
          {upcomingAppointments?.length > 0 ? (
            <div className="space-y-3">
              {upcomingAppointments.map((app: any, i: number) => (
                <div
                  key={i}
                  className="flex flex-col p-3 rounded-xl border border-slate-100 bg-slate-50 gap-1"
                >
                  <p className="text-xs font-bold text-slate-700">
                    {(app.patientId as any)?.firstName}{" "}
                    {(app.patientId as any)?.lastName}
                  </p>
                  <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                    <span>
                      {new Date(app.scheduledStart).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="capitalize px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-primary font-semibold text-[11px]">
                      {app.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 py-10 text-slate-400">
              <BiCalendar size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No upcoming appointments</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
