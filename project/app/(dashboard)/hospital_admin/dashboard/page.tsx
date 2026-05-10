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
  BiPlus,
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

export default function HospitalDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/hospital/dashboard");
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`API Error ${res.status}: ${text.substring(0, 100)}`);
        }
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

  if (!data) {
    return (
      <div className="flex flex-col h-full items-center justify-center min-h-[60vh] gap-4 text-slate-500">
        <BiGroup size={40} className="opacity-30" />
        <p className="text-sm font-medium">Unable to load dashboard data.</p>
        <button
          onClick={() => window.location.reload()}
          className="text-xs font-bold text-primary border border-primary/20 px-4 py-2 rounded-lg hover:bg-primary/5 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const { kpi, upcomingAppointments, isNewUser } = data;

  if (isNewUser) {
    return (
      <div className="w-full pb-10 flex flex-col gap-8 max-w-4xl mx-auto py-12">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto mb-6">
            <BiPlus size={40} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 font-grotesk">
            Welcome to DigiHealth, {data.name || "Administrator"}
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            You're just one step away from managing your facility. Let's get
            your hospital profile set up so you can start tracking operations
            and staff.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Card
            className="p-8 hover:border-primary transition-all cursor-pointer group"
            onClick={() => (window.location.href = "/hospital_admin/facility")}
          >
            <h3 className="text-xl font-bold text-slate-800 mb-2 font-grotesk">
              1. Complete Facility Profile
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Enter your hospital's name, capacity, and operating hours.
            </p>
            <span className="text-primary font-bold flex items-center gap-2 group-hover:gap-3 transition-all">
              Go to Settings →
            </span>
          </Card>
          <Card
            className="p-8 hover:border-primary transition-all cursor-pointer group"
            onClick={() => (window.location.href = "/hospital_admin/staff")}
          >
            <h3 className="text-xl font-bold text-slate-800 mb-2 font-grotesk">
              2. Add Your First Staff
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Onboard doctors, nurses, and administrative personnel.
            </p>
            <span className="text-primary font-bold flex items-center gap-2 group-hover:gap-3 transition-all">
              Manage Staff →
            </span>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-10 flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 font-grotesk">
          Facility Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Overview of today's operations
        </p>
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
            <h3 className="font-bold text-slate-800 font-grotesk">
              Consultation Volume
            </h3>
            <p className="text-xs text-slate-500">Last 6 months</p>
          </div>
          <div className="flex-1 w-full relative min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.monthlyData || []}
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
          <h3 className="font-bold text-lg text-slate-800 mb-4 font-grotesk">
            Upcoming Appointments
          </h3>
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
