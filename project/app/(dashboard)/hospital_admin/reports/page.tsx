"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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
  Download,
  Loader2,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  FileText,
  Users,
  User,
  CircleDollarSign,
  Calendar,
  Building2,
  BarChart3,
  RefreshCw,
  Lightbulb,
  X,
  BedDouble,
  Stethoscope,
  UserCheck,
  Clock,
} from "lucide-react";
import { toast } from "react-hot-toast";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import KPICard from "@/components/ui/KPICard";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

type ReportType =
  | "overview"
  | "facility"
  | "doctors"
  | "patients"
  | "financial"
  | "staff"
  | "appointments";

const REPORT_TYPES: {
  id: ReportType;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "overview",
    label: "Full overview",
    description: "Facility, doctors, patients & intelligence",
    icon: <BarChart3 size={22} />,
  },
  {
    id: "facility",
    label: "Facility",
    description: "Capacity, departments, operational KPIs",
    icon: <Building2 size={22} />,
  },
  {
    id: "doctors",
    label: "Doctors",
    description: "Roster, duty, load, ratings",
    icon: <Users size={22} />,
  },
  {
    id: "patients",
    label: "Patients",
    description: "Visits, risk bands, follow-ups",
    icon: <User size={22} />,
  },
  {
    id: "financial",
    label: "Financial",
    description: "Transactions, revenue, methods",
    icon: <CircleDollarSign size={22} />,
  },
  {
    id: "staff",
    label: "Staff",
    description: "All roles, shifts, duty status",
    icon: <Users size={22} />,
  },
  {
    id: "appointments",
    label: "Appointments",
    description: "Clinic schedule and status mix",
    icon: <Calendar size={22} />,
  },
];

const SORT_OPTIONS: Record<ReportType, { value: string; label: string }[]> = {
  overview: [
    { value: "visits", label: "Visits" },
    { value: "appointments", label: "Appointments" },
    { value: "amount", label: "Amount" },
  ],
  facility: [
    { value: "appointments", label: "Appointments" },
    { value: "visits", label: "Visits" },
  ],
  doctors: [
    { value: "appointments", label: "Appointments" },
    { value: "completed", label: "Completed" },
    { value: "rating", label: "Rating" },
    { value: "name", label: "Name" },
    { value: "department", label: "Department" },
  ],
  patients: [
    { value: "visits", label: "Visits" },
    { value: "riskScore", label: "Risk score" },
    { value: "name", label: "Name" },
    { value: "lastVisit", label: "Last visit" },
  ],
  financial: [
    { value: "date", label: "Date" },
    { value: "amount", label: "Amount" },
    { value: "patient", label: "Patient" },
    { value: "status", label: "Status" },
  ],
  staff: [
    { value: "name", label: "Name" },
    { value: "role", label: "Role" },
    { value: "department", label: "Department" },
    { value: "hourlyRate", label: "Rate" },
  ],
  appointments: [
    { value: "scheduledStart", label: "Date" },
    { value: "patient", label: "Patient" },
    { value: "doctor", label: "Doctor" },
    { value: "status", label: "Status" },
  ],
};

const CHART_COLORS = [
  "#4493b8",
  "#36B37E",
  "#6554C0",
  "#FFAB00",
  "#FF5630",
  "#00A3BF",
];

const tipStyle = {
  borderRadius: 8,
  border: "none",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  fontSize: 12,
};

function buildQuery(params: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) q.set(k, v);
  });
  return q.toString();
}

export default function HospitalReportsPage() {
  const [type, setType] = useState<ReportType>("overview");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("appointments");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [risk, setRisk] = useState("");
  const [onDuty, setOnDuty] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const queryParams = useMemo(
    () => ({
      type,
      from: dateFrom || undefined,
      to: dateTo || undefined,
      search: search || undefined,
      sort: sort || undefined,
      sortDir,
      department: department || undefined,
      role: role || undefined,
      status: status || undefined,
      risk: risk || undefined,
      onDuty: onDuty || undefined,
    }),
    [
      type,
      dateFrom,
      dateTo,
      search,
      sort,
      sortDir,
      department,
      role,
      status,
      risk,
      onDuty,
    ],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = buildQuery(queryParams);
      const res = await fetch(`/api/hospital/reports?${qs}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load report");
      }
      setData(json.data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load report");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    const opts = SORT_OPTIONS[type];
    if (opts?.length && !opts.some((o) => o.value === sort)) {
      setSort(opts[0].value);
    }
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  const downloadCsv = async () => {
    setExporting("csv");
    try {
      const qs = buildQuery({ ...queryParams, format: "csv" });
      const res = await fetch(`/api/hospital/reports?${qs}`);
      if (!res.ok) throw new Error("CSV export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Hospital_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "CSV failed");
    } finally {
      setExporting(null);
    }
  };

  const downloadPdf = async () => {
    setExporting("pdf");
    toast.loading("Generating PDF report…", { id: "hosp-pdf" });
    try {
      const qs = buildQuery(queryParams);
      const res = await fetch(`/api/hospital/reports/export?${qs}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "PDF export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const cd = res.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="?([^"]+)"?/);
      a.href = url;
      a.download =
        match?.[1] ||
        `Facility_Report_${type}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded", { id: "hosp-pdf" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "PDF failed", {
        id: "hosp-pdf",
      });
    } finally {
      setExporting(null);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setDepartment("");
    setRole("");
    setStatus("");
    setRisk("");
    setOnDuty("");
    setDateFrom("");
    setDateTo("");
  };

  const RISK_LABELS: Record<string, string> = {
    green: "Low risk",
    gray: "Mild risk",
    orange: "Moderate risk",
    red: "High risk",
  };
  const STATUS_LABELS: Record<string, string> = {
    paid: "Paid",
    pending: "Pending",
    refunded: "Refunded",
    scheduled: "Scheduled",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  // Each active filter as a removable chip — makes it explicit exactly what
  // will be applied to the on-screen table *and* the PDF/CSV export, rather
  // than a bare "Clear (3)" count that hides what's actually filtering.
  const activeFilterChips = useMemo(
    () =>
      [
        search && { key: "search", label: `"${search}"`, onClear: () => setSearch("") },
        dateFrom && {
          key: "dateFrom",
          label: `From ${new Date(dateFrom).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}`,
          onClear: () => setDateFrom(""),
        },
        dateTo && {
          key: "dateTo",
          label: `To ${new Date(dateTo).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}`,
          onClear: () => setDateTo(""),
        },
        department && { key: "department", label: department, onClear: () => setDepartment("") },
        role && { key: "role", label: role.charAt(0).toUpperCase() + role.slice(1), onClear: () => setRole("") },
        status && { key: "status", label: STATUS_LABELS[status] || status, onClear: () => setStatus("") },
        risk && { key: "risk", label: RISK_LABELS[risk] || risk, onClear: () => setRisk("") },
        onDuty && {
          key: "onDuty",
          label: onDuty === "true" ? "On duty" : "Off duty",
          onClear: () => setOnDuty(""),
        },
      ].filter(Boolean) as { key: string; label: string; onClear: () => void }[],
    [search, dateFrom, dateTo, department, role, status, risk, onDuty],
  );

  const activeFilterCount = activeFilterChips.length;

  const sortLabel =
    (SORT_OPTIONS[type] || []).find((o) => o.value === sort)?.label || sort;

  type KpiEntry = { label: string; value: string | number; icon: React.ReactNode; color: string };

  const kpis = useMemo((): KpiEntry[] => {
    if (!data) return [];
    const k = data.kpi;
    const fmt = (n: number) => `R ${(n || 0).toLocaleString("en-ZA")}`;
    const deptCount = (data.departments || []).length;
    switch (type) {
      case "facility":
        return [
          { label: "Bed occupancy", value: `${data.facility?.bedCapacity?.occupancyPercent ?? 0}%`, icon: <BedDouble size={20} />, color: "primary" },
          { label: "Doctors on duty", value: `${k.doctorsOnDuty}/${k.totalDoctors}`, icon: <Stethoscope size={20} />, color: "emerald" },
          { label: "Staff on duty", value: `${k.staffOnDuty}/${k.totalStaff}`, icon: <UserCheck size={20} />, color: "emerald" },
          { label: "Departments", value: deptCount, icon: <Building2 size={20} />, color: "slate" },
          { label: "Consults today", value: k.consultationsToday, icon: <Calendar size={20} />, color: "primary" },
          { label: "Avg wait", value: `${data.facility?.waitTimeMins ?? 0} min`, icon: <Clock size={20} />, color: "slate" },
        ];
      case "doctors":
        return [
          { label: "Doctors", value: k.doctorCount, icon: <Users size={20} />, color: "primary" },
          { label: "On duty", value: k.doctorsOnDuty, icon: <UserCheck size={20} />, color: "emerald" },
          { label: "Avg rating", value: (k.avgDoctorRating ?? 0).toFixed(1), icon: <Lightbulb size={20} />, color: "primary" },
          { label: "Appointments", value: k.appointmentCount, icon: <Calendar size={20} />, color: "emerald" },
          { label: "Completed (mo)", value: k.completedThisMonth, icon: <BarChart3 size={20} />, color: "slate" },
          { label: "Departments", value: deptCount, icon: <Building2 size={20} />, color: "slate" },
        ];
      case "patients":
        return [
          { label: "Patients", value: k.patientCount, icon: <User size={20} />, color: "primary" },
          { label: "New this month", value: k.patientsThisMonth, icon: <User size={20} />, color: "emerald" },
          { label: "High risk", value: k.highRiskPatients, icon: <Lightbulb size={20} />, color: "primary" },
          { label: "Upcoming", value: k.upcomingAppointments, icon: <Calendar size={20} />, color: "slate" },
          { label: "Completed (mo)", value: k.completedThisMonth, icon: <BarChart3 size={20} />, color: "emerald" },
          { label: "Cancelled (mo)", value: k.cancelledThisMonth, icon: <X size={20} />, color: "slate" },
        ];
      case "financial":
        return [
          { label: "Period revenue", value: fmt(k.revenuePeriod), icon: <CircleDollarSign size={20} />, color: "emerald" },
          { label: "Pending", value: fmt(k.revenuePending), icon: <CircleDollarSign size={20} />, color: "slate" },
          { label: "Revenue today", value: fmt(k.revenueToday), icon: <CircleDollarSign size={20} />, color: "primary" },
          { label: "Revenue (month)", value: fmt(k.revenueMonth), icon: <CircleDollarSign size={20} />, color: "emerald" },
          { label: "Transactions", value: k.transactionCount, icon: <FileText size={20} />, color: "slate" },
          { label: "Cancelled (mo)", value: k.cancelledThisMonth, icon: <X size={20} />, color: "slate" },
        ];
      case "staff":
        return [
          { label: "Staff", value: k.staffCount, icon: <Users size={20} />, color: "primary" },
          { label: "On duty", value: k.staffOnDuty, icon: <UserCheck size={20} />, color: "emerald" },
          { label: "Doctors", value: k.doctorCount, icon: <Stethoscope size={20} />, color: "primary" },
          { label: "Nurses", value: k.totalNurses, icon: <User size={20} />, color: "slate" },
          { label: "Departments", value: deptCount, icon: <Building2 size={20} />, color: "slate" },
          { label: "Completed (mo)", value: k.completedThisMonth, icon: <BarChart3 size={20} />, color: "emerald" },
        ];
      case "appointments":
        return [
          { label: "Appointments", value: k.appointmentCount, icon: <Calendar size={20} />, color: "primary" },
          { label: "Upcoming", value: k.upcomingAppointments, icon: <Calendar size={20} />, color: "emerald" },
          { label: "Completed (mo)", value: k.completedThisMonth, icon: <BarChart3 size={20} />, color: "emerald" },
          { label: "Cancelled (mo)", value: k.cancelledThisMonth, icon: <X size={20} />, color: "slate" },
          { label: "Consults today", value: k.consultationsToday, icon: <Clock size={20} />, color: "primary" },
          { label: "Doctors on duty", value: `${k.doctorsOnDuty}/${k.totalDoctors}`, icon: <UserCheck size={20} />, color: "slate" },
        ];
      case "overview":
      default:
        return [
          { label: "Doctors", value: k.doctorCount, icon: <Users size={20} />, color: "primary" },
          { label: "Patients", value: k.patientCount, icon: <User size={20} />, color: "slate" },
          { label: "Appointments", value: k.appointmentCount, icon: <Calendar size={20} />, color: "emerald" },
          { label: "Period revenue", value: fmt(k.revenuePeriod), icon: <CircleDollarSign size={20} />, color: "emerald" },
          { label: "Pending", value: fmt(k.revenuePending), icon: <CircleDollarSign size={20} />, color: "slate" },
          { label: "High risk", value: k.highRiskPatients, icon: <Lightbulb size={20} />, color: "primary" },
        ];
    }
  }, [data, type]);

  type ChartSlot =
    | {
        kind: "bar";
        title: string;
        icon: React.ReactNode;
        data: any[];
        xKey: string;
        bars: { dataKey: string; name: string; color: string }[];
      }
    | {
        kind: "pie";
        title: string;
        icon: React.ReactNode;
        data: any[];
        dataKey: string;
        nameKey: string;
        colors?: string[];
        donut?: boolean;
      };

  const dutySplit = (rows: any[]) => {
    const on = rows.filter((r) => r.isOnDuty).length;
    return [
      { name: "On duty", value: on },
      { name: "Off duty", value: Math.max(rows.length - on, 0) },
    ];
  };

  const financialByStatus = (rows: any[]) => {
    const totals: Record<string, number> = {};
    rows.forEach((r: any) => {
      totals[r.status] = (totals[r.status] || 0) + (r.amount || 0);
    });
    return Object.entries(totals).map(([name, value]) => ({
      label: STATUS_LABELS[name] || name,
      value,
    }));
  };

  const chartSlots = useMemo((): ChartSlot[] => {
    if (!data) return [];
    const c = data.charts || {};
    const monthlyBar: ChartSlot = {
      kind: "bar",
      title: "Monthly volume",
      icon: <BarChart3 />,
      data: c.monthlyData || [],
      xKey: "month",
      bars: [
        { dataKey: "consultations", name: "Booked", color: "#4493b8" },
        { dataKey: "completed", name: "Done", color: "#36B37E" },
      ],
    };
    const deptBar: ChartSlot = {
      kind: "bar",
      title: "Department breakdown",
      icon: <Building2 />,
      data: c.departmentBreakdown || [],
      xKey: "department",
      bars: [
        { dataKey: "staff", name: "Staff", color: "#4493b8" },
        { dataKey: "doctors", name: "Doctors", color: "#36B37E" },
      ],
    };
    const riskPie: ChartSlot = {
      kind: "pie",
      title: "Patient risk",
      icon: <User />,
      data: c.riskDist || [],
      dataKey: "value",
      nameKey: "label",
      colors: (c.riskDist || []).map((e: any) => e.color),
      donut: true,
    };
    const staffRolePie: ChartSlot = {
      kind: "pie",
      title: "Staff roles",
      icon: <Users />,
      data: (c.staffByRole || []).map((r: any) => ({
        name: r.role.charAt(0).toUpperCase() + r.role.slice(1),
        value: r.count,
      })),
      dataKey: "value",
      nameKey: "name",
    };
    const apptStatusPie: ChartSlot = {
      kind: "pie",
      title: "Appointment status",
      icon: <Calendar />,
      data: c.appointmentStatus || [],
      dataKey: "value",
      nameKey: "name",
    };
    const apptTypesPie: ChartSlot = {
      kind: "pie",
      title: "Appointment types",
      icon: <FileText />,
      data: c.appointmentTypes || [],
      dataKey: "value",
      nameKey: "name",
    };
    const doctorDutyPie: ChartSlot = {
      kind: "pie",
      title: "Doctor duty split",
      icon: <Stethoscope />,
      data: dutySplit(data.tables?.doctors || []),
      dataKey: "value",
      nameKey: "name",
    };
    const staffDutyPie: ChartSlot = {
      kind: "pie",
      title: "Staff duty split",
      icon: <UserCheck />,
      data: dutySplit(data.tables?.staff || []),
      dataKey: "value",
      nameKey: "name",
    };
    const financialPie: ChartSlot = {
      kind: "pie",
      title: "Revenue by status",
      icon: <CircleDollarSign />,
      data: financialByStatus(data.tables?.financial || []),
      dataKey: "value",
      nameKey: "label",
    };

    switch (type) {
      case "facility":
        return [deptBar, staffRolePie, monthlyBar];
      case "doctors":
        return [deptBar, monthlyBar, doctorDutyPie];
      case "patients":
        return [riskPie, apptTypesPie, monthlyBar];
      case "financial":
        return [financialPie, apptTypesPie, monthlyBar];
      case "staff":
        return [staffRolePie, deptBar, staffDutyPie];
      case "appointments":
        return [apptStatusPie, apptTypesPie, monthlyBar];
      case "overview":
      default:
        return [monthlyBar, riskPie, staffRolePie];
    }
  }, [data, type]);

  const tableRows = useMemo(() => {
    if (!data?.tables) return [];
    switch (type) {
      case "doctors":
        return data.tables.doctors;
      case "patients":
        return data.tables.patients;
      case "financial":
        return data.tables.financial;
      case "staff":
        return data.tables.staff;
      case "appointments":
        return data.tables.appointments;
      case "facility":
      case "overview":
      default:
        return data.tables.doctors;
    }
  }, [data, type]);

  const columns = useMemo(() => {
    if (!tableRows.length) return [] as string[];
    return Object.keys(tableRows[0]).filter(
      (k) => typeof tableRows[0][k] !== "object" || tableRows[0][k] === null,
    );
  }, [tableRows]);

  return (
    <div className="w-full pb-16 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Facility reports"
        subtitle="In-depth intelligence on your hospital, doctors, and patients"
        right={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void load()}
              disabled={loading}
              icon={
                loading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <RefreshCw size={16} />
                )
              }
              iconPosition="left"
              className="!rounded-lg !max-w-none normal-case !tracking-normal"
            >
              Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void downloadCsv()}
              disabled={!!exporting || loading}
              icon={
                exporting === "csv" ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Download size={16} />
                )
              }
              iconPosition="left"
              className="!rounded-lg !max-w-none normal-case !tracking-normal"
            >
              CSV
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => void downloadPdf()}
              disabled={!!exporting || loading}
              icon={
                exporting === "pdf" ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <FileText size={16} />
                )
              }
              iconPosition="left"
              className="!rounded-lg !max-w-none normal-case !tracking-normal"
            >
              Download PDF
            </Button>
          </div>
        }
      />

      {/* Intelligence */}
      {data && data.intelligence?.length > 0 && (
        <Card className="!rounded-lg">
          <SectionHeader
            compact
            icon={<Lightbulb />}
            title="Report intelligence"
            subtitle="Insights from the filtered dataset"
            className="mb-4"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.intelligence.map((item: any) => (
              <div
                key={item.id}
                className="rounded-lg border border-slate-100 bg-slate-50/80 p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-slate-800">
                    {item.title}
                  </p>
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
                    className="!text-[10px] !px-2 !py-1 capitalize shrink-0"
                  />
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {item.detail}
                </p>
                {item.metric && (
                  <p className="text-[11px] font-bold text-primary mt-2">
                    {item.metric}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Report type tabs */}
      <div>
        {/* Mobile: dropdown */}
        <div className="sm:hidden pb-3">
          <Select
            value={type}
            onChange={(v) => setType(v as ReportType)}
            options={REPORT_TYPES.map((rt) => ({ value: rt.id, label: rt.label }))}
            icon={<BarChart3 size={18} className="text-ink-600" />}
          />
        </div>

        {/* Desktop: underline tabs (design system pattern) */}
        <div className="hidden sm:flex gap-1 border-b border-border overflow-x-auto no-scrollbar">
          {REPORT_TYPES.map((rt) => {
            const isActive = type === rt.id;
            return (
              <button
                key={rt.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setType(rt.id)}
                className={`relative flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                  isActive ? "text-primary" : "text-ink-600 hover:text-ink-900"
                }`}
              >
                {React.cloneElement(rt.icon as React.ReactElement<{ size?: number }>, {
                  size: 16,
                })}
                <span>{rt.label}</span>
                {isActive && (
                  <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Active tab context */}
        <p className="text-xs text-slate-500 mt-2 sm:mt-3">
          {REPORT_TYPES.find((rt) => rt.id === type)?.description}
        </p>
      </div>

      {/* Filters & sort — compact icon toolbar, full controls live in the modal */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          title="Filters"
          aria-label="Filters"
          className="relative w-10 h-10 shrink-0 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:border-primary hover:text-primary transition-colors"
        >
          <SlidersHorizontal size={18} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          title={`Sort: ${sortLabel}`}
          aria-label="Sort"
          className="w-10 h-10 shrink-0 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:border-primary hover:text-primary transition-colors"
        >
          <ArrowUpDown size={18} />
        </button>

        <button
          type="button"
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          title={sortDir === "asc" ? "Ascending — click for descending" : "Descending — click for ascending"}
          aria-label="Toggle sort direction"
          className="w-10 h-10 shrink-0 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:border-primary hover:text-primary transition-colors"
        >
          {sortDir === "asc" ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
        </button>

        {activeFilterChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {activeFilterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onClear}
                className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/15 transition-colors"
              >
                {chip.label}
                <X size={12} />
              </button>
            ))}
            <button
              type="button"
              onClick={clearFilters}
              title="Clear all filters"
              className="text-xs font-semibold text-slate-500 hover:text-danger-500 transition-colors px-1.5"
            >
              Clear all
            </button>
          </div>
        )}

        <p className="text-xs font-medium text-slate-500 ml-auto flex items-center gap-1.5">
          <FileText size={14} className="text-slate-400" />
          Exporting <span className="font-bold text-slate-800">{tableRows.length}</span>{" "}
          row{tableRows.length === 1 ? "" : "s"} · sorted by{" "}
          <span className="font-bold text-slate-800">{sortLabel}</span> (
          {sortDir === "asc" ? "asc" : "desc"})
          <a href="#report-table" className="font-semibold text-primary hover:underline ml-1">
            Preview ↓
          </a>
        </p>
      </div>

      <Modal
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters & sort"
        width="sm"
      >
        <div className="space-y-4">
          <Input
            type="search"
            label="Search"
            placeholder="Search name, department, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={18} />}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label="From"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              type="date"
              label="To"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink-600 mb-1.5">
              Sort by
            </label>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <Select
                  value={sort}
                  onChange={setSort}
                  options={(SORT_OPTIONS[type] || []).map((o) => ({
                    value: o.value,
                    label: o.label,
                  }))}
                />
              </div>
              <button
                type="button"
                onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                title={sortDir === "asc" ? "Ascending" : "Descending"}
                aria-label="Toggle sort direction"
                className="shrink-0 w-11 h-11 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:border-slate-300 hover:text-primary transition-colors"
              >
                {sortDir === "asc" ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(type === "doctors" || type === "staff" || type === "overview") && (
            <Select
              label="Department"
              value={department}
              onChange={setDepartment}
              options={[
                { value: "", label: "All" },
                ...(data?.departments || []).map((d: string) => ({
                  value: d,
                  label: d,
                })),
              ]}
            />
          )}
          {type === "staff" && (
            <Select
              label="Role"
              value={role}
              onChange={setRole}
              options={[
                { value: "", label: "All" },
                { value: "doctor", label: "Doctor" },
                { value: "nurse", label: "Nurse" },
                { value: "admin", label: "Admin" },
                { value: "technician", label: "Technician" },
              ]}
            />
          )}
          {(type === "doctors" || type === "staff") && (
            <Select
              label="On duty"
              value={onDuty}
              onChange={setOnDuty}
              options={[
                { value: "", label: "All" },
                { value: "true", label: "On duty" },
                { value: "false", label: "Off duty" },
              ]}
            />
          )}
          {(type === "financial" || type === "appointments") && (
            <Select
              label="Status"
              value={status}
              onChange={setStatus}
              options={
                type === "financial"
                  ? [
                      { value: "", label: "All" },
                      { value: "paid", label: "Paid" },
                      { value: "pending", label: "Pending" },
                      { value: "refunded", label: "Refunded" },
                    ]
                  : [
                      { value: "", label: "All" },
                      { value: "scheduled", label: "Scheduled" },
                      { value: "in_progress", label: "In progress" },
                      { value: "completed", label: "Completed" },
                      { value: "cancelled", label: "Cancelled" },
                    ]
              }
            />
          )}
          {type === "patients" && (
            <Select
              label="Risk band"
              value={risk}
              onChange={setRisk}
              options={[
                { value: "", label: "All" },
                { value: "green", label: "Low" },
                { value: "gray", label: "Mild" },
                { value: "orange", label: "Moderate" },
                { value: "red", label: "High" },
              ]}
            />
          )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-semibold text-slate-500 hover:text-danger-500 transition-colors"
              >
                Clear all filters
              </button>
            ) : (
              <span />
            )}
            <Button size="sm" onClick={() => setFiltersOpen(false)} className="!max-w-none">
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {loading && !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonLoader key={i} className="h-24 w-full" />
            ))}
          </div>
          <SkeletonLoader className="h-64 w-full" />
        </div>
      ) : !data ? (
        <EmptyState
          title="No report data"
          description="Link a facility and add appointments or staff to generate reports."
          icon={<FileText size={32} />}
          actionLabel="Retry"
          onAction={() => void load()}
        />
      ) : (
        <>
          {/* KPIs — tied to the selected report type */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {kpis.map((kpiItem) => (
              <KPICard
                key={kpiItem.label}
                label={kpiItem.label}
                value={kpiItem.value}
                icon={kpiItem.icon}
                color={kpiItem.color as any}
              />
            ))}
          </div>

          {/* Charts — tied to the selected report type */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {chartSlots.map((slot) => (
              <Card key={slot.title} className="!rounded-lg min-h-[260px] flex flex-col">
                <SectionHeader compact icon={slot.icon} title={slot.title} className="mb-3" />
                <div className="flex-1 min-h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {slot.kind === "bar" ? (
                      <BarChart data={slot.data}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#f1f5f9"
                        />
                        <XAxis
                          dataKey={slot.xKey}
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
                        <Tooltip contentStyle={tipStyle} />
                        {slot.bars.map((b) => (
                          <Bar
                            key={b.dataKey}
                            dataKey={b.dataKey}
                            name={b.name}
                            fill={b.color}
                            radius={[4, 4, 0, 0]}
                            barSize={14}
                          />
                        ))}
                      </BarChart>
                    ) : (
                      <PieChart>
                        <Pie
                          data={slot.data}
                          dataKey={slot.dataKey}
                          nameKey={slot.nameKey}
                          cx="50%"
                          cy="50%"
                          innerRadius={slot.donut ? 45 : 0}
                          outerRadius={70}
                          paddingAngle={2}
                        >
                          {slot.data.map((e: any, i: number) => (
                            <Cell
                              key={i}
                              fill={slot.colors?.[i] || e.color || CHART_COLORS[i % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tipStyle} />
                        <Legend
                          formatter={(v) => (
                            <span className="text-xs text-slate-600">{v}</span>
                          )}
                        />
                      </PieChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </Card>
            ))}
          </div>

          {/* Data table */}
          <Card id="report-table" noPadding className="!rounded-lg !p-0 overflow-hidden scroll-mt-4">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
              <SectionHeader
                compact
                icon={<ArrowUpDown />}
                title={
                  REPORT_TYPES.find((r) => r.id === type)?.label || "Report data"
                }
                subtitle={`${tableRows.length} rows · sorted by ${sort} (${sortDir})`}
              />
              {loading && (
                <Loader2 className="animate-spin text-primary" size={18} />
              )}
            </div>
            {tableRows.length === 0 ? (
              <EmptyState
                title="No rows match filters"
                description="Try clearing filters or expanding the date range."
                className="py-12"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[640px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-primary"
                          onClick={() => {
                            if (sort === col) {
                              setSortDir((d) =>
                                d === "asc" ? "desc" : "asc",
                              );
                            } else {
                              setSort(col);
                              setSortDir("desc");
                            }
                          }}
                        >
                          {col}
                          {sort === col ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {tableRows.slice(0, 100).map((row: any, i: number) => (
                      <tr key={row.id || i} className="hover:bg-slate-50/80">
                        {columns.map((col) => {
                          let v = row[col];
                          if (v instanceof Date || (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v))) {
                            try {
                              v = new Date(v).toLocaleString("en-ZA", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              });
                            } catch {
                              /* keep */
                            }
                          }
                          if (typeof v === "boolean") v = v ? "Yes" : "No";
                          return (
                            <td
                              key={col}
                              className="py-2.5 px-4 text-slate-600 max-w-[200px] truncate"
                            >
                              {String(v ?? "—")}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {tableRows.length > 100 && (
                  <p className="text-xs text-slate-400 px-5 py-3 border-t border-slate-100">
                    Showing 100 of {tableRows.length} rows — full set in CSV/PDF
                    export.
                  </p>
                )}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
