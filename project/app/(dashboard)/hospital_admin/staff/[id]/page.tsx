"use client";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useNavigate } from "@/hooks/useNavigate";
import Card from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import Tabs from "@/components/ui/Tabs";
import KPICard from "@/components/ui/KPICard";
import Table from "@/components/ui/Table";
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

// ----- Types -----
type Tab = "overview" | "appointments" | "patients" | "revenue" | "sla";

// ----- Helper maps -----
const ROLE_STATUS: Record<string, "info" | "success" | "neutral" | "warning"> = {
  doctor: "info",
  nurse: "success",
  admin: "neutral",
  technician: "warning",
};

const APPT_STATUS_MAP: Record<string, "success" | "error" | "info" | "warning" | "neutral"> = {
  completed: "success",
  cancelled: "error",
  scheduled: "info",
  pending: "warning",
  requested: "neutral",
};

// ----- Component -----
export default function StaffProfilePage() {
  const { id } = useParams() as { id: string };
  const { back } = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        let response = await fetch(`/api/hospital/staff/${id}/profile`);
        let json = await response.json();
        if (json.success) {
          setData(json.data);
        } else if (response.status === 404) {
          response = await fetch(`/api/hospital/doctors/${id}/profile`);
          json = await response.json();
          if (json.success) setData(json.data);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-ink-600">
        <User size={48} className="opacity-20" />
        <p className="font-bold text-h4">Staff member not found.</p>
        <button onClick={() => back()} className="text-sm font-bold text-primary hover:underline">
          ← Go back
        </button>
      </div>
    );
  }

  const { staff, kpi, monthlyRevenue, sla, recentAppointments, recentPatients } = data;
  const user = staff.userId;
  const fullName = user ? `${user.firstName} ${user.lastName}` : "Unknown";

  // ----- Tab configuration -----
  const tabs = [
    { id: "overview", label: "Overview", icon: <Activity size={16} /> },
    { id: "appointments", label: "Appointments", icon: <Calendar size={16} /> },
    { id: "patients", label: "Patients", icon: <Users size={16} /> },
    { id: "revenue", label: "Revenue", icon: <TrendingUp size={16} /> },
    { id: "sla", label: "SLA", icon: <CheckCircle2 size={16} /> },
  ];

  // ----- Table column definitions -----
  const appointmentColumns = [
    {
      key: "patient",
      header: "Patient",
      isTitle: true,
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <Avatar name={row.patientName} size="sm" />
          <div>
            <div className="text-body font-bold text-ink-900">{row.patientName}</div>
            <div className="text-small text-ink-400">{row.patientEmail}</div>
          </div>
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (row: any) => (
        <span className="text-small text-ink-600">
          {new Date(row.date).toLocaleDateString("en-ZA", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (row: any) => (
        <span className="text-small font-bold capitalize text-ink-600">
          {row.type?.replace("_", " ")}
        </span>
      ),
    },
    {
      key: "complaint",
      header: "Complaint",
      render: (row: any) => (
        <span className="text-small text-ink-600 max-w-[200px] truncate block">
          {row.chiefComplaint || "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: any) => (
        <Badge
          status={APPT_STATUS_MAP[row.status] ?? "neutral"}
          size="sm"
          className="capitalize"
          label={row.status}
        />
      ),
    },
  ];

  const patientColumns = [
    {
      key: "name",
      header: "Patient",
      isTitle: true,
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <Avatar name={row.name} size="sm" />
          <span className="text-body font-bold text-ink-900">{row.name}</span>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (row: any) => <span className="text-small text-ink-600">{row.email}</span>,
    },
    {
      key: "visits",
      header: "Total Visits",
      render: (row: any) => (
        <Badge status="info" size="sm" label={`${row.totalVisits} visits`} />
      ),
    },
    {
      key: "lastSeen",
      header: "Last Seen",
      render: (row: any) => (
        <span className="text-small text-ink-600">
          {new Date(row.lastSeen).toLocaleDateString("en-ZA", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="w-full pb-16 flex flex-col gap-6">
      {/* ----- Header ----- */}
      <div className="flex items-start lg:gap-4 gap-2">
        <div className="flex-1 flex md:items-center gap-5">
          <Avatar name={fullName} size="md" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-h4 font-bold text-ink-900">{fullName}</h1>
              <Badge
                status={ROLE_STATUS[staff.role] ?? "neutral"}
                className="capitalize"
                label={staff.role}
              />
              <Badge
                status={staff.isOnDuty ? "success" : "neutral"}
                dot
                label={staff.isOnDuty ? "On Duty" : "Off Duty"}
              />
            </div>
            <p className="text-xs text-ink-600">
              {staff.department}
            </p>
            <div className="flex gap-4 text-small text-ink-600">
              {user?.email && (
                <span className="flex items-center line-clamp-1 gap-1">
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

      {/* ----- KPI Row using KPICard ----- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        <KPICard
          label="Total Consults"
          value={kpi.totalConsultations}
          icon={<Calendar size={20} />}
          color="primary"
          description="All consultations"
        />
        <KPICard
          label="Completed"
          value={kpi.completedConsultations}
          icon={<CheckCircle2 size={20} />}
          color="emerald"
          description="Finished visits"
        />
        <KPICard
          label="Upcoming"
          value={kpi.upcomingConsultations}
          icon={<Clock size={20} />}
          color="slate"
          description="Scheduled"
        />
        <KPICard
          label="Unique Patients"
          value={kpi.uniquePatients}
          icon={<Users size={20} />}
          color="amber"
          description="Distinct patients"
        />
        <KPICard
          label="Rating"
          value={kpi.rating ? `${kpi.rating.toFixed(1)} ★` : "N/A"}
          icon={<Star size={20} />}
          color="amber"
          description="Average rating"
        />
      </div>

      {/* ----- Tabs ----- */}
      <Tabs
        tabs={tabs}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as Tab)}
        className="mb-2"
      />

      {/* ----- Tab Panels ----- */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card variant="solid" className="lg:col-span-2">
            <h3 className="text-h4 font-bold text-ink-900 mb-4">Monthly Consultations</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyRevenue} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="consultations" fill="var(--color-primary-500)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card variant="solid">
            <h3 className="text-h4 font-bold text-ink-900 mb-4">SLA Snapshot</h3>
            <div className="space-y-4">
              {[
                { label: "Completion Rate", value: sla.completionRate, color: "bg-success-500" },
                { label: "Patient Satisfaction", value: sla.patientSatisfaction, color: "bg-info-500" },
                { label: "On-Time Rate", value: sla.onTimeRate, color: "bg-primary-500" },
                { label: "Cancellation Rate", value: sla.cancellationRate, color: "bg-danger-500" },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-small font-bold text-ink-600 mb-1">
                    <span>{m.label}</span>
                    <span>{m.value}%</span>
                  </div>
                  <div className="h-2 bg-surface-soft rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${m.color}`} style={{ width: `${m.value}%` }} />
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-border">
                <p className="text-small text-ink-600">Avg Response Time</p>
                <p className="text-h2 font-bold text-ink-900">
                  {sla.avgResponseMinutes} <span className="text-body font-normal">min</span>
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "appointments" && (
        <Table
          columns={appointmentColumns}
          data={recentAppointments}
          keyField="id"
          loading={false}
          emptyTitle="No appointments found"
          emptyDescription="This staff member has no recorded appointments yet."
        />
      )}

      {activeTab === "patients" && (
        <Table
          columns={patientColumns}
          data={recentPatients}
          keyField="id"
          loading={false}
          emptyTitle="No patient history found"
          emptyDescription="This staff member has no recorded patient visits yet."
        />
      )}

      {activeTab === "revenue" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card variant="solid" className="lg:col-span-2">
            <h3 className="text-h4 font-bold text-ink-900 mb-1">Revenue (Last 6 Months)</h3>
            <p className="text-small text-ink-400 mb-4">Based on completed consultations × hourly rate</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R${v}`} />
                <Tooltip formatter={(v: any) => [`R${v}`, "Revenue"]} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-primary-500)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "var(--color-primary-500)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card variant="solid">
            <h3 className="text-h4 font-bold text-ink-900 mb-4">Revenue Summary</h3>
            <div className="space-y-4">
              <div className="p-4 bg-primary-50 rounded-lg">
                <p className="text-small text-ink-600">Total Earned</p>
                <p className="text-h1 font-bold text-primary">R {kpi.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-surface-soft rounded-lg">
                  <p className="text-small text-ink-600">Rate/hr</p>
                  <p className="text-h4 font-bold text-ink-900">R {staff.hourlyRate}</p>
                </div>
                <div className="p-3 bg-surface-soft rounded-lg">
                  <p className="text-small text-ink-600">Paid Consults</p>
                  <p className="text-h4 font-bold text-ink-900">{kpi.completedConsultations}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-border">
                <p className="text-small font-bold text-ink-600 mb-2">Monthly Breakdown</p>
                {monthlyRevenue.slice(-3).map((m: any) => (
                  <div key={m.month} className="flex justify-between text-body py-1">
                    <span className="text-ink-600">{m.month}</span>
                    <span className="font-bold text-ink-900">R {m.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "sla" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {[
            {
              label: "Completion Rate",
              value: sla.completionRate,
              target: 90,
              icon: <CheckCircle2 size={20} />,
              status: sla.completionRate >= 90 ? "success" : "warning",
              unit: "%",
            },
            {
              label: "Patient Satisfaction",
              value: sla.patientSatisfaction,
              target: 85,
              icon: <Star size={20} />,
              status: sla.patientSatisfaction >= 85 ? "success" : "warning",
              unit: "%",
            },
            {
              label: "On-Time Rate",
              value: sla.onTimeRate,
              target: 85,
              icon: <Clock size={20} />,
              status: sla.onTimeRate >= 85 ? "success" : "warning",
              unit: "%",
            },
            {
              label: "Cancellation Rate",
              value: sla.cancellationRate,
              target: 10,
              icon: <XCircle size={20} />,
              status: sla.cancellationRate <= 10 ? "success" : "error",
              unit: "%",
              invert: true,
            },
            {
              label: "Avg Response Time",
              value: sla.avgResponseMinutes,
              target: 30,
              unit: "min",
              icon: <Activity size={20} />,
              status: sla.avgResponseMinutes <= 30 ? "success" : "error",
              invert: true,
            },
          ].map((m: any) => {
            const met = m.invert ? m.value <= m.target : m.value >= m.target;
            const statusColor = m.status as "success" | "warning" | "error";
            const bgMap = {
              success: "bg-success-50",
              warning: "bg-warning-50",
              error: "bg-danger-50",
            };
            const textMap = {
              success: "text-success-700",
              warning: "text-warning-700",
              error: "text-danger-700",
            };
            return (
              <Card key={m.label} variant="solid" className="flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between">
                  <div
                    className={`w-10 h-10 rounded-lg bg-primary text-primary-50 flex items-center justify-center`}
                  >
                    {m.icon}
                  </div>
                  <Badge
                    status={met ? "success" : "error"}
                    size="sm"
                    label={met ? "✓ Met" : "✗ Below Target"}
                  />
                </div>
                <div>
                  <p className="text-h1 font-normal text-ink-900">
                    {m.value}
                    {m.unit || "%"}
                  </p>
                  <p className="text-small text-ink-600">{m.label}</p>
                </div>
                <div className="text-small font-bold text-ink-600 border-t border-border pt-3">
                  <p>Target: {m.invert ? `≤ ${m.target}` : `≥ ${m.target}`}
                  {m.unit || "%"}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}