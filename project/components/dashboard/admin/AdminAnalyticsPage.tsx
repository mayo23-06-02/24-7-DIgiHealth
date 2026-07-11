"use client";

import React, { useEffect, useState } from "react";
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
import { BiRefresh, BiCalendar, BiCheckCircle, BiUserPlus, BiDollarCircle } from "react-icons/bi";
import { toast } from "react-hot-toast";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import KPICard from "@/components/ui/KPICard";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

const COLORS = ["#4493b8", "#36B37E", "#6554C0", "#FFAB00", "#FF5630", "#00A3BF"];
const tip = { borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 12 };

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?days=${days}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed");
      setData(json.data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [days]);

  return (
    <div className="w-full pb-16 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="System analytics"
        subtitle="Trends across users, consultations, and revenue"
        right={
          <div className="flex gap-2 items-center">
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                    days === d ? "bg-white text-primary shadow-sm" : "text-slate-500"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={() => void load()} icon={<BiRefresh size={16} />} iconPosition="left" className="!rounded-lg !max-w-none normal-case !tracking-normal">
              Refresh
            </Button>
          </div>
        }
      />

      {loading && !data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLoader key={i} className="h-28" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard label="Consults" value={data.kpi.consults30d} color="primary" icon={<BiCalendar size={20} />} />
            <KPICard label="Completed" value={data.kpi.completed30d} color="emerald" icon={<BiCheckCircle size={20} />} />
            <KPICard label="New users" value={data.signupTrend?.reduce((s: number, r: any) => s + r.count, 0) || 0} color="slate" icon={<BiUserPlus size={20} />} />
            <KPICard label="Revenue" value={`R ${data.kpi.revenue30d.toLocaleString("en-ZA")}`} color="emerald" icon={<BiDollarCircle size={20} />} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="!rounded-lg min-h-[280px] flex flex-col">
              <SectionHeader compact title="Consultations" className="mb-3" />
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.consultTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={(v) => String(v).slice(5)} axisLine={false} tickLine={false} interval={3} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tip} />
                    <Bar dataKey="count" fill="#4493b8" radius={[3, 3, 0, 0]} barSize={10} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="!rounded-lg min-h-[280px] flex flex-col">
              <SectionHeader compact title="Revenue" className="mb-3" />
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={(v) => String(v).slice(5)} axisLine={false} tickLine={false} interval={3} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tip} />
                    <Line type="monotone" dataKey="amount" stroke="#36B37E" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="!rounded-lg min-h-[280px] flex flex-col">
              <SectionHeader compact title="Signups" className="mb-3" />
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.signupTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={(v) => String(v).slice(5)} axisLine={false} tickLine={false} interval={3} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tip} />
                    <Line type="monotone" dataKey="count" stroke="#6554C0" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="!rounded-lg min-h-[280px] flex flex-col">
              <SectionHeader compact title="Users by role" className="mb-3" />
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.usersByRole} dataKey="count" nameKey="role" cx="50%" cy="50%" outerRadius={80}>
                      {(data.usersByRole || []).map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tip} />
                    <Legend formatter={(v) => <span className="text-xs capitalize text-slate-600">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
