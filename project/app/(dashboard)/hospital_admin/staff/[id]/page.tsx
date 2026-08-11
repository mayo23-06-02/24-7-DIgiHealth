"use client";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useNavigate } from "@/hooks/useNavigate";
import Card from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import EmptyState from "@/components/ui/EmptyState";
import {
  ArrowLeft,
  Loader2,
  User,
  Calendar,
  Users,
  TrendingUp,
  Star,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import type { BadgeStatus } from "@/components/ui/Badge";

const ROLE_STATUS: Record<string, BadgeStatus> = {
  doctor: "info",
  nurse: "success",
  admin: "neutral",
  technician: "warning",
};

const APPT_STATUS_MAP: Record<string, BadgeStatus> = {
  completed: "success",
  cancelled: "error",
  scheduled: "info",
  pending: "warning",
  requested: "neutral",
};

type Tab = "overview" | "appointments" | "patients" | "revenue" | "sla";

export default function StaffProfilePage() {
  const { id } = useParams() as { id: string };
  const { back } = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    fetch(`/api/hospital/staff/${id}/profile`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setData(j.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );

  if (!data)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-slate-500">
        <User size={48} className="opacity-20" />
        <p className="font-bold">Staff member not found.</p>
        <button
          onClick={() => back()}
          className="text-sm text-primary font-bold hover:underline"
        >
          ← Go back
        </button>
      </div>
    );

  const {
    staff,
    kpi,
    monthlyRevenue,
    sla,
    recentAppointments,
    recentPatients,
  } = data;
  const user = staff.userId;
  const fullName = user ? `${user.firstName} ${user.lastName}` : "Unknown";

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "appointments", label: "Appointments" },
    { key: "patients", label: "Patients" },
    { key: "revenue", label: "Revenue" },
    { key: "sla", label: "SLA" },
  ];

  return (
    <div className="w-full pb-16 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => back()}
          className="mt-1 p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 flex flex-col md:flex-row md:items-center gap-5">
          <Avatar name={fullName} size="xl" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 font-grotesk">
                {fullName}
              </h1>
              <Badge
                label={staff.role}
                status={ROLE_STATUS[staff.role] ?? "neutral"}
                className="capitalize"
              />
              <Badge
                label={staff.isOnDuty ? "On Duty" : "Off Duty"}
                status={staff.isOnDuty ? "success" : "neutral"}
                dot
              />
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {staff.department} · {staff.shiftSchedule?.start} –{" "}
              {staff.shiftSchedule?.end}
            </p>
            <div className="flex gap-4 mt-2 text-xs text-slate-500">
              {user?.email && (
                <span className="flex items-center gap-1">
                  <Mail size={13} />
                  {user.email}
                </span>
              )}
              {user?.mobile && (
                <span className="flex items-center gap-1">
                  <Phone size={13} />
                  {user.mobile}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          {
            label: "Total Consults",
            value: kpi.totalConsultations,
            icon: <Calendar size={18} />,
            color: "text-blue-500",
          },
          {
            label: "Completed",
            value: kpi.completedConsultations,
            icon: <CheckCircle2 size={18} />,
            color: "text-emerald-500",
          },
          {
            label: "Upcoming",
            value: kpi.upcomingConsultations,
            icon: <Clock size={18} />,
            color: "text-indigo-500",
          },
          {
            label: "Unique Patients",
            value: kpi.uniquePatients,
            icon: <Users size={18} />,
            color: "text-purple-500",
          },
          {
            label: "Revenue",
            value: `R${kpi.totalRevenue.toLocaleString()}`,
            icon: <TrendingUp size={18} />,
            color: "text-primary",
          },
          {
            label: "Rating",
            value: kpi.rating ? `${kpi.rating.toFixed(1)} ★` : "N/A",
            icon: <Star size={18} />,
            color: "text-amber-500",
          },
        ].map((k) => (
          <Card key={k.label} className="flex flex-col gap-1 p-4">
            <span className={`${k.color}`}>{k.icon}</span>
            <h1 className="text-2xl font-semibold text-slate-800 font-grotesk">
              {k.value}
            </h1>
            <p className="text-sm text-slate-600 font-medium">{k.label}</p>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit">
        {TABS.map((t) => (
          <Button
            key={t.key}
            onClick={() => setTab(t.key)}
            variant={tab === t.key ? "primary" : "outline"}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <h3 className="text-lg font-bold text-slate-700 mb-4 font-grotesk">
              Monthly Consultations
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyRevenue} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar
                  dataKey="consultations"
                  fill="#0052cc"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h3 className="text-lg font-bold text-slate-700 mb-4 font-grotesk">
              SLA Snapshot
            </h3>
            <div className="space-y-4">
              {[
                {
                  label: "Completion Rate",
                  value: sla.completionRate,
                  color: "bg-emerald-500",
                },
                {
                  label: "Patient Satisfaction",
                  value: sla.patientSatisfaction,
                  color: "bg-blue-500",
                },
                {
                  label: "On-Time Rate",
                  value: sla.onTimeRate,
                  color: "bg-indigo-500",
                },
                {
                  label: "Cancellation Rate",
                  value: sla.cancellationRate,
                  color: "bg-rose-400",
                },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                    <span>{m.label}</span>
                    <span>{m.value}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${m.color}`}
                      style={{ width: `${m.value}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500">Avg Response Time</p>
                <p className="text-xl font-bold text-slate-800 font-grotesk">
                  {sla.avgResponseMinutes}{" "}
                  <span className="text-sm font-normal">min</span>
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Appointments Tab */}
      {tab === "appointments" && (
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-700 font-grotesk">
              Recent Appointments
            </h3>
            <span className="text-xs text-slate-500">
              {recentAppointments.length} records
            </span>
          </div>
          {recentAppointments.length === 0 ? (
            <EmptyState
              title="No appointments found"
              description="This staff member has no recorded appointments yet."
              className="py-12"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Patient", "Date", "Type", "Complaint", "Status"].map(
                      (h) => (
                        <th
                          key={h}
                          className="py-3 px-5 text-xs font-bold text-slate-500 tracking-wider"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentAppointments.map((a: any) => (
                    <tr
                      key={a.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2">
                          <Avatar name={a.patientName} size="sm" />
                          <div>
                            <p className="text-sm font-bold text-slate-700">
                              {a.patientName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {a.patientEmail}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-xs text-slate-500">
                        {new Date(a.date).toLocaleDateString("en-ZA", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-5">
                        <span className="text-xs font-bold capitalize text-slate-600">
                          {a.type?.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-xs text-slate-500 max-w-[200px] truncate">
                        {a.chiefComplaint || "—"}
                      </td>
                      <td className="py-3 px-5">
                        <Badge
                          label={a.status}
                          status={APPT_STATUS_MAP[a.status] ?? "neutral"}
                          size="sm"
                          className="capitalize"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Patients Tab */}
      {tab === "patients" && (
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-700 font-grotesk">
              Patient History
            </h3>
            <span className="text-xs text-slate-500">
              {kpi.uniquePatients} unique patients
            </span>
          </div>
          {recentPatients.length === 0 ? (
            <EmptyState
              title="No patient history found"
              description="This staff member has no recorded patient visits yet."
              className="py-12"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Patient", "Email", "Total Visits", "Last Seen"].map(
                      (h) => (
                        <th
                          key={h}
                          className="py-3 px-5 text-xs font-bold text-slate-500 tracking-wider"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentPatients.map((p: any) => (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2">
                          <Avatar name={p.name} size="sm" />
                          <span className="text-sm font-bold text-slate-700">
                            {p.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-xs text-slate-500">
                        {p.email}
                      </td>
                      <td className="py-3 px-5">
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded-lg">
                          {p.totalVisits} visits
                        </span>
                      </td>
                      <td className="py-3 px-5 text-xs text-slate-500">
                        {new Date(p.lastSeen).toLocaleDateString("en-ZA", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Revenue Tab */}
      {tab === "revenue" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <h3 className="text-lg font-bold text-slate-700 mb-1 font-grotesk">
              Revenue (Last 6 Months)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Based on completed consultations × hourly rate
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R${v}`} />
                <Tooltip formatter={(v: any) => [`R${v}`, "Revenue"]} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0052cc"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#0052cc" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <h3 className="text-lg font-bold text-slate-700 mb-4 font-grotesk">
              Revenue Summary
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-primary/5 rounded-lg">
                <p className="text-xs text-slate-500 ">Total Earned</p>
                <p className="text-2xl font-bold text-primary font-grotesk">
                  R {kpi.totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 ">Rate/hr</p>
                  <p className="text-base font-bold text-slate-800">
                    R {staff.hourlyRate}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 ">Paid Consults</p>
                  <p className="text-base font-bold text-slate-800">
                    {kpi.completedConsultations}
                  </p>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 font-bold mb-2">
                  Monthly Breakdown
                </p>
                {monthlyRevenue.slice(-3).map((m: any) => (
                  <div
                    key={m.month}
                    className="flex justify-between text-sm py-1"
                  >
                    <span className="text-slate-600">{m.month}</span>
                    <span className="font-bold text-slate-800">
                      R {m.revenue.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* SLA Tab */}
      {tab === "sla" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              label: "Completion Rate",
              value: sla.completionRate,
              target: 90,
              icon: <CheckCircle2 size={20} />,
              color: "text-emerald-500",
              bg: "bg-emerald-50",
            },
            {
              label: "Patient Satisfaction",
              value: sla.patientSatisfaction,
              target: 85,
              icon: <Star size={20} />,
              color: "text-amber-500",
              bg: "bg-amber-50",
            },
            {
              label: "On-Time Rate",
              value: sla.onTimeRate,
              target: 85,
              icon: <Clock size={20} />,
              color: "text-indigo-500",
              bg: "bg-indigo-50",
            },
            {
              label: "Cancellation Rate",
              value: sla.cancellationRate,
              target: 10,
              icon: <XCircle size={20} />,
              color: "text-rose-500",
              bg: "bg-rose-50",
              invert: true,
            },
            {
              label: "Avg Response Time",
              value: sla.avgResponseMinutes,
              target: 30,
              unit: "min",
              icon: <Activity size={20} />,
              color: "text-blue-500",
              bg: "bg-blue-50",
              invert: true,
            },
          ].map((m: any) => {
            const met = m.invert ? m.value <= m.target : m.value >= m.target;
            return (
              <Card key={m.label} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div
                    className={`w-10 h-10 rounded-lg ${m.bg} ${m.color} flex items-center justify-center`}
                  >
                    {m.icon}
                  </div>
                  <Badge
                    label={met ? "✓ Met" : "✗ Below Target"}
                    status={met ? "success" : "error"}
                    size="sm"
                  />
                </div>
                <div>
                  <p className="text-3xl font-bold text-slate-900 font-grotesk">
                    {m.value}
                    {m.unit || "%"}
                  </p>
                  <p className="text-sm font-bold text-slate-500">{m.label}</p>
                </div>
                <div className="text-xs text-slate-500 border-t border-slate-100 pt-3">
                  Target: {m.invert ? `≤ ${m.target}` : `≥ ${m.target}`}
                  {m.unit || "%"}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
