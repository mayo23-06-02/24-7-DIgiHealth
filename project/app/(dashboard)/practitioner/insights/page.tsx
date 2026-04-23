"use client";

import React, { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import KPICard from "@/components/ui/KPICard";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  BiLoaderAlt,
  BiDownload,
  BiUser,
  BiPulse,
  BiCalendarCheck,
} from "react-icons/bi";

const COLORS = ["#36B37E", "#FFAB00", "#FF5630"];
const CHART_COLORS = [
  "#0052CC",
  "#00A3BF",
  "#6554C0",
  "#FF5630",
  "#36B37E",
  "#FFAB00",
  "#FF8B00",
  "#0065FF",
];

export default function ClinicalInsightsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/practitioner/insights?days=${days}`);
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [days]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <BiLoaderAlt className="animate-spin text-primary text-4xl" />
      </div>
    );

  return (
    <div className="w-full pb-10 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Clinical Insights
          </h1>
          <p className="text-sm text-slate-500">
            AI-powered analytics for your patient population
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-2 text-xs font-bold rounded-lg transition-all ${days === d ? "bg-white text-primary shadow-none" : "text-slate-500 hover:text-slate-700"}`}
              >
                {d}d
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            <BiDownload size={16} /> Export PDF
          </button>
        </div>
      </div>

      {data && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KPICard
              label="Total Patients"
              value={data.totalPatients}
              icon={<BiUser size={24} />}
              color="primary"
            />
            <KPICard
              label="Total Consultations"
              value={data.totalConsults}
              icon={<BiPulse size={24} />}
              color="emerald"
            />
            <KPICard
              label="Adherence Rate"
              value={`${data.adherencePercent}%`}
              icon={<BiCalendarCheck size={24} />}
              color="slate"
              description="Attended vs scheduled"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Distribution */}
            <Card className="flex flex-col min-h-[300px]">
              <div className="mb-4">
                <h3 className="font-bold text-slate-800">
                  Risk Score Distribution
                </h3>
                <p className="text-xs text-slate-500">Patients by risk level</p>
              </div>
              <div className="flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.riskDist}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {data.riskDist.map((_: any, idx: number) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Legend
                      formatter={(v) => (
                        <span className="text-xs capitalize text-slate-600">
                          {v} risk
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Consultation Trend */}
            <Card className="flex flex-col min-h-[300px]">
              <div className="mb-4">
                <h3 className="font-bold text-slate-800">
                  Consultation Volume
                </h3>
                <p className="text-xs text-slate-500">
                  Consultations per day (last {days} days)
                </p>
              </div>
              <div className="flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.consultTrend}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#0052CC"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#0052CC" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Chronic Conditions */}
            <Card className="flex flex-col min-h-[300px]">
              <div className="mb-4">
                <h3 className="font-bold text-slate-800">
                  Chronic Condition Prevalence
                </h3>
                <p className="text-xs text-slate-500">
                  Conditions across your patient population
                </p>
              </div>
              <div className="flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.conditions} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={120}
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
                      {data.conditions.map((_: any, idx: number) => (
                        <Cell
                          key={idx}
                          fill={CHART_COLORS[idx % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Top Diagnoses/Reasons */}
            <Card className="flex flex-col min-h-[300px]">
              <div className="mb-4">
                <h3 className="font-bold text-slate-800">
                  Top Consultation Reasons
                </h3>
                <p className="text-xs text-slate-500">
                  Most common chief complaints
                </p>
              </div>
              <div className="flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topReasons} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={140}
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#6554C0"
                      radius={[0, 4, 4, 0]}
                      barSize={14}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
