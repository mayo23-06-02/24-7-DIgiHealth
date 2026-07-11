import User from "@/lib/models/User";
import Facility from "@/lib/models/Facility";
import { Consultation } from "@/lib/models/Consultation";
import { PaymentTransaction, PayoutRequest } from "@/lib/models/Billing";
import AuditLog from "@/lib/models/AuditLog";
import { buildPlatformOverview } from "./buildPlatformOverview";

export type AdminReportType =
  | "overview"
  | "users"
  | "facilities"
  | "consultations"
  | "finance"
  | "audit";

export interface AdminReportFilters {
  type: AdminReportType;
  from?: string;
  to?: string;
  search?: string;
  sort?: string;
  sortDir?: "asc" | "desc";
  role?: string;
  status?: string;
}

function range(from?: string, to?: string) {
  const start = from ? new Date(from) : null;
  if (start) start.setHours(0, 0, 0, 0);
  const end = to ? new Date(to) : null;
  if (end) end.setHours(23, 59, 59, 999);
  return { start, end };
}

function sortRows<T extends Record<string, any>>(
  rows: T[],
  sort?: string,
  sortDir: "asc" | "desc" = "desc",
) {
  if (!sort || !rows.length) return rows;
  const dir = sortDir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[sort];
    const bv = b[sort];
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "string") return dir * av.localeCompare(String(bv));
    return dir * (Number(av) - Number(bv));
  });
}

export async function buildAdminReport(filters: AdminReportFilters) {
  const { start, end } = range(filters.from, filters.to);
  const overview = await buildPlatformOverview(30);

  // Users
  const userQ: any = {};
  if (filters.role) userQ.role = filters.role;
  if (filters.status) userQ.status = filters.status;
  if (start || end) {
    userQ.createdAt = {};
    if (start) userQ.createdAt.$gte = start;
    if (end) userQ.createdAt.$lte = end;
  }
  let users = await User.find(userQ)
    .select("firstName lastName email role status mfaEnabled createdAt")
    .sort({ createdAt: -1 })
    .limit(2000)
    .lean();
  let userRows = users.map((u: any) => ({
    id: u._id.toString(),
    name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
    email: u.email,
    role: u.role,
    status: u.status || "active",
    mfa: !!u.mfaEnabled,
    createdAt: u.createdAt,
  }));
  if (filters.search) {
    const q = filters.search.toLowerCase();
    userRows = userRows.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.includes(q),
    );
  }
  userRows = sortRows(userRows, filters.sort || "createdAt", filters.sortDir || "desc");

  // Facilities
  let facilities = await Facility.find().lean();
  let facilityRows = (facilities as any[]).map((f) => ({
    id: f._id.toString(),
    name: f.name,
    type: f.facilityType || "—",
    city: f.address?.city || "",
    province: f.address?.province || "",
    isOpen: f.isOpen !== false,
    beds: f.bedCapacity?.total || 0,
    emergency: !!f.emergencyServices,
  }));
  if (filters.search) {
    const q = filters.search.toLowerCase();
    facilityRows = facilityRows.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.city.toLowerCase().includes(q) ||
        f.type.toLowerCase().includes(q),
    );
  }
  facilityRows = sortRows(facilityRows, filters.sort || "name", filters.sortDir || "asc");

  // Consultations
  const cQ: any = {};
  if (start || end) {
    cQ.scheduledStartTime = {};
    if (start) cQ.scheduledStartTime.$gte = start;
    if (end) cQ.scheduledStartTime.$lte = end;
  }
  if (filters.status) cQ.status = filters.status;
  let consults = await Consultation.find(cQ)
    .sort({ scheduledStartTime: -1 })
    .limit(2000)
    .lean();
  let consultRows = (consults as any[]).map((c) => ({
    id: c._id.toString(),
    scheduledStart: c.scheduledStartTime,
    status: c.status,
    type: c.type,
    patientId: c.patientId?.toString(),
    practitionerId: c.practitionerId?.toString(),
    complaint: c.chiefComplaint || "",
  }));
  consultRows = sortRows(
    consultRows,
    filters.sort || "scheduledStart",
    filters.sortDir || "desc",
  );

  // Finance
  const pQ: any = {};
  if (start || end) {
    pQ.timestamp = {};
    if (start) pQ.timestamp.$gte = start;
    if (end) pQ.timestamp.$lte = end;
  }
  if (filters.status) pQ.status = filters.status;
  let pays = await PaymentTransaction.find(pQ)
    .sort({ timestamp: -1 })
    .limit(2000)
    .lean();
  let financeRows = (pays as any[]).map((p) => ({
    id: p._id.toString(),
    date: p.timestamp,
    amount: p.amount || 0,
    fees: p.platformFeeAmount || 0,
    earnings: p.practitionerEarnings || 0,
    status: p.status,
    category: p.category || "",
    provider: p.provider || "",
  }));
  financeRows = sortRows(financeRows, filters.sort || "date", filters.sortDir || "desc");

  const payouts = await PayoutRequest.find()
    .sort({ requestedAt: -1 })
    .limit(200)
    .lean();
  const payoutRows = (payouts as any[]).map((p) => ({
    id: p._id.toString(),
    amount: p.amount || 0,
    status: p.status,
    requestedAt: p.requestedAt,
    practitionerId: p.practitionerId?.toString(),
  }));

  // Audit
  const aQ: any = {};
  if (start || end) {
    aQ.createdAt = {};
    if (start) aQ.createdAt.$gte = start;
    if (end) aQ.createdAt.$lte = end;
  }
  let audits = await AuditLog.find(aQ)
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();
  let auditRows = (audits as any[]).map((a) => ({
    id: a._id.toString(),
    action: a.action,
    actorRole: a.actorRole,
    actorEmail: a.actorEmail || "",
    targetType: a.targetType || "",
    targetId: a.targetId || "",
    createdAt: a.createdAt,
  }));
  if (filters.search) {
    const q = filters.search.toLowerCase();
    auditRows = auditRows.filter(
      (a) =>
        a.action.toLowerCase().includes(q) ||
        a.actorEmail.toLowerCase().includes(q),
    );
  }

  return {
    meta: {
      type: filters.type,
      generatedAt: new Date().toISOString(),
      from: filters.from || null,
      to: filters.to || null,
    },
    overview,
    kpi: overview.kpi,
    intelligence: overview.intelligence,
    charts: {
      consultTrend: overview.consultTrend,
      signupTrend: overview.signupTrend,
      revenueTrend: overview.revenueTrend,
      usersByRole: overview.usersByRole,
      facilitiesByType: overview.facilitiesByType,
    },
    tables: {
      users: userRows,
      facilities: facilityRows,
      consultations: consultRows,
      finance: financeRows,
      payouts: payoutRows,
      audit: auditRows,
    },
  };
}

export function adminReportToCsv(
  type: AdminReportType,
  tables: Awaited<ReturnType<typeof buildAdminReport>>["tables"],
): string {
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  let rows: Record<string, any>[] = [];
  switch (type) {
    case "users":
      rows = tables.users;
      break;
    case "facilities":
      rows = tables.facilities;
      break;
    case "consultations":
      rows = tables.consultations;
      break;
    case "finance":
      rows = tables.finance;
      break;
    case "audit":
      rows = tables.audit;
      break;
    default:
      rows = tables.users;
  }
  if (!rows.length) return "No data\n";
  const headers = Object.keys(rows[0]);
  return [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const v = r[h];
          if (v instanceof Date) return esc(v.toISOString());
          return esc(v);
        })
        .join(","),
    ),
  ].join("\n");
}
