/**
 * Hospital facility reports — facility, doctors, patients, financial, intelligence.
 */
import mongoose from "mongoose";
import Staff from "@/lib/models/Staff";
import HospitalAppointment from "@/lib/models/HospitalAppointment";
import HospitalTransaction from "@/lib/models/HospitalTransaction";
import Facility from "@/lib/models/Facility";
import User from "@/lib/models/User";
import { PractitionerProfile } from "@/lib/models/RoleProfiles";
import RiskScore from "@/lib/models/RiskScore";
import { riskBandFromScore, riskBandStyle } from "@/lib/riskScore";
import { buildHospitalOverview } from "./buildHospitalOverview";

export type ReportType =
  | "overview"
  | "facility"
  | "doctors"
  | "patients"
  | "financial"
  | "staff"
  | "appointments";

export interface ReportFilters {
  type: ReportType;
  from?: string;
  to?: string;
  search?: string;
  sort?: string;
  sortDir?: "asc" | "desc";
  department?: string;
  role?: string;
  status?: string;
  risk?: string;
  onDuty?: string;
}

function parseRange(from?: string, to?: string) {
  const start = from ? new Date(from) : null;
  if (start) start.setHours(0, 0, 0, 0);
  const end = to ? new Date(to) : null;
  if (end) end.setHours(23, 59, 59, 999);
  return { start, end };
}

function inRange(d: Date | string | null | undefined, start: Date | null, end: Date | null) {
  if (!d) return !start && !end;
  const t = new Date(d).getTime();
  if (start && t < start.getTime()) return false;
  if (end && t > end.getTime()) return false;
  return true;
}

function sortRows<T extends Record<string, any>>(
  rows: T[],
  sort?: string,
  sortDir: "asc" | "desc" = "desc",
): T[] {
  if (!sort || !rows.length) return rows;
  const dir = sortDir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    let av = a[sort];
    let bv = b[sort];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "string") return dir * av.localeCompare(String(bv));
    if (av instanceof Date || (typeof av === "string" && !isNaN(Date.parse(av)))) {
      return dir * (new Date(av).getTime() - new Date(bv).getTime());
    }
    return dir * (Number(av) - Number(bv));
  });
}

export async function buildHospitalReport(
  hospitalId: string,
  adminName: string,
  filters: ReportFilters,
) {
  const facilityOid = new mongoose.Types.ObjectId(hospitalId);
  const { start, end } = parseRange(filters.from, filters.to);
  const overview = await buildHospitalOverview(hospitalId, adminName);
  const facility = await Facility.findById(hospitalId).lean();

  // ── Financial ────────────────────────────────────────────────────────────
  const txQuery: any = { facilityId: facilityOid };
  if (start || end) {
    txQuery.timestamp = {};
    if (start) txQuery.timestamp.$gte = start;
    if (end) txQuery.timestamp.$lte = end;
  }
  if (filters.status) txQuery.status = filters.status;

  let transactions = await HospitalTransaction.find(txQuery)
    .populate("patientId", "firstName lastName email")
    .sort({ timestamp: -1 })
    .lean();

  let financialRows = transactions.map((t: any) => ({
    id: t._id.toString(),
    date: t.timestamp,
    patient: t.patientId
      ? `${t.patientId.firstName || ""} ${t.patientId.lastName || ""}`.trim()
      : "Unknown",
    type: t.type,
    amount: t.amount || 0,
    status: t.status,
    method: t.paymentMethod,
  }));

  if (filters.search) {
    const q = filters.search.toLowerCase();
    financialRows = financialRows.filter(
      (r) =>
        r.patient.toLowerCase().includes(q) ||
        r.type?.toLowerCase().includes(q) ||
        r.method?.toLowerCase().includes(q),
    );
  }
  financialRows = sortRows(
    financialRows,
    filters.sort || "date",
    filters.sortDir || "desc",
  );

  const revenuePaid = financialRows
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + r.amount, 0);
  const revenuePending = financialRows
    .filter((r) => r.status === "pending")
    .reduce((s, r) => s + r.amount, 0);

  // ── Staff / Doctors ──────────────────────────────────────────────────────
  let staffList = await Staff.find({ facilityId: facilityOid })
    .populate("userId", "firstName lastName email")
    .lean();

  if (filters.role) {
    staffList = staffList.filter((s: any) => s.role === filters.role);
  }
  if (filters.department) {
    staffList = staffList.filter(
      (s: any) =>
        (s.department || "").toLowerCase() ===
        filters.department!.toLowerCase(),
    );
  }
  if (filters.onDuty === "true") {
    staffList = staffList.filter((s: any) => s.isOnDuty);
  } else if (filters.onDuty === "false") {
    staffList = staffList.filter((s: any) => !s.isOnDuty);
  }

  const doctorUserIds = staffList
    .filter((s: any) => s.role === "doctor")
    .map((s: any) => (s.userId?._id || s.userId)?.toString())
    .filter(Boolean);

  const profiles = doctorUserIds.length
    ? await PractitionerProfile.find({
        userId: {
          $in: doctorUserIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
      }).lean()
    : [];
  const profileByUser = new Map(
    profiles.map((p: any) => [p.userId.toString(), p]),
  );

  const apptQuery: any = { facilityId: facilityOid };
  if (start || end) {
    apptQuery.scheduledStart = {};
    if (start) apptQuery.scheduledStart.$gte = start;
    if (end) apptQuery.scheduledStart.$lte = end;
  }
  const appointments = await HospitalAppointment.find(apptQuery)
    .populate("patientId", "firstName lastName email")
    .populate("practitionerId", "firstName lastName")
    .sort({ scheduledStart: -1 })
    .lean();

  let doctorRows = staffList
    .filter((s: any) => s.role === "doctor")
    .map((s: any) => {
      const u = s.userId;
      const uid = (u?._id || u)?.toString();
      const prof = uid ? profileByUser.get(uid) : null;
      const load = appointments.filter(
        (a: any) => a.practitionerId?._id?.toString() === uid || a.practitionerId?.toString() === uid,
      ).length;
      const completed = appointments.filter(
        (a: any) =>
          (a.practitionerId?._id?.toString() === uid ||
            a.practitionerId?.toString() === uid) &&
          a.status === "completed",
      ).length;
      return {
        id: s._id.toString(),
        userId: uid,
        name: u
          ? `Dr. ${u.firstName || ""} ${u.lastName || ""}`.trim()
          : "Unassigned",
        email: u?.email || "",
        department: s.department || "General",
        specialisation: prof?.specialisation || s.department || "",
        isOnDuty: !!s.isOnDuty,
        rating: prof?.rating || 0,
        reviewCount: prof?.reviewCount || 0,
        appointments: load,
        completed,
        hourlyRate: s.hourlyRate || 0,
        qualifications: (s.qualifications || []).join("; "),
      };
    });

  if (filters.search) {
    const q = filters.search.toLowerCase();
    doctorRows = doctorRows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.specialisation.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q),
    );
  }
  doctorRows = sortRows(
    doctorRows,
    filters.sort || "appointments",
    filters.sortDir || "desc",
  );

  let staffRows = staffList.map((s: any) => {
    const u = s.userId;
    return {
      id: s._id.toString(),
      name: u
        ? `${u.firstName || ""} ${u.lastName || ""}`.trim()
        : "Staff member",
      email: u?.email || "",
      role: s.role,
      department: s.department || "General",
      isOnDuty: !!s.isOnDuty,
      shiftStart: s.shiftSchedule?.start || "",
      shiftEnd: s.shiftSchedule?.end || "",
      hourlyRate: s.hourlyRate || 0,
    };
  });
  if (filters.search) {
    const q = filters.search.toLowerCase();
    staffRows = staffRows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.role.includes(q) ||
        r.department.toLowerCase().includes(q),
    );
  }
  staffRows = sortRows(
    staffRows,
    filters.sort || "name",
    filters.sortDir || "asc",
  );

  // ── Patients ─────────────────────────────────────────────────────────────
  const patientMap = new Map<
    string,
    {
      id: string;
      name: string;
      email: string;
      visits: number;
      completed: number;
      cancelled: number;
      lastVisit: string | null;
      nextVisit: string | null;
      lastDoctor: string;
      riskScore: number;
      riskBand: string;
      riskLabel: string;
    }
  >();

  for (const a of appointments as any[]) {
    const pid = a.patientId?._id?.toString() || a.patientId?.toString();
    if (!pid) continue;
    const p = a.patientId;
    const name = p?.firstName
      ? `${p.firstName || ""} ${p.lastName || ""}`.trim()
      : "Patient";
    const email = p?.email || "";
    const existing = patientMap.get(pid) || {
      id: pid,
      name,
      email,
      visits: 0,
      completed: 0,
      cancelled: 0,
      lastVisit: null as string | null,
      nextVisit: null as string | null,
      lastDoctor: "",
      riskScore: 0,
      riskBand: "green",
      riskLabel: "Low risk",
    };
    existing.visits += 1;
    if (a.status === "completed") existing.completed += 1;
    if (a.status === "cancelled") existing.cancelled += 1;
    const startIso = a.scheduledStart
      ? new Date(a.scheduledStart).toISOString()
      : null;
    if (startIso) {
      if (
        new Date(startIso) < new Date() &&
        (!existing.lastVisit || startIso > existing.lastVisit)
      ) {
        existing.lastVisit = startIso;
        const d = a.practitionerId;
        existing.lastDoctor = d?.firstName
          ? `Dr. ${d.firstName} ${d.lastName || ""}`.trim()
          : "";
      }
      if (
        new Date(startIso) >= new Date() &&
        (a.status === "scheduled" || a.status === "in_progress") &&
        (!existing.nextVisit || startIso < existing.nextVisit)
      ) {
        existing.nextVisit = startIso;
      }
    }
    patientMap.set(pid, existing);
  }

  const pids = [...patientMap.keys()].filter((id) =>
    mongoose.Types.ObjectId.isValid(id),
  );
  if (pids.length) {
    const risks = await RiskScore.aggregate([
      {
        $match: {
          patientId: {
            $in: pids.map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
      },
      { $sort: { calculatedAt: -1 } },
      { $group: { _id: "$patientId", score: { $first: "$score" } } },
    ]);
    for (const r of risks) {
      const row = patientMap.get(r._id.toString());
      if (row) {
        row.riskScore = r.score ?? 0;
        row.riskBand = riskBandFromScore(row.riskScore);
        row.riskLabel = riskBandStyle(row.riskScore).label;
      }
    }
  }

  let patientRows = [...patientMap.values()];
  if (filters.risk) {
    patientRows = patientRows.filter((p) => p.riskBand === filters.risk);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    patientRows = patientRows.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.lastDoctor.toLowerCase().includes(q),
    );
  }
  patientRows = sortRows(
    patientRows,
    filters.sort || "visits",
    filters.sortDir || "desc",
  );

  // ── Appointments ─────────────────────────────────────────────────────────
  let appointmentRows = (appointments as any[]).map((a) => {
    const p = a.patientId;
    const d = a.practitionerId;
    return {
      id: a._id.toString(),
      scheduledStart: a.scheduledStart,
      patient: p?.firstName
        ? `${p.firstName} ${p.lastName || ""}`.trim()
        : "Patient",
      doctor: d?.firstName
        ? `Dr. ${d.firstName} ${d.lastName || ""}`.trim()
        : "Doctor",
      type: a.type,
      status: a.status,
      room: a.room || "—",
    };
  });
  if (filters.status) {
    appointmentRows = appointmentRows.filter(
      (a) => a.status === filters.status,
    );
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    appointmentRows = appointmentRows.filter(
      (a) =>
        a.patient.toLowerCase().includes(q) ||
        a.doctor.toLowerCase().includes(q) ||
        a.room.toLowerCase().includes(q),
    );
  }
  appointmentRows = sortRows(
    appointmentRows,
    filters.sort || "scheduledStart",
    filters.sortDir || "desc",
  );

  // ── Intelligence (period-aware extras) ───────────────────────────────────
  const intelligence = [...overview.intelligence];
  if (revenuePending > 0) {
    intelligence.unshift({
      id: "pending-revenue",
      severity: "warning",
      title: "Pending payments",
      detail: `R ${revenuePending.toLocaleString("en-ZA")} in pending transactions for the selected period.`,
      metric: `R ${revenuePending.toLocaleString("en-ZA")}`,
    });
  }
  if (doctorRows.filter((d) => d.isOnDuty).length === 0 && doctorRows.length) {
    intelligence.unshift({
      id: "duty-report",
      severity: "warning",
      title: "No doctors on duty in report view",
      detail: "Consider updating staff duty flags for accurate coverage reporting.",
      metric: "0 on duty",
    });
  }
  const highRisk = patientRows.filter((p) => p.riskBand === "red").length;
  if (highRisk > 0) {
    intelligence.unshift({
      id: "risk-report",
      severity: highRisk >= 5 ? "critical" : "warning",
      title: "High-risk patients in cohort",
      detail: `${highRisk} patients in this report period have high clinical risk scores.`,
      metric: `${highRisk} high-risk`,
    });
  }

  const departments = [
    ...new Set(staffList.map((s: any) => s.department || "General")),
  ].sort();

  return {
    meta: {
      type: filters.type,
      generatedAt: new Date().toISOString(),
      from: filters.from || null,
      to: filters.to || null,
      facilityName: (facility as any)?.name || overview.facility?.name || "Facility",
      adminName,
      hospitalId,
    },
    overview,
    facility: overview.facility,
    kpi: {
      ...overview.kpi,
      revenuePeriod: revenuePaid,
      revenuePending,
      transactionCount: financialRows.length,
      doctorCount: doctorRows.length,
      patientCount: patientRows.length,
      appointmentCount: appointmentRows.length,
      staffCount: staffRows.length,
      highRiskPatients: highRisk,
    },
    intelligence: intelligence.slice(0, 10),
    departments,
    tables: {
      financial: financialRows,
      doctors: doctorRows,
      staff: staffRows,
      patients: patientRows,
      appointments: appointmentRows,
    },
    charts: {
      monthlyData: overview.monthlyData,
      staffByRole: overview.staffByRole,
      departmentBreakdown: overview.departmentBreakdown,
      appointmentStatus: overview.appointmentStatus,
      appointmentTypes: overview.appointmentTypes,
      riskDist: (() => {
        const bands = { green: 0, gray: 0, orange: 0, red: 0 };
        for (const p of patientRows) {
          bands[p.riskBand as keyof typeof bands] =
            (bands[p.riskBand as keyof typeof bands] || 0) + 1;
        }
        return (["green", "gray", "orange", "red"] as const).map((b) => ({
          name: b,
          label: riskBandStyle(
            b === "green" ? 20 : b === "gray" ? 40 : b === "orange" ? 60 : 85,
          ).label,
          value: bands[b],
          color: riskBandStyle(
            b === "green" ? 20 : b === "gray" ? 40 : b === "orange" ? 60 : 85,
          ).bg,
        }));
      })(),
    },
  };
}

export function reportToCsv(
  type: ReportType,
  tables: Awaited<ReturnType<typeof buildHospitalReport>>["tables"],
): string {
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  let rows: Record<string, any>[] = [];
  switch (type) {
    case "financial":
      rows = tables.financial;
      break;
    case "doctors":
      rows = tables.doctors;
      break;
    case "staff":
      rows = tables.staff;
      break;
    case "patients":
      rows = tables.patients;
      break;
    case "appointments":
      rows = tables.appointments;
      break;
    case "facility":
    case "overview":
    default:
      // Combined summary CSV
      rows = [
        ...tables.doctors.map((d) => ({ section: "doctor", ...d })),
        ...tables.patients.map((p) => ({ section: "patient", ...p })),
        ...tables.financial.map((f) => ({ section: "financial", ...f })),
      ];
      break;
  }

  if (!rows.length) return "No data\n";
  const headers = Object.keys(rows[0]).filter(
    (k) => typeof rows[0][k] !== "object" || rows[0][k] === null,
  );
  return [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const v = r[h];
          if (v instanceof Date) return escape(v.toISOString());
          return escape(v);
        })
        .join(","),
    ),
  ].join("\n");
}
