"use client";

import React, { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import KPICard from "@/components/ui/KPICard";
import PageHeader from "@/components/ui/PageHeader";
import {
  Users,
  Star,
  Calendar,
  Loader2,
  LineChart as LineChartIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["var(--primary)", "#10b981", "#f59e0b"];

export default function HospitalPerformancePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/hospital/performance");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch performance data");
      setData(json.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Error loading performance data");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const consultationVolume = data?.consultationVolume || [];
  const satisfactionTrend = data?.satisfactionTrend || [];
  const appointmentTypes = data?.appointmentTypes || [];
  const kpis = data?.kpis || {};

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );

  if (error)
    return (
      <div className="w-full pb-10 flex flex-col gap-6">
        <PageHeader
          title="Performance"
          subtitle="Key performance indicators and operational analytics"
        />
        <div className="text-center text-red-500 py-10">{error}</div>
      </div>
    );

  return (
    <div className="w-full pb-10 flex flex-col gap-6">
      <PageHeader
        title="Performance"
        subtitle="Key performance indicators and operational analytics"
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard
          label="Total Consultations"
          value={kpis.consultationCount?.toString() || "0"}
          icon={<Calendar size={22} />}
          color="primary"
          trend={kpis.consultationTrend || 0}
          description="vs last month"
        />
        <KPICard
          label="Patient Satisfaction"
          value={`${kpis.satisfactionScore || 0} / 5`}
          icon={<Star size={22} />}
          color="emerald"
          trend={kpis.satisfactionTrend || 0}
          description="vs last month"
        />
        <KPICard
          label="Active Patients"
          value={(kpis.activePatients || 0).toLocaleString()}
          icon={<Users size={22} />}
          color="slate"
          trend={kpis.patientsTrend || 0}
          description="vs last month"
        />
        <KPICard
          label="Revenue Growth"
          value={`${kpis.revenueGrowth || 0}%`}
          icon={<LineChartIcon size={22} />}
          color="primary"
          trend={kpis.revenueTrend || 0}
          description="vs last quarter"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Consultation Volume - Line */}
        <Card className="lg:col-span-2 flex flex-col">
          <div className="mb-4">
            <h3 className="font-bold text-slate-800 font-grotesk">Consultation Volume</h3>
            <p className="text-xs text-slate-500">Last 6 months</p>
          </div>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={consultationVolume}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "10px",
                    border: "none",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="consultations"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "var(--primary)" }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Appointment Types - Pie */}
        <Card className="flex flex-col">
          <div className="mb-4">
            <h3 className="font-bold text-slate-800 font-grotesk">Appointment Types</h3>
            <p className="text-xs text-slate-500">Distribution (this month)</p>
          </div>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={appointmentTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {appointmentTypes.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            {appointmentTypes.map((t, i) => (
              <div key={t.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                  <span className="text-slate-600">{t.name}</span>
                </div>
                <span className="font-bold text-slate-800">{t.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Satisfaction Trend Chart */}
      <Card className="flex flex-col">
        <div className="mb-4">
          <h3 className="font-bold text-slate-800 font-grotesk">Patient Satisfaction Trend</h3>
          <p className="text-xs text-slate-500">Average rating over last 6 months</p>
        </div>
        <div className="min-h-[200px]">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={satisfactionTrend} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis domain={[3.5, 5]} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: "10px",
                  border: "none",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                }}
              />
              <Bar dataKey="score" fill="#10b981" radius={[6, 6, 0, 0]} name="Satisfaction Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
