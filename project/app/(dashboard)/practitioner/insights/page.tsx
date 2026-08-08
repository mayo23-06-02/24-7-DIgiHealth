"use client";

import React, { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import KPICard from "@/components/ui/KPICard";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
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
  BiShield,
  BiVideo,
  BiNote,
  BiStar,
  BiTime,
  BiMap,
  BiBulb,
  BiErrorCircle,
  BiCheckCircle,
  BiInfoCircle,
  BiCapsule,
} from "react-icons/bi";
import { toast } from "react-hot-toast";

const CHART_COLORS = [
  "#4493b8",
  "#00A3BF",
  "#6554C0",
  "#FF5630",
  "#36B37E",
  "#FFAB00",
  "#FF8B00",
  "#0065FF",
];

const RISK_BAND_COLORS: Record<string, string> = {
  green: "#16a34a",
  gray: "#6b7280",
  orange: "#ea580c",
  red: "#dc2626",
};

const SEV_STYLES: Record<
  string,
  { border: string; bg: string; icon: React.ReactNode }
> = {
  critical: {
    border: "border-red-200",
    bg: "bg-red-50",
    icon: <BiErrorCircle className="text-red-600" size={18} />,
  },
  warning: {
    border: "border-orange-200",
    bg: "bg-orange-50",
    icon: <BiErrorCircle className="text-orange-600" size={18} />,
  },
  success: {
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    icon: <BiCheckCircle className="text-emerald-600" size={18} />,
  },
  info: {
    border: "border-sky-200",
    bg: "bg-sky-50",
    icon: <BiInfoCircle className="text-primary" size={18} />,
  },
};

const tooltipStyle = {
  borderRadius: "8px",
  border: "none",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
};

export default function ClinicalInsightsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/practitioner/insights?days=${days}`);
        const json = await res.json();
        if (json.success) setData(json.data);
        else toast.error(json.error || "Failed to load insights");
      } catch (e) {
        console.error(e);
        toast.error("Failed to load insights");
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [days]);

  const exportPdf = async () => {
    if (exporting) return;
    setExporting(true);
    toast.loading("Generating insights PDF…", { id: "insights-pdf" });
    try {
      const res = await fetch(
        `/api/practitioner/insights/export?days=${days}`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Export failed");
      }
      const blob = await res.blob();
      if (blob.type?.includes("application/json")) {
        throw new Error("Server returned an error instead of a PDF");
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const cd = res.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="?([^"]+)"?/);
      a.href = url;
      a.download =
        match?.[1] ||
        `Clinical_Insights_${days}d_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Insights PDF downloaded", { id: "insights-pdf" });
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : "Failed to export PDF",
        { id: "insights-pdf" },
      );
    } finally {
      setExporting(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <BiLoaderAlt className="animate-spin text-primary text-4xl" />
      </div>
    );

  const p = data?.practitioner;
  const k = data?.kpis;

  return (
    <div className="w-full pb-10 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 font-grotesk">
            Clinical Insights
          </h1>
          <p className="text-sm text-slate-500">
            Teleclinic analytics, population risk, and actionable intelligence
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                  days === d
                    ? "bg-white text-primary "
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportPdf}
            disabled={exporting || !data}
            icon={
              exporting ? (
                <BiLoaderAlt size={16} className="animate-spin" />
              ) : (
                <BiDownload size={16} />
              )
            }
            iconPosition="left"
            className="!rounded-lg !max-w-none normal-case"
          >
            {exporting ? "Exporting…" : "Export PDF"}
          </Button>
        </div>
      </div>

      {data && (
        <>
          {/* Practitioner / teleclinic identity */}
          <Card className="p-5 md:p-6">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Your teleclinic
                </p>
                <h2 className="text-xl font-bold text-slate-800 font-grotesk mt-1">
                  {p?.name || "Practitioner"}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {p?.specialisation || "General Practitioner"}
                  {p?.hpcsaNumber && p.hpcsaNumber !== "—"
                    ? ` · HPCSA ${p.hpcsaNumber}`
                    : ""}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {(p?.city || p?.province) && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                      <BiMap size={12} />
                      {[p.city, p.province].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {p?.experienceYears != null && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                      <BiTime size={12} />
                      {p.experienceYears} yrs experience
                    </span>
                  )}
                  {k?.rating > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-700">
                      <BiStar size={12} />
                      {k.rating}/5 · {k.reviewCount} reviews
                    </span>
                  )}
                  {p?.isOnline && (
                    <Badge label="Online now" status="success" size="sm" />
                  )}
                </div>
                {(p?.languages?.length > 0 ||
                  p?.acceptedMedicalAids?.length > 0) && (
                  <div className="mt-3 space-y-1 text-xs text-slate-500">
                    {p.languages?.length > 0 && (
                      <p>
                        <span className="font-semibold text-slate-600">
                          Languages:
                        </span>{" "}
                        {p.languages.join(", ")}
                      </p>
                    )}
                    {p.acceptedMedicalAids?.length > 0 && (
                      <p>
                        <span className="font-semibold text-slate-600">
                          Medical aids:
                        </span>{" "}
                        {p.acceptedMedicalAids.slice(0, 6).join(", ")}
                        {p.acceptedMedicalAids.length > 6
                          ? ` +${p.acceptedMedicalAids.length - 6}`
                          : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3 w-full lg:w-auto lg:min-w-[280px]">
                {[
                  {
                    label: "Video",
                    value: `${data.teleclinic?.videoPercent ?? 0}%`,
                    color: "text-primary",
                  },
                  {
                    label: "Chat",
                    value: `${data.teleclinic?.chatPercent ?? 0}%`,
                    color: "text-sky-600",
                  },
                  {
                    label: "In person",
                    value: `${data.teleclinic?.inPersonPercent ?? 0}%`,
                    color: "text-violet-600",
                  },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-3 text-center"
                  >
                    <p className={`text-lg font-bold tabular-nums ${m.color}`}>
                      {m.value}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      {m.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            <KPICard
              label="Patients under care"
              value={k?.totalPatients ?? 0}
              icon={<BiUser size={22} />}
              color="primary"
            />
            <KPICard
              label={`Consults (${days}d)`}
              value={k?.periodConsults ?? 0}
              icon={<BiPulse size={22} />}
              color="emerald"
              description={`${k?.totalConsults ?? 0} all-time`}
            />
            <KPICard
              label="Adherence"
              value={`${k?.adherencePercent ?? 0}%`}
              icon={<BiCalendarCheck size={22} />}
              color="slate"
              description="Completed vs booked"
            />
            <KPICard
              label="Avg risk score"
              value={k?.avgRiskScore ?? 0}
              icon={<BiShield size={22} />}
              color="primary"
              description={`${k?.highRiskPatients ?? 0} high-risk`}
            />
            <KPICard
              label="SOAP completion"
              value={`${k?.soapCompletionPercent ?? 0}%`}
              icon={<BiNote size={22} />}
              color="slate"
              description="On completed visits"
            />
            <KPICard
              label="Avg call length"
              value={`${k?.avgCallMinutes ?? 0}m`}
              icon={<BiVideo size={22} />}
              color="emerald"
              description={`${data.teleclinic?.totalCallMinutes ?? 0} min total`}
            />
            <KPICard
              label="Prescriptions"
              value={k?.prescriptionsIssued ?? 0}
              icon={<BiCapsule size={22} />}
              color="primary"
              description={`Last ${days} days`}
            />
            <KPICard
              label="No-show / cancel"
              value={`${k?.noShowPercent ?? 0}%`}
              icon={<BiTime size={22} />}
              color="slate"
              description="Of period bookings"
            />
          </div>

          {/* Intelligence */}
          {data.intelligence?.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <BiBulb size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 font-grotesk">
                    Clinical intelligence
                  </h3>
                  <p className="text-xs text-slate-500">
                    Prioritised recommendations from your roster and teleclinic
                    activity
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.intelligence.map((item: any) => {
                  const sev = SEV_STYLES[item.severity] || SEV_STYLES.info;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-lg border p-3.5 ${sev.border} ${sev.bg}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 shrink-0">{sev.icon}</span>
                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-bold text-slate-800">
                              {item.title}
                            </p>
                            {item.metric && (
                              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-white/70 px-2 py-1 rounded-full">
                                {item.metric}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {item.detail}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Distribution */}
            <Card className="flex flex-col min-h-[320px] p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-800 font-grotesk">
                    Risk score distribution
                  </h3>
                  <p className="text-xs text-slate-500">
                    Full roster by latest clinical risk band
                  </p>
                </div>
                <span className="shrink-0 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full tabular-nums">
                  {data.totalPatientsInRiskDist ?? data.totalPatients ?? 0}{" "}
                  patients
                </span>
              </div>
              <div className="flex-1 min-h-[220px]">
                {!data.totalPatients ? (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">
                    No patients in your roster yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.riskDist}
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={92}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="label"
                      >
                        {data.riskDist.map((entry: any, idx: number) => (
                          <Cell
                            key={`${entry.name}-${idx}`}
                            fill={
                              entry.color ||
                              RISK_BAND_COLORS[entry.name] ||
                              CHART_COLORS[idx % CHART_COLORS.length]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, _n, item) => [
                          `${value} (${(item as any)?.payload?.percent ?? 0}%)`,
                          (item as any)?.payload?.label || "Risk",
                        ]}
                        contentStyle={tooltipStyle}
                      />
                      <Legend
                        formatter={(_v, entry: any) => {
                          const label =
                            entry?.payload?.label || entry?.payload?.name;
                          const n = entry?.payload?.value;
                          return (
                            <span className="text-xs text-slate-600">
                              {label}
                              {typeof n === "number" ? ` (${n})` : ""}
                            </span>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            {/* Consultation Volume */}
            <Card className="flex flex-col min-h-[320px] p-5">
              <div className="mb-4">
                <h3 className="font-bold text-slate-800 font-grotesk">
                  Consultation volume
                </h3>
                <p className="text-xs text-slate-500">
                  Daily bookings over the last {days} days
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
                      tickFormatter={(v) =>
                        typeof v === "string" ? v.slice(5) : v
                      }
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="Consults"
                      stroke="#4493b8"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4, fill: "#4493b8" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Channel mix */}
            <Card className="flex flex-col min-h-[300px] p-5">
              <div className="mb-4">
                <h3 className="font-bold text-slate-800 font-grotesk">
                  Channel mix
                </h3>
                <p className="text-xs text-slate-500">
                  Video · chat · in-person in period
                </p>
              </div>
              <div className="flex-1 min-h-[200px]">
                {data.typeMix?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.typeMix}
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) =>
                          `${name} ${Math.round((percent || 0) * 100)}%`
                        }
                      >
                        {data.typeMix.map((entry: any, idx: number) => (
                          <Cell
                            key={idx}
                            fill={
                              entry.color ||
                              CHART_COLORS[idx % CHART_COLORS.length]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">
                    No consultations in this period
                  </div>
                )}
              </div>
            </Card>

            {/* Peak days */}
            <Card className="flex flex-col min-h-[300px] p-5">
              <div className="mb-4">
                <h3 className="font-bold text-slate-800 font-grotesk">
                  Demand by weekday
                </h3>
                <p className="text-xs text-slate-500">
                  When your teleclinic is busiest
                </p>
              </div>
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.peakDays || []}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar
                      dataKey="count"
                      name="Consults"
                      fill="#53CBF3"
                      radius={[6, 6, 0, 0]}
                      barSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Peak hours */}
            <Card className="flex flex-col min-h-[300px] p-5">
              <div className="mb-4">
                <h3 className="font-bold text-slate-800 font-grotesk">
                  Peak hours
                </h3>
                <p className="text-xs text-slate-500">
                  Hourly consultation demand (06:00–21:00)
                </p>
              </div>
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.peakHours || []}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 9, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      interval={1}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar
                      dataKey="count"
                      name="Consults"
                      fill="#6554C0"
                      radius={[4, 4, 0, 0]}
                      barSize={12}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Gender */}
            <Card className="flex flex-col min-h-[300px] p-5">
              <div className="mb-4">
                <h3 className="font-bold text-slate-800 font-grotesk">
                  Patient gender
                </h3>
                <p className="text-xs text-slate-500">Roster demographics</p>
              </div>
              <div className="flex-1 min-h-[200px]">
                {data.genderDist?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.genderDist}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        dataKey="value"
                        nameKey="name"
                        paddingAngle={2}
                      >
                        {data.genderDist.map((entry: any, idx: number) => (
                          <Cell
                            key={idx}
                            fill={
                              entry.color ||
                              CHART_COLORS[idx % CHART_COLORS.length]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend
                        formatter={(v) => (
                          <span className="text-xs text-slate-600">{v}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">
                    No demographic data
                  </div>
                )}
              </div>
            </Card>

            {/* Age bands */}
            <Card className="flex flex-col min-h-[300px] p-5">
              <div className="mb-4">
                <h3 className="font-bold text-slate-800 font-grotesk">
                  Age bands
                </h3>
                <p className="text-xs text-slate-500">
                  Age distribution of patients under care
                </p>
              </div>
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.ageBands || []}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar
                      dataKey="value"
                      name="Patients"
                      fill="#4493b8"
                      radius={[6, 6, 0, 0]}
                      barSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Chronic conditions */}
            <Card className="flex flex-col min-h-[300px] p-5">
              <div className="mb-4">
                <h3 className="font-bold text-slate-800 font-grotesk">
                  Chronic condition prevalence
                </h3>
                <p className="text-xs text-slate-500">
                  Conditions across your patient population
                </p>
              </div>
              <div className="flex-1 min-h-[220px]">
                {data.conditions?.length ? (
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
                        allowDecimals={false}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={110}
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" name="Patients" radius={[0, 4, 4, 0]} barSize={14}>
                        {data.conditions.map((_: any, idx: number) => (
                          <Cell
                            key={idx}
                            fill={CHART_COLORS[idx % CHART_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">
                    No chronic conditions recorded yet
                  </div>
                )}
              </div>
            </Card>

            {/* Top reasons */}
            <Card className="flex flex-col min-h-[300px] p-5">
              <div className="mb-4">
                <h3 className="font-bold text-slate-800 font-grotesk">
                  Top consultation reasons
                </h3>
                <p className="text-xs text-slate-500">
                  Most common chief complaints
                </p>
              </div>
              <div className="flex-1 min-h-[220px]">
                {data.topReasons?.length ? (
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
                        allowDecimals={false}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={120}
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar
                        dataKey="count"
                        name="Count"
                        fill="#6554C0"
                        radius={[0, 4, 4, 0]}
                        barSize={14}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">
                    No chief complaints recorded yet
                  </div>
                )}
              </div>
            </Card>

            {/* Status breakdown */}
            <Card className="flex flex-col min-h-[300px] p-5 lg:col-span-2">
              <div className="mb-4">
                <h3 className="font-bold text-slate-800 font-grotesk">
                  Consultation status (all time)
                </h3>
                <p className="text-xs text-slate-500">
                  Pipeline health across your teleclinic
                </p>
              </div>
              <div className="flex-1 min-h-[200px]">
                {data.statusBreakdown?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.statusBreakdown}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar
                        dataKey="value"
                        name="Count"
                        fill="#4493b8"
                        radius={[6, 6, 0, 0]}
                        barSize={36}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">
                    No consultation history
                  </div>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
