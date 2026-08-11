"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
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
  Loader2,
  User,
  Users,
  Building2,
  Calendar,
  CircleDollarSign,
  Shield,
  RefreshCw,
  Lightbulb,
  Settings,
} from "lucide-react";
import { toast } from "react-hot-toast";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import KPICard from "@/components/ui/KPICard";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

const COLORS = ["#4493b8", "#36B37E", "#6554C0", "#FFAB00", "#FF5630", "#00A3BF"];
const tip = {
  borderRadius: 8,
  border: "none",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  fontSize: 12,
};

export default function AdminOverviewPage({ rolePrefix }: { rolePrefix: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const base = `/${rolePrefix}`;

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/overview?days=30");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed");
      setData(json.data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Load failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-4 max-w-[1400px] mx-auto pb-16">
        <SkeletonLoader className="h-12 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonLoader key={i} className="h-28" />
          ))}
        </div>
        <div className="flex justify-center py-8 text-slate-400 text-sm font-semibold gap-2">
          <Loader2 className="animate-spin text-primary" size={18} />
          Loading platform overview…
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="Unable to load overview"
        description="Check your permissions and try again."
        actionLabel="Retry"
        onAction={() => void load()}
      />
    );
  }

  const k = data.kpi;

  return (
    <div className="w-full pb-16 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Platform control tower"
        subtitle="System-wide users, facilities, consultations & revenue"
        right={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void load()}
              icon={<RefreshCw size={16} />}
              iconPosition="left"
              className="!rounded-lg !max-w-none normal-case !tracking-normal"
            >
              Refresh
            </Button>
            <Link href={`${base}/settings`}>
              <Button
                size="sm"
                variant="ghost"
                icon={<Settings size={16} />}
                iconPosition="left"
                className="!rounded-lg !max-w-none normal-case !tracking-normal"
              >
                Settings
              </Button>
            </Link>
          </div>
        }
      />

      {data.system?.maintenanceMode && (
        <Card className="!bg-rose-50 !border-rose-200 text-rose-800 text-sm font-semibold">
          Maintenance mode is ON — platform access may be restricted.
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        <KPICard label="Total users" value={k.totalUsers} icon={<User size={22} />} color="primary" description={`${k.activeUsers} active · ${k.suspendedUsers} suspended`} />
        <KPICard label="Patients" value={k.patients} icon={<Users size={22} />} color="slate" />
        <KPICard label="Practitioners" value={k.practitioners} icon={<Users size={22} />} color="emerald" description={`${k.mfaPractitioners} MFA on`} />
        <KPICard label="Facilities" value={k.facilities} icon={<Building2 size={22} />} color="primary" description={`${k.facilitiesOpen} open`} />
        <KPICard label="Consults today" value={k.consultsToday} icon={<Calendar size={22} />} color="emerald" description={`${k.consults30d} / 30d`} />
        <KPICard label="Revenue 30d" value={`R ${k.revenue30d.toLocaleString("en-ZA")}`} icon={<CircleDollarSign size={22} />} color="emerald" description={`Fees R ${k.platformFees30d.toLocaleString("en-ZA")}`} />
        <KPICard label="Pending payouts" value={k.pendingPayouts} icon={<CircleDollarSign size={22} />} color="slate" description={`R ${k.pendingPayoutAmount.toLocaleString("en-ZA")}`} />
        <KPICard label="High-risk patients" value={k.highRiskPatients} icon={<Shield size={22} />} color="primary" description={`${k.staffOnDuty} staff on duty`} />
      </div>

      {data.intelligence?.length > 0 && (
        <Card className="!rounded-lg">
          <SectionHeader compact icon={<Lightbulb />} title="Platform intelligence" subtitle="Operational signals across DigiHealth" className="mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.intelligence.map((item: any) => (
              <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50/80 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-slate-800">{item.title}</p>
                  <Badge
                    label={item.severity}
                    status={
                      item.severity === "critical"
                        ? "error"
                        : item.severity === "warning"
                          ? "warning"
                          : item.severity === "success"
                            ? "success"
                            : "info"
                    }
                    className="!text-[10px] !px-2 !py-1 capitalize"
                  />
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.detail}</p>
                {item.metric && (
                  <p className="text-[11px] font-bold text-primary mt-2">{item.metric}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="!rounded-lg min-h-[280px] flex flex-col lg:col-span-2">
          <SectionHeader compact title="Consultation volume" subtitle="Last 30 days" className="mb-3" />
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.consultTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={(v) => String(v).slice(5)} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tip} />
                <Bar dataKey="count" name="Booked" fill="#4493b8" radius={[3, 3, 0, 0]} barSize={10} />
                <Bar dataKey="completed" name="Done" fill="#36B37E" radius={[3, 3, 0, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="!rounded-lg min-h-[280px] flex flex-col">
          <SectionHeader compact title="Users by role" className="mb-3" />
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.usersByRole} dataKey="count" nameKey="role" cx="50%" cy="50%" innerRadius={45} outerRadius={70}>
                  {data.usersByRole.map((_: any, i: number) => (
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="!rounded-lg min-h-[260px] flex flex-col">
          <SectionHeader compact title="Signups" subtitle="New accounts / day" className="mb-3" />
          <div className="flex-1 min-h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.signupTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={(v) => String(v).slice(5)} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tip} />
                <Line type="monotone" dataKey="count" stroke="#6554C0" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="!rounded-lg min-h-[260px] flex flex-col">
          <SectionHeader compact title="Revenue trend" subtitle="Completed payments" className="mb-3" />
          <div className="flex-1 min-h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={(v) => String(v).slice(5)} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tip} />
                <Line type="monotone" dataKey="amount" stroke="#36B37E" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card noPadding className="!rounded-lg !p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <SectionHeader compact title="Recent users" />
            <Link href={`${base}/users`} className="text-xs font-bold text-primary">View all →</Link>
          </div>
          <ul className="divide-y divide-slate-50 max-h-[320px] overflow-auto">
            {data.recentUsers.map((u: any) => (
              <li key={u.id} className="px-5 py-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{u.name}</p>
                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge label={u.role} status="neutral" className="!text-[10px] !px-2 !py-1 capitalize" />
                  <Badge
                    label={u.status}
                    status={u.status === "suspended" ? "error" : "success"}
                    className="!text-[10px] !px-2 !py-1"
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card noPadding className="!rounded-lg !p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <SectionHeader compact title="Facilities" />
            <Link href={`${base}/facilities`} className="text-xs font-bold text-primary">View all →</Link>
          </div>
          <ul className="divide-y divide-slate-50 max-h-[320px] overflow-auto">
            {data.recentFacilities.map((f: any) => (
              <li key={f.id} className="px-5 py-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{f.name}</p>
                  <p className="text-xs text-slate-400">{f.type}{f.city ? ` · ${f.city}` : ""}</p>
                </div>
                <Badge
                  label={f.isOpen ? "Open" : "Closed"}
                  status={f.isOpen ? "success" : "error"}
                  className="!text-[10px] !px-2 !py-1"
                />
              </li>
            ))}
            {!data.recentFacilities.length && (
              <li className="px-5 py-8 text-center text-sm text-slate-400">No facilities yet</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
