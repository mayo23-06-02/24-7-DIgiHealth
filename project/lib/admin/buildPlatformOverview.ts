/**
 * Cross-tenant platform overview for super/mega admin.
 */
import User from "@/lib/models/User";
import Facility from "@/lib/models/Facility";
import { Consultation } from "@/lib/models/Consultation";
import { PaymentTransaction, PayoutRequest } from "@/lib/models/Billing";
import HospitalAppointment from "@/lib/models/HospitalAppointment";
import HospitalTransaction from "@/lib/models/HospitalTransaction";
import Staff from "@/lib/models/Staff";
import RiskScore from "@/lib/models/RiskScore";
import { SystemConfig } from "@/lib/models/System";
import { riskBandFromScore } from "@/lib/riskScore";
import { isSupabaseConfigured } from "@/lib/supabase/media";

export interface PlatformOverviewData {
  generatedAt: string;
  kpi: {
    totalUsers: number;
    patients: number;
    practitioners: number;
    hospitalAdmins: number;
    facilities: number;
    facilitiesOpen: number;
    consultsToday: number;
    consults30d: number;
    completed30d: number;
    uniquePatients30d: number;
    revenue30d: number;
    platformFees30d: number;
    pendingPayouts: number;
    pendingPayoutAmount: number;
    highRiskPatients: number;
    staffOnDuty: number;
    mfaPractitioners: number;
    activeUsers: number;
    suspendedUsers: number;
  };
  usersByRole: { role: string; count: number }[];
  consultTrend: { date: string; count: number; completed: number }[];
  signupTrend: { date: string; count: number }[];
  revenueTrend: { date: string; amount: number }[];
  facilitiesByType: { name: string; value: number }[];
  recentUsers: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
  }[];
  recentFacilities: {
    id: string;
    name: string;
    type: string;
    city?: string;
    isOpen: boolean;
  }[];
  pendingPayoutsList: {
    id: string;
    amount: number;
    status: string;
    practitionerId?: string;
    requestedAt: string;
  }[];
  intelligence: {
    id: string;
    severity: "info" | "success" | "warning" | "critical";
    title: string;
    detail: string;
    metric?: string;
  }[];
  system: {
    maintenanceMode: boolean;
    supabaseConfigured: boolean;
    popiaVersion?: string;
  };
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function buildPlatformOverview(
  days = 30,
): Promise<PlatformOverviewData> {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const since = new Date(now);
  since.setDate(since.getDate() - days);

  const [
    roleAgg,
    statusAgg,
    facilities,
    consultsToday,
    consults30d,
    completed30d,
    uniquePatients30d,
    payAgg,
    pendingPayouts,
    staffOnDuty,
    mfaPractitioners,
    recentUsers,
    riskScores,
    systemConfig,
  ] = await Promise.all([
    User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
    User.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Facility.find().select("name facilityType address isOpen").lean(),
    Consultation.countDocuments({ scheduledStartTime: { $gte: today } }),
    Consultation.countDocuments({ scheduledStartTime: { $gte: since } }),
    Consultation.countDocuments({
      scheduledStartTime: { $gte: since },
      status: "completed",
    }),
    Consultation.distinct("patientId", {
      scheduledStartTime: { $gte: since },
    }).then((ids) => ids.length),
    PaymentTransaction.aggregate([
      {
        $match: {
          status: "completed",
          timestamp: { $gte: since },
        },
      },
      {
        $group: {
          _id: null,
          amount: { $sum: "$amount" },
          fees: { $sum: { $ifNull: ["$platformFeeAmount", 0] } },
        },
      },
    ]),
    PayoutRequest.find({ status: "pending" })
      .sort({ requestedAt: -1 })
      .limit(20)
      .lean(),
    Staff.countDocuments({ isOnDuty: true }),
    User.countDocuments({ role: "practitioner", mfaEnabled: true }),
    User.find()
      .sort({ createdAt: -1 })
      .limit(12)
      .select("firstName lastName email role status createdAt")
      .lean(),
    RiskScore.aggregate([
      { $sort: { calculatedAt: -1 } },
      { $group: { _id: "$patientId", score: { $first: "$score" } } },
      { $limit: 5000 },
    ]),
    SystemConfig.findById("singleton").lean().catch(() => null),
  ]);

  // Hospital revenue in period (optional boost)
  let hospitalRevenue = 0;
  try {
    const htx = await HospitalTransaction.aggregate([
      {
        $match: {
          status: "paid",
          timestamp: { $gte: since },
        },
      },
      { $group: { _id: null, amount: { $sum: "$amount" } } },
    ]);
    hospitalRevenue = htx[0]?.amount || 0;
  } catch {
    /* */
  }

  const roleMap: Record<string, number> = {};
  for (const r of roleAgg) roleMap[r._id || "unknown"] = r.count;
  const statusMap: Record<string, number> = {};
  for (const s of statusAgg) statusMap[s._id || "active"] = s.count;

  const totalUsers = Object.values(roleMap).reduce((a, b) => a + b, 0);
  const revenue30d = (payAgg[0]?.amount || 0) + hospitalRevenue;
  const platformFees30d = payAgg[0]?.fees || 0;
  const pendingPayoutAmount = pendingPayouts.reduce(
    (s: number, p: any) => s + (p.amount || 0),
    0,
  );

  let highRiskPatients = 0;
  for (const r of riskScores) {
    if (riskBandFromScore(r.score ?? 0) === "red") highRiskPatients += 1;
  }

  // Trends
  const consultTrendMap: Record<string, { count: number; completed: number }> =
    {};
  const signupTrendMap: Record<string, number> = {};
  const revenueTrendMap: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    consultTrendMap[k] = { count: 0, completed: 0 };
    signupTrendMap[k] = 0;
    revenueTrendMap[k] = 0;
  }

  const [recentConsults, recentSignups, recentPays] = await Promise.all([
    Consultation.find({ scheduledStartTime: { $gte: since } })
      .select("scheduledStartTime status")
      .lean(),
    User.find({ createdAt: { $gte: since } })
      .select("createdAt")
      .lean(),
    PaymentTransaction.find({
      status: "completed",
      timestamp: { $gte: since },
    })
      .select("timestamp amount")
      .lean(),
  ]);

  for (const c of recentConsults as any[]) {
    const k = dayKey(new Date(c.scheduledStartTime));
    if (!consultTrendMap[k]) continue;
    consultTrendMap[k].count += 1;
    if (c.status === "completed") consultTrendMap[k].completed += 1;
  }
  for (const u of recentSignups as any[]) {
    const k = dayKey(new Date(u.createdAt));
    if (k in signupTrendMap) signupTrendMap[k] += 1;
  }
  for (const p of recentPays as any[]) {
    const k = dayKey(new Date(p.timestamp));
    if (k in revenueTrendMap) revenueTrendMap[k] += p.amount || 0;
  }

  const typeMap: Record<string, number> = {};
  for (const f of facilities as any[]) {
    const t = f.facilityType || "Unknown";
    typeMap[t] = (typeMap[t] || 0) + 1;
  }

  // Intelligence
  const intelligence: PlatformOverviewData["intelligence"] = [];
  const cfg = systemConfig as any;
  if (cfg?.maintenanceMode) {
    intelligence.push({
      id: "maintenance",
      severity: "critical",
      title: "Maintenance mode is ON",
      detail:
        "The platform may restrict user access. Turn off in System Settings when ready.",
      metric: "LIVE",
    });
  }
  if (!isSupabaseConfigured()) {
    intelligence.push({
      id: "supabase",
      severity: "warning",
      title: "Media storage not configured",
      detail:
        "Supabase media env vars are missing — document and avatar uploads will fail.",
      metric: "storage",
    });
  }
  if (pendingPayouts.length >= 5) {
    intelligence.push({
      id: "payouts",
      severity: "warning",
      title: "Payout backlog",
      detail: `${pendingPayouts.length} payout requests pending (R ${pendingPayoutAmount.toLocaleString("en-ZA")}).`,
      metric: `${pendingPayouts.length} pending`,
    });
  }
  const cancelRate =
    consults30d > 0
      ? Math.round(
          ((await Consultation.countDocuments({
            scheduledStartTime: { $gte: since },
            status: "cancelled",
          })) /
            consults30d) *
            100,
        )
      : 0;
  if (cancelRate >= 20 && consults30d >= 20) {
    intelligence.push({
      id: "cancellations",
      severity: "warning",
      title: "Elevated cancellation rate",
      detail: `${cancelRate}% of consultations in the last ${days} days were cancelled.`,
      metric: `${cancelRate}%`,
    });
  }
  if (highRiskPatients > 0) {
    intelligence.push({
      id: "risk",
      severity: highRiskPatients >= 20 ? "critical" : "info",
      title: "High-risk patients on platform",
      detail: `${highRiskPatients} patients have latest risk scores in the high band (76–100).`,
      metric: String(highRiskPatients),
    });
  }
  const pracTotal = roleMap.practitioner || 0;
  if (pracTotal > 0 && mfaPractitioners / pracTotal < 0.5) {
    intelligence.push({
      id: "mfa",
      severity: "info",
      title: "Practitioner MFA adoption",
      detail: `Only ${mfaPractitioners}/${pracTotal} practitioners have MFA enabled.`,
      metric: `${Math.round((mfaPractitioners / pracTotal) * 100)}%`,
    });
  }
  if (facilities.filter((f: any) => f.isOpen !== false).length === 0 && facilities.length) {
    intelligence.push({
      id: "facilities-closed",
      severity: "warning",
      title: "No open facilities",
      detail: "All facilities are marked closed. Check facility status flags.",
    });
  }
  if (!intelligence.length) {
    intelligence.push({
      id: "ok",
      severity: "success",
      title: "Platform operating normally",
      detail: "No critical operational alerts from current aggregates.",
    });
  }

  return {
    generatedAt: now.toISOString(),
    kpi: {
      totalUsers,
      patients: roleMap.patient || 0,
      practitioners: roleMap.practitioner || 0,
      hospitalAdmins: roleMap.hospital_admin || 0,
      facilities: facilities.length,
      facilitiesOpen: facilities.filter((f: any) => f.isOpen !== false).length,
      consultsToday,
      consults30d,
      completed30d,
      uniquePatients30d,
      revenue30d: Math.round(revenue30d),
      platformFees30d: Math.round(platformFees30d),
      pendingPayouts: pendingPayouts.length,
      pendingPayoutAmount: Math.round(pendingPayoutAmount),
      highRiskPatients,
      staffOnDuty,
      mfaPractitioners,
      activeUsers: statusMap.active || 0,
      suspendedUsers: statusMap.suspended || 0,
    },
    usersByRole: Object.entries(roleMap).map(([role, count]) => ({
      role,
      count,
    })),
    consultTrend: Object.entries(consultTrendMap).map(([date, v]) => ({
      date,
      count: v.count,
      completed: v.completed,
    })),
    signupTrend: Object.entries(signupTrendMap).map(([date, count]) => ({
      date,
      count,
    })),
    revenueTrend: Object.entries(revenueTrendMap).map(([date, amount]) => ({
      date,
      amount: Math.round(amount),
    })),
    facilitiesByType: Object.entries(typeMap).map(([name, value]) => ({
      name,
      value,
    })),
    recentUsers: (recentUsers as any[]).map((u) => ({
      id: u._id.toString(),
      name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
      email: u.email,
      role: u.role,
      status: u.status || "active",
      createdAt: u.createdAt?.toISOString?.() || String(u.createdAt),
    })),
    recentFacilities: (facilities as any[]).slice(0, 10).map((f) => ({
      id: f._id.toString(),
      name: f.name,
      type: f.facilityType || "—",
      city: f.address?.city,
      isOpen: f.isOpen !== false,
    })),
    pendingPayoutsList: (pendingPayouts as any[]).map((p) => ({
      id: p._id.toString(),
      amount: p.amount || 0,
      status: p.status,
      practitionerId: p.practitionerId?.toString(),
      requestedAt:
        p.requestedAt?.toISOString?.() ||
        p.createdAt?.toISOString?.() ||
        new Date().toISOString(),
    })),
    intelligence: intelligence.slice(0, 10),
    system: {
      maintenanceMode: !!cfg?.maintenanceMode,
      supabaseConfigured: isSupabaseConfigured(),
      popiaVersion: cfg?.popiaVersion,
    },
  };
}
