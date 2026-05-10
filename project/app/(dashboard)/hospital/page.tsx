"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  BiGroup,
  BiDollarCircle,
  BiStar,
  BiCheckShield,
  BiLoaderAlt,
  BiUserPlus,
  BiBarChartAlt2,
  BiCalendar,
  BiChevronRight,
  BiTrendingUp,
} from "react-icons/bi";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DashboardStats {
  totalStaff: number;
  staffOnDuty: number;
  revenueMonth: number;
  pendingPayouts: number;
  avgRating: number;
  totalReviews: number;
  slaCompliance: number;
  avgResponseMin: number;
  consultationsToday: number;
}

interface MonthlyPoint {
  month: string;
  consultations: number;
  revenue: number;
  satisfaction: number;
}

interface Review {
  _id: string;
  patientName: string;
  department: string;
  rating: number;
  comment: string;
  createdAt: string;
}

// ─── Mock fallbacks ───────────────────────────────────────────────────────────
const MOCK_STATS: DashboardStats = {
  totalStaff: 48,
  staffOnDuty: 31,
  revenueMonth: 284500,
  pendingPayouts: 12300,
  avgRating: 4.6,
  totalReviews: 214,
  slaCompliance: 88,
  avgResponseMin: 11.4,
  consultationsToday: 37,
};

const MOCK_MONTHLY: MonthlyPoint[] = [
  { month: "Nov", consultations: 312, revenue: 198000, satisfaction: 4.1 },
  { month: "Dec", consultations: 289, revenue: 184000, satisfaction: 4.3 },
  { month: "Jan", consultations: 401, revenue: 241000, satisfaction: 4.2 },
  { month: "Feb", consultations: 378, revenue: 226000, satisfaction: 4.5 },
  { month: "Mar", consultations: 455, revenue: 273000, satisfaction: 4.6 },
  { month: "Apr", consultations: 432, revenue: 284500, satisfaction: 4.7 },
];

const MOCK_REVIEWS: Review[] = [
  {
    _id: "1",
    patientName: "Thabo Nkosi",
    department: "Cardiology",
    rating: 5,
    comment:
      "Exceptional care from the entire team. Fast, professional, and genuinely compassionate.",
    createdAt: "2026-04-28T09:14:00Z",
  },
  {
    _id: "2",
    patientName: "Lerato Dlamini",
    department: "General",
    rating: 4,
    comment:
      "Very good experience overall. The teleconsultation was seamless and the doctor was thorough.",
    createdAt: "2026-04-25T14:30:00Z",
  },
  {
    _id: "3",
    patientName: "James van der Berg",
    department: "Neurology",
    rating: 5,
    comment:
      "Outstanding service. Appointment booked in minutes, doctor was on time and very knowledgeable.",
    createdAt: "2026-04-22T11:00:00Z",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => `R ${n.toLocaleString("en-ZA")}`;
const Stars = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <svg
        key={i}
        className={`w-4 h-4 ${i <= Math.round(rating) ? "text-amber-400" : "text-slate-200"}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.286 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z" />
      </svg>
    ))}
  </div>
);

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPI({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col gap-4 hover:shadow-md hover:border-slate-200 transition-all duration-200">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">
          {label}
        </p>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}
        >
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 font-grotesk leading-none">
          {value}
        </p>
        <p className="text-xs text-slate-500 font-medium mt-1">{sub}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HospitalOverviewPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [monthly, setMonthly] = useState<MonthlyPoint[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, perfRes, revRes] = await Promise.all([
          fetch("/api/hospital/dashboard"),
          fetch("/api/hospital/performance"),
          fetch("/api/hospital/reviews"),
        ]);

        const dashJson = dashRes.ok ? await dashRes.json() : null;
        const perfJson = perfRes.ok ? await perfRes.json() : null;
        const revJson = revRes.ok ? await revRes.json() : null;

        const kpi = dashJson?.data?.kpi || {};
        setStats({
          totalStaff: kpi.totalStaff ?? MOCK_STATS.totalStaff,
          staffOnDuty: kpi.staffOnDuty ?? MOCK_STATS.staffOnDuty,
          revenueMonth: kpi.revenueToday ?? MOCK_STATS.revenueMonth,
          pendingPayouts: MOCK_STATS.pendingPayouts,
          avgRating: MOCK_STATS.avgRating,
          totalReviews: MOCK_STATS.totalReviews,
          slaCompliance: MOCK_STATS.slaCompliance,
          avgResponseMin: MOCK_STATS.avgResponseMin,
          consultationsToday:
            kpi.consultationsToday ?? MOCK_STATS.consultationsToday,
        });

        setMonthly(
          perfJson?.data?.consultationVolume?.length
            ? perfJson.data.consultationVolume.map((m: any, i: number) => ({
                ...m,
                revenue: MOCK_MONTHLY[i]?.revenue ?? 200000,
                satisfaction:
                  perfJson.data.satisfactionTrend?.[i]?.score ?? 4.5,
              }))
            : MOCK_MONTHLY,
        );

        const rawReviews = revJson?.data ?? [];
        setReviews(
          rawReviews.length
            ? rawReviews.slice(0, 4).map((r: any) => ({
                _id: r._id,
                patientName: r.patientName || "Patient",
                department: r.department || "General",
                rating: r.rating,
                comment: r.comment,
                createdAt: r.createdAt,
              }))
            : MOCK_REVIEWS,
        );
      } catch (e: any) {
        setError("Could not reach the server. Showing demo data.");
        setStats(MOCK_STATS);
        setMonthly(MOCK_MONTHLY);
        setReviews(MOCK_REVIEWS);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <BiLoaderAlt className="text-4xl text-[#0052CC] animate-spin" />
      </div>
    );

  const s = stats!;
  const slaOk = s.slaCompliance >= 85;

  return (
    <div className="w-full pb-16 flex flex-col gap-8">
      {/* Error Banner */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-700 font-medium flex items-center gap-2">
          ⚠️ {error}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-grotesk">
            Facility Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Live metrics and operational snapshot for today
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link href="/hospital_admin/staff">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all">
              <BiUserPlus size={18} /> Manage Staff
            </button>
          </Link>
          <Link href="/hospital_admin/reports">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0052CC] text-white text-sm font-bold hover:bg-[#0047B3] transition-all shadow-md shadow-blue-200">
              <BiBarChartAlt2 size={18} /> Performance Reports
            </button>
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPI
          icon={<BiGroup size={22} />}
          label="Total Staff"
          color="blue"
          value={s.totalStaff.toString()}
          sub={`${s.staffOnDuty} on duty now (${Math.round((s.staffOnDuty / s.totalStaff) * 100)}% active)`}
        />
        <KPI
          icon={<BiDollarCircle size={22} />}
          label="Monthly Revenue"
          color="emerald"
          value={fmt(s.revenueMonth)}
          sub={`${fmt(s.pendingPayouts)} pending payout`}
        />
        <KPI
          icon={<BiStar size={22} />}
          label="Patient Rating"
          color="amber"
          value={`${s.avgRating.toFixed(1)} / 5`}
          sub={`Based on ${s.totalReviews} verified reviews`}
        />
        <KPI
          icon={<BiCheckShield size={22} />}
          label="SLA Compliance"
          color="violet"
          value={`${s.slaCompliance}%`}
          sub={`Avg response: ${s.avgResponseMin} min (target ≤15)`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Bar Chart – Monthly Consultations */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-bold text-slate-800 font-grotesk">
                Monthly Consultations
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Last 6 months</p>
            </div>
            <span className="text-xs font-bold text-slate-500 border border-slate-100 px-3 py-1.5 rounded-lg">
              Today: {s.consultationsToday}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={monthly}
              barSize={28}
              margin={{ top: 4, right: 8, left: -12, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: "none",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  fontSize: 12,
                }}
                cursor={{ fill: "#f8fafc" }}
              />
              <Bar
                dataKey="consultations"
                name="Consultations"
                fill="#0052CC"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line Chart – Revenue & Satisfaction */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 p-6">
          <div className="mb-6">
            <h2 className="text-sm font-bold text-slate-800 font-grotesk">
              Revenue & Satisfaction
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Dual trend overview</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={monthly}
              margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[3.5, 5]}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}★`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: "none",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  fontSize: 12,
                }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 12 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                name="Revenue (R)"
                stroke="#0052CC"
                strokeWidth={3}
                dot={{ r: 4, fill: "#fff", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="satisfaction"
                name="Rating (★)"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{ r: 4, fill: "#fff", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row: Reviews + SLA + Quick Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Reviews */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 font-grotesk">
              Recent Patient Reviews
            </h2>
            <Link
              href="/hospital_admin/reviews"
              className="text-xs font-bold text-[#0052CC] hover:underline flex items-center gap-1"
            >
              View all <BiChevronRight size={16} />
            </Link>
          </div>

          <div className="space-y-4">
            {reviews.map((r) => (
              <div
                key={r._id}
                className="flex items-start gap-4 p-4 rounded-xl border border-slate-50 bg-slate-50/60 hover:bg-slate-100/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[#0052CC]/10 text-[#0052CC] flex items-center justify-center font-bold text-sm shrink-0">
                  {r.patientName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-slate-800">
                      {r.patientName}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                      {r.department}
                    </span>
                  </div>
                  <Stars rating={r.rating} />
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                    {r.comment}
                  </p>
                </div>
                <span className="text-[10px] text-slate-500 font-medium shrink-0 mt-1">
                  {new Date(r.createdAt).toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* SLA & Quick Actions */}
        <div className="flex flex-col gap-5">
          {/* SLA Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col gap-5">
            <h2 className="text-sm font-bold text-slate-800 font-grotesk">
              SLA Status
            </h2>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">
                  Response Time Target (≤15 min)
                </span>
                <span
                  className={`text-xs font-bold ${s.avgResponseMin <= 15 ? "text-emerald-600" : "text-rose-500"}`}
                >
                  {s.avgResponseMin} min
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${s.avgResponseMin <= 15 ? "bg-emerald-500" : "bg-rose-500"}`}
                  style={{
                    width: `${Math.min((s.avgResponseMin / 15) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">
                  Compliance Rate
                </span>
                <span
                  className={`text-xs font-bold ${slaOk ? "text-emerald-600" : "text-rose-500"}`}
                >
                  {s.slaCompliance}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${slaOk ? "bg-emerald-500" : "bg-rose-500"}`}
                  style={{ width: `${s.slaCompliance}%` }}
                />
              </div>
              <div className="flex items-center gap-2 mt-3">
                {slaOk ? (
                  <>
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">
                      ✓
                    </div>
                    <span className="text-xs font-bold text-emerald-600">
                      All SLA targets met
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center text-xs">
                      ✗
                    </div>
                    <span className="text-xs font-bold text-rose-500">
                      Below compliance threshold
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col gap-3">
            <h2 className="text-sm font-bold text-slate-800 font-grotesk">
              Quick Actions
            </h2>
            {[
              {
                href: "/hospital_admin/staff",
                icon: <BiUserPlus size={18} />,
                label: "Manage Staff",
                sub: "Directory & scheduling",
              },
              {
                href: "/hospital_admin/reports",
                icon: <BiBarChartAlt2 size={18} />,
                label: "Performance Reports",
                sub: "CSV export & analytics",
              },
              {
                href: "/hospital_admin/sla",
                icon: <BiCheckShield size={18} />,
                label: "SLA Monitor",
                sub: "Targets & compliance",
              },
              {
                href: "/hospital_admin/reviews",
                icon: <BiStar size={18} />,
                label: "Patient Reviews",
                sub: "Ratings & feedback",
              },
            ].map((a) => (
              <Link key={a.href} href={a.href}>
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group cursor-pointer">
                  <div className="w-9 h-9 rounded-lg bg-[#0052CC]/10 text-[#0052CC] flex items-center justify-center shrink-0 group-hover:bg-[#0052CC] group-hover:text-white transition-all">
                    {a.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800">
                      {a.label}
                    </p>
                    <p className="text-[10px] text-slate-500">{a.sub}</p>
                  </div>
                  <BiChevronRight
                    size={16}
                    className="text-slate-300 group-hover:text-[#0052CC] transition-colors"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
