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
  BiDownload,
  BiLoaderAlt,
  BiSearch,
  BiFilterAlt,
  BiSortAlt2,
  BiFile,
  BiGroup,
  BiUser,
  BiDollarCircle,
  BiCalendar,
  BiBuildings,
  BiBarChartAlt2,
  BiRefresh,
  BiBulb,
  BiX,
} from "react-icons/bi";
import { toast } from "react-hot-toast";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
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
    icon: <BiBarChartAlt2 size={22} />,
  },
  {
    id: "facility",
    label: "Facility",
    description: "Capacity, departments, operational KPIs",
    icon: <BiBuildings size={22} />,
  },
  {
    id: "doctors",
    label: "Doctors",
    description: "Roster, duty, load, ratings",
    icon: <BiGroup size={22} />,
  },
  {
    id: "patients",
    label: "Patients",
    description: "Visits, risk bands, follow-ups",
    icon: <BiUser size={22} />,
  },
  {
    id: "financial",
    label: "Financial",
    description: "Transactions, revenue, methods",
    icon: <BiDollarCircle size={22} />,
  },
  {
    id: "staff",
    label: "Staff",
    description: "All roles, shifts, duty status",
    icon: <BiGroup size={22} />,
  },
  {
    id: "appointments",
    label: "Appointments",
    description: "Clinic schedule and status mix",
    icon: <BiCalendar size={22} />,
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

  const activeFilterCount = [
    search,
    department,
    role,
    status,
    risk,
    onDuty,
    dateFrom,
    dateTo,
  ].filter(Boolean).length;

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
                  <BiLoaderAlt className="animate-spin" size={16} />
                ) : (
                  <BiRefresh size={16} />
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
                  <BiLoaderAlt className="animate-spin" size={16} />
                ) : (
                  <BiDownload size={16} />
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
                  <BiLoaderAlt className="animate-spin" size={16} />
                ) : (
                  <BiFile size={16} />
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

      {/* Report type picker */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
        {REPORT_TYPES.map((rt) => (
          <button
            key={rt.id}
            type="button"
            onClick={() => setType(rt.id)}
            className={`p-3 rounded-lg border text-left transition-all ${
              type === rt.id
                ? "border-primary bg-primary/5 "
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${
                type === rt.id
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {rt.icon}
            </div>
            <p
              className={`text-xs font-bold ${
                type === rt.id ? "text-primary" : "text-slate-800"
              }`}
            >
              {rt.label}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
              {rt.description}
            </p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card className="!rounded-lg space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <SectionHeader
            compact
            icon={<BiFilterAlt />}
            title="Filters & sort"
            subtitle="Narrow the report, then export PDF or CSV"
          />
          {activeFilterCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={clearFilters}
              icon={<BiX size={16} />}
              iconPosition="left"
              className="!rounded-lg !max-w-none normal-case !tracking-normal"
            >
              Clear ({activeFilterCount})
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <div className="relative">
              <BiSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="search"
                placeholder="Search name, department, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white"
              />
            </div>
          </div>
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">
              Sort by
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-primary"
            >
              {(SORT_OPTIONS[type] || []).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">
              Direction
            </label>
            <select
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-primary"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
          {(type === "doctors" || type === "staff" || type === "overview") && (
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-primary"
              >
                <option value="">All</option>
                {(data?.departments || []).map((d: string) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}
          {type === "staff" && (
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-primary"
              >
                <option value="">All</option>
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="admin">Admin</option>
                <option value="technician">Technician</option>
              </select>
            </div>
          )}
          {(type === "doctors" || type === "staff") && (
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                On duty
              </label>
              <select
                value={onDuty}
                onChange={(e) => setOnDuty(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-primary"
              >
                <option value="">All</option>
                <option value="true">On duty</option>
                <option value="false">Off duty</option>
              </select>
            </div>
          )}
          {(type === "financial" || type === "appointments") && (
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-primary"
              >
                <option value="">All</option>
                {type === "financial" ? (
                  <>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="refunded">Refunded</option>
                  </>
                ) : (
                  <>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </>
                )}
              </select>
            </div>
          )}
          {type === "patients" && (
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                Risk band
              </label>
              <select
                value={risk}
                onChange={(e) => setRisk(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-primary"
              >
                <option value="">All</option>
                <option value="green">Low</option>
                <option value="gray">Mild</option>
                <option value="orange">Moderate</option>
                <option value="red">High</option>
              </select>
            </div>
          )}
        </div>
      </Card>

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
          icon={<BiFile size={32} />}
          actionLabel="Retry"
          onAction={() => void load()}
        />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <KPICard
              label="Doctors"
              value={data.kpi.doctorCount}
              icon={<BiGroup size={20} />}
              color="primary"
            />
            <KPICard
              label="Patients"
              value={data.kpi.patientCount}
              icon={<BiUser size={20} />}
              color="slate"
            />
            <KPICard
              label="Appointments"
              value={data.kpi.appointmentCount}
              icon={<BiCalendar size={20} />}
              color="emerald"
            />
            <KPICard
              label="Period revenue"
              value={`R ${(data.kpi.revenuePeriod || 0).toLocaleString("en-ZA")}`}
              icon={<BiDollarCircle size={20} />}
              color="emerald"
            />
            <KPICard
              label="Pending"
              value={`R ${(data.kpi.revenuePending || 0).toLocaleString("en-ZA")}`}
              icon={<BiDollarCircle size={20} />}
              color="slate"
            />
            <KPICard
              label="High risk"
              value={data.kpi.highRiskPatients}
              icon={<BiBulb size={20} />}
              color="primary"
            />
          </div>

          {/* Intelligence */}
          {data.intelligence?.length > 0 && (
            <Card className="!rounded-lg">
              <SectionHeader
                compact
                icon={<BiBulb />}
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

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="!rounded-lg min-h-[260px] flex flex-col">
              <SectionHeader
                compact
                icon={<BiBarChartAlt2 />}
                title="Monthly volume"
                className="mb-3"
              />
              <div className="flex-1 min-h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts?.monthlyData || []}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="month"
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
                    <Bar
                      dataKey="consultations"
                      name="Booked"
                      fill="#4493b8"
                      radius={[4, 4, 0, 0]}
                      barSize={14}
                    />
                    <Bar
                      dataKey="completed"
                      name="Done"
                      fill="#36B37E"
                      radius={[4, 4, 0, 0]}
                      barSize={14}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="!rounded-lg min-h-[260px] flex flex-col">
              <SectionHeader
                compact
                icon={<BiUser />}
                title="Patient risk"
                className="mb-3"
              />
              <div className="flex-1 min-h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.charts?.riskDist || []}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {(data.charts?.riskDist || []).map(
                        (e: any, i: number) => (
                          <Cell
                            key={i}
                            fill={e.color || CHART_COLORS[i % CHART_COLORS.length]}
                          />
                        ),
                      )}
                    </Pie>
                    <Tooltip contentStyle={tipStyle} />
                    <Legend
                      formatter={(v) => (
                        <span className="text-xs text-slate-600">{v}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="!rounded-lg min-h-[260px] flex flex-col">
              <SectionHeader
                compact
                icon={<BiGroup />}
                title="Staff roles"
                className="mb-3"
              />
              <div className="flex-1 min-h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={(data.charts?.staffByRole || []).map((r: any) => ({
                        name:
                          r.role.charAt(0).toUpperCase() + r.role.slice(1),
                        value: r.count,
                      }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                    >
                      {(data.charts?.staffByRole || []).map(
                        (_: any, i: number) => (
                          <Cell
                            key={i}
                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                          />
                        ),
                      )}
                    </Pie>
                    <Tooltip contentStyle={tipStyle} />
                    <Legend
                      formatter={(v) => (
                        <span className="text-xs text-slate-600">{v}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Data table */}
          <Card noPadding className="!rounded-lg !p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
              <SectionHeader
                compact
                icon={<BiSortAlt2 />}
                title={
                  REPORT_TYPES.find((r) => r.id === type)?.label || "Report data"
                }
                subtitle={`${tableRows.length} rows · sorted by ${sort} (${sortDir})`}
              />
              {loading && (
                <BiLoaderAlt className="animate-spin text-primary" size={18} />
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
