/**
 * Facility-level overview: staff, doctors, patients, appointments, intelligence.
 */
import mongoose from "mongoose";
import Staff from "@/lib/models/Staff";
import HospitalAppointment from "@/lib/models/HospitalAppointment";
import HospitalTransaction from "@/lib/models/HospitalTransaction";
import Facility from "@/lib/models/Facility";
import User from "@/lib/models/User";
import { PractitionerProfile } from "@/lib/models/RoleProfiles";
import { Consultation } from "@/lib/models/Consultation";
import RiskScore from "@/lib/models/RiskScore";
import { riskBandFromScore } from "@/lib/riskScore";

export interface HospitalOverviewData {
  isNewUser: boolean;
  name: string;
  facility: {
    id: string;
    name: string;
    facilityType: string;
    city?: string;
    province?: string;
    specialties: string[];
    emergencyServices: boolean;
    isOpen: boolean;
    bedCapacity: {
      total: number;
      generalAvailable: number;
      icuAvailable: number;
      occupancyPercent: number;
    };
    waitTimeMins: number;
  } | null;
  kpi: {
    consultationsToday: number;
    revenueToday: number;
    revenueMonth: number;
    staffOnDuty: number;
    totalStaff: number;
    totalDoctors: number;
    doctorsOnDuty: number;
    totalNurses: number;
    uniquePatients: number;
    patientsThisMonth: number;
    upcomingAppointments: number;
    completedThisMonth: number;
    cancelledThisMonth: number;
    highRiskPatients: number;
    avgDoctorRating: number;
  };
  staffByRole: { role: string; count: number; onDuty: number }[];
  departmentBreakdown: { department: string; staff: number; doctors: number }[];
  doctors: {
    id: string;
    staffId: string;
    name: string;
    email?: string;
    department: string;
    isOnDuty: boolean;
    qualifications: string[];
    specialisation?: string;
    rating: number;
    reviewCount: number;
    patientLoad: number;
    appointmentsToday: number;
    completedMonth: number;
  }[];
  patients: {
    id: string;
    name: string;
    email?: string;
    totalVisits: number;
    lastVisit: string | null;
    nextVisit: string | null;
    lastDoctor?: string;
    riskScore: number;
    riskBand: string;
  }[];
  appointmentStatus: { name: string; value: number }[];
  appointmentTypes: { name: string; value: number }[];
  monthlyData: { month: string; consultations: number; completed: number }[];
  upcomingAppointments: {
    id: string;
    patientName: string;
    doctorName: string;
    type: string;
    room: string;
    scheduledStart: string;
    status: string;
  }[];
  intelligence: {
    id: string;
    severity: "info" | "success" | "warning" | "critical";
    title: string;
    detail: string;
    metric?: string;
  }[];
}

function emptyOverview(adminName: string): HospitalOverviewData {
  return {
    isNewUser: true,
    name: adminName,
    facility: null,
    kpi: {
      consultationsToday: 0,
      revenueToday: 0,
      revenueMonth: 0,
      staffOnDuty: 0,
      totalStaff: 0,
      totalDoctors: 0,
      doctorsOnDuty: 0,
      totalNurses: 0,
      uniquePatients: 0,
      patientsThisMonth: 0,
      upcomingAppointments: 0,
      completedThisMonth: 0,
      cancelledThisMonth: 0,
      highRiskPatients: 0,
      avgDoctorRating: 0,
    },
    staffByRole: [],
    departmentBreakdown: [],
    doctors: [],
    patients: [],
    appointmentStatus: [],
    appointmentTypes: [],
    monthlyData: [],
    upcomingAppointments: [],
    intelligence: [
      {
        id: "setup",
        severity: "info",
        title: "Complete facility setup",
        detail:
          "Link your hospital profile and add staff to unlock live operational insights.",
      },
    ],
  };
}

export async function buildHospitalOverview(
  hospitalId: string | null,
  adminName: string,
): Promise<HospitalOverviewData> {
  if (!hospitalId) return emptyOverview(adminName);

  const facilityOid = new mongoose.Types.ObjectId(hospitalId);
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
  );

  const facility = await Facility.findById(hospitalId).lean();
  if (!facility) return emptyOverview(adminName);

  const fac = facility as any;
  const totalBeds = fac.bedCapacity?.total || 0;
  const available =
    (fac.bedCapacity?.generalAvailable || 0) +
    (fac.bedCapacity?.icuAvailable || 0);
  const occupied = Math.max(0, totalBeds - available);
  const occupancyPercent =
    totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0;

  // Staff
  const staffList = await Staff.find({ facilityId: facilityOid })
    .populate("userId", "firstName lastName email avatarUrl")
    .lean();

  const totalStaff = staffList.length;
  const staffOnDuty = staffList.filter((s: any) => s.isOnDuty).length;
  const doctorsStaff = staffList.filter((s: any) => s.role === "doctor");
  const totalDoctors = doctorsStaff.length;
  const doctorsOnDuty = doctorsStaff.filter((s: any) => s.isOnDuty).length;
  const totalNurses = staffList.filter((s: any) => s.role === "nurse").length;

  const roleMap: Record<string, { count: number; onDuty: number }> = {};
  for (const s of staffList as any[]) {
    const r = s.role || "other";
    if (!roleMap[r]) roleMap[r] = { count: 0, onDuty: 0 };
    roleMap[r].count += 1;
    if (s.isOnDuty) roleMap[r].onDuty += 1;
  }
  const staffByRole = Object.entries(roleMap).map(([role, v]) => ({
    role,
    count: v.count,
    onDuty: v.onDuty,
  }));

  const deptMap: Record<string, { staff: number; doctors: number }> = {};
  for (const s of staffList as any[]) {
    const d = s.department || "General";
    if (!deptMap[d]) deptMap[d] = { staff: 0, doctors: 0 };
    deptMap[d].staff += 1;
    if (s.role === "doctor") deptMap[d].doctors += 1;
  }
  const departmentBreakdown = Object.entries(deptMap)
    .map(([department, v]) => ({ department, ...v }))
    .sort((a, b) => b.staff - a.staff);

  // Appointments
  const allAppts = await HospitalAppointment.find({
    facilityId: facilityOid,
  })
    .sort({ scheduledStart: -1 })
    .lean();

  const apptsToday = allAppts.filter(
    (a: any) => new Date(a.scheduledStart) >= today,
  );
  const consultationsToday = apptsToday.length;

  const monthAppts = allAppts.filter((a: any) => {
    const t = new Date(a.scheduledStart).getTime();
    return t >= monthStart.getTime() && t <= monthEnd.getTime();
  });
  const completedThisMonth = monthAppts.filter(
    (a: any) => a.status === "completed",
  ).length;
  const cancelledThisMonth = monthAppts.filter(
    (a: any) => a.status === "cancelled",
  ).length;
  const upcomingCount = allAppts.filter(
    (a: any) =>
      new Date(a.scheduledStart) >= now &&
      (a.status === "scheduled" || a.status === "in_progress"),
  ).length;

  const statusMap: Record<string, number> = {};
  const typeMap: Record<string, number> = {};
  for (const a of allAppts as any[]) {
    statusMap[a.status || "unknown"] =
      (statusMap[a.status || "unknown"] || 0) + 1;
    typeMap[a.type || "consultation"] =
      (typeMap[a.type || "consultation"] || 0) + 1;
  }
  const appointmentStatus = Object.entries(statusMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const appointmentTypes = Object.entries(typeMap).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  // Unique patients from appointments
  const patientIds = [
    ...new Set(
      allAppts
        .map((a: any) => a.patientId?.toString())
        .filter(Boolean) as string[],
    ),
  ];
  const uniquePatients = patientIds.length;
  const patientsThisMonth = [
    ...new Set(
      monthAppts
        .map((a: any) => a.patientId?.toString())
        .filter(Boolean) as string[],
    ),
  ].length;

  // Also patients from consultations linked to facility
  try {
    const consultPatients = await Consultation.find({
      facilityId: facilityOid,
    }).distinct("patientId");
    for (const pid of consultPatients) {
      const id = pid.toString();
      if (!patientIds.includes(id)) patientIds.push(id);
    }
  } catch {
    /* optional */
  }

  // Revenue
  const [txToday, txMonth] = await Promise.all([
    HospitalTransaction.find({
      facilityId: facilityOid,
      timestamp: { $gte: today },
      status: "paid",
    }).lean(),
    HospitalTransaction.find({
      facilityId: facilityOid,
      timestamp: { $gte: monthStart },
      status: "paid",
    }).lean(),
  ]);
  const revenueToday = txToday.reduce(
    (s: number, t: any) => s + (t.amount || 0),
    0,
  );
  const revenueMonth = txMonth.reduce(
    (s: number, t: any) => s + (t.amount || 0),
    0,
  );

  // Doctor profiles + load
  const doctorUserIds = doctorsStaff
    .map((s: any) => s.userId?._id || s.userId)
    .filter(Boolean)
    .map((id: any) => id.toString());

  const profiles = doctorUserIds.length
    ? await PractitionerProfile.find({
        userId: {
          $in: doctorUserIds.map(
            (id) => new mongoose.Types.ObjectId(id),
          ),
        },
      }).lean()
    : [];
  const profileByUser = new Map(
    profiles.map((p: any) => [p.userId.toString(), p]),
  );

  const doctors = doctorsStaff.map((s: any) => {
    const u = s.userId;
    const uid = (u?._id || u)?.toString();
    const prof = uid ? profileByUser.get(uid) : null;
    const load = allAppts.filter(
      (a: any) => a.practitionerId?.toString() === uid,
    ).length;
    const todayLoad = apptsToday.filter(
      (a: any) => a.practitionerId?.toString() === uid,
    ).length;
    const completedMonth = monthAppts.filter(
      (a: any) =>
        a.practitionerId?.toString() === uid && a.status === "completed",
    ).length;
    const name = u
      ? `Dr. ${u.firstName || ""} ${u.lastName || ""}`.trim()
      : "Unassigned doctor";

    return {
      id: uid || s._id.toString(),
      staffId: s._id.toString(),
      name,
      email: u?.email,
      department: s.department || "General",
      isOnDuty: !!s.isOnDuty,
      qualifications: s.qualifications || [],
      specialisation: prof?.specialisation || s.department,
      rating: prof?.rating || 0,
      reviewCount: prof?.reviewCount || 0,
      patientLoad: load,
      appointmentsToday: todayLoad,
      completedMonth,
    };
  });

  // Sort doctors: on duty first, then by load
  doctors.sort((a, b) => {
    if (a.isOnDuty !== b.isOnDuty) return a.isOnDuty ? -1 : 1;
    return b.patientLoad - a.patientLoad;
  });

  const avgDoctorRating =
    doctors.filter((d) => d.rating > 0).length > 0
      ? Math.round(
          (doctors.reduce((s, d) => s + (d.rating || 0), 0) /
            doctors.filter((d) => d.rating > 0).length) *
            10,
        ) / 10
      : 0;

  // Patients detail
  const patientOids = patientIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const patientUsers = patientOids.length
    ? await User.find({ _id: { $in: patientOids } })
        .select("firstName lastName email")
        .lean()
    : [];
  const userById = new Map(
    patientUsers.map((u: any) => [u._id.toString(), u]),
  );

  // Latest risk scores
  const risks = patientOids.length
    ? await RiskScore.aggregate([
        { $match: { patientId: { $in: patientOids } } },
        { $sort: { calculatedAt: -1 } },
        { $group: { _id: "$patientId", score: { $first: "$score" } } },
      ])
    : [];
  const riskByPatient = new Map(
    risks.map((r: any) => [r._id.toString(), r.score as number]),
  );

  const patients = patientIds.slice(0, 50).map((pid) => {
    const u = userById.get(pid);
    const appts = allAppts.filter(
      (a: any) => a.patientId?.toString() === pid,
    ) as any[];
    const past = appts
      .filter((a) => new Date(a.scheduledStart) < now)
      .sort(
        (a, b) =>
          new Date(b.scheduledStart).getTime() -
          new Date(a.scheduledStart).getTime(),
      );
    const future = appts
      .filter(
        (a) =>
          new Date(a.scheduledStart) >= now &&
          (a.status === "scheduled" || a.status === "in_progress"),
      )
      .sort(
        (a, b) =>
          new Date(a.scheduledStart).getTime() -
          new Date(b.scheduledStart).getTime(),
      );
    const last = past[0];
    const next = future[0];
    let lastDoctor: string | undefined;
    if (last?.practitionerId) {
      const d = doctors.find(
        (x) => x.id === last.practitionerId.toString(),
      );
      lastDoctor = d?.name;
    }
    const score = riskByPatient.get(pid) ?? 0;
    return {
      id: pid,
      name: u
        ? `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Patient"
        : "Patient",
      email: u?.email,
      totalVisits: appts.length,
      lastVisit: last?.scheduledStart
        ? new Date(last.scheduledStart).toISOString()
        : null,
      nextVisit: next?.scheduledStart
        ? new Date(next.scheduledStart).toISOString()
        : null,
      lastDoctor,
      riskScore: score,
      riskBand: riskBandFromScore(score),
    };
  });

  patients.sort((a, b) => b.totalVisits - a.totalVisits);
  const highRiskPatients = patients.filter((p) => p.riskBand === "red").length;

  // Upcoming enriched
  const upcomingRaw = await HospitalAppointment.find({
    facilityId: facilityOid,
    scheduledStart: { $gte: now },
    status: { $in: ["scheduled", "in_progress"] },
  })
    .sort({ scheduledStart: 1 })
    .limit(10)
    .populate("patientId", "firstName lastName")
    .populate("practitionerId", "firstName lastName")
    .lean();

  const upcomingAppointments = upcomingRaw.map((a: any) => {
    const p = a.patientId;
    const d = a.practitionerId;
    return {
      id: a._id.toString(),
      patientName: p
        ? `${p.firstName || ""} ${p.lastName || ""}`.trim()
        : "Patient",
      doctorName: d
        ? `Dr. ${d.firstName || ""} ${d.lastName || ""}`.trim()
        : "Doctor",
      type: a.type || "consultation",
      room: a.room || "—",
      scheduledStart: new Date(a.scheduledStart).toISOString(),
      status: a.status,
    };
  });

  // Monthly volume
  const monthlyData = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const start = new Date(d);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      return Promise.all([
        HospitalAppointment.countDocuments({
          facilityId: facilityOid,
          scheduledStart: { $gte: start, $lte: end },
        }),
        HospitalAppointment.countDocuments({
          facilityId: facilityOid,
          scheduledStart: { $gte: start, $lte: end },
          status: "completed",
        }),
      ]).then(([consultations, completed]) => ({
        month: d.toLocaleString("default", { month: "short" }),
        consultations,
        completed,
      }));
    }),
  );

  // Intelligence
  const intelligence: HospitalOverviewData["intelligence"] = [];

  if (doctorsOnDuty === 0 && totalDoctors > 0) {
    intelligence.push({
      id: "no-doctors-duty",
      severity: "warning",
      title: "No doctors marked on duty",
      detail: `${totalDoctors} doctor${totalDoctors === 1 ? "" : "s"} on roster but none are on duty. Update staff duty status for accurate coverage.`,
      metric: "0 on duty",
    });
  } else if (doctorsOnDuty > 0) {
    intelligence.push({
      id: "coverage",
      severity: "success",
      title: "Doctor coverage active",
      detail: `${doctorsOnDuty} of ${totalDoctors} doctors currently on duty across the facility.`,
      metric: `${doctorsOnDuty}/${totalDoctors}`,
    });
  }

  if (highRiskPatients > 0) {
    intelligence.push({
      id: "high-risk",
      severity: highRiskPatients >= 5 ? "critical" : "warning",
      title: "High-risk patients in cohort",
      detail: `${highRiskPatients} patient${highRiskPatients === 1 ? "" : "s"} assigned to this hospital sit in the high-risk band. Ensure follow-up pathways are clear.`,
      metric: `${highRiskPatients} high-risk`,
    });
  }

  if (occupancyPercent >= 90 && totalBeds > 0) {
    intelligence.push({
      id: "beds",
      severity: "critical",
      title: "Bed capacity critical",
      detail: `Occupancy is ${occupancyPercent}% (${occupied}/${totalBeds}). Consider discharge planning or diversion protocols.`,
      metric: `${occupancyPercent}%`,
    });
  } else if (occupancyPercent >= 75 && totalBeds > 0) {
    intelligence.push({
      id: "beds-high",
      severity: "warning",
      title: "Elevated bed occupancy",
      detail: `Beds are ${occupancyPercent}% full. Monitor ICU and general wards closely.`,
      metric: `${occupancyPercent}%`,
    });
  }

  if (cancelledThisMonth > 0 && monthAppts.length >= 5) {
    const cancelRate = Math.round(
      (cancelledThisMonth / monthAppts.length) * 100,
    );
    if (cancelRate >= 20) {
      intelligence.push({
        id: "cancellations",
        severity: "warning",
        title: "High cancellation rate this month",
        detail: `${cancelRate}% of appointments cancelled (${cancelledThisMonth}/${monthAppts.length}). Review scheduling and reminder workflows.`,
        metric: `${cancelRate}%`,
      });
    }
  }

  if (uniquePatients > 0) {
    intelligence.push({
      id: "patients",
      severity: "info",
      title: "Patient panel",
      detail: `${uniquePatients} unique patients have appointments at this facility (${patientsThisMonth} active this month).`,
      metric: `${uniquePatients} patients`,
    });
  }

  if (consultationsToday > 0) {
    intelligence.push({
      id: "today",
      severity: "info",
      title: "Today's clinic load",
      detail: `${consultationsToday} appointment${consultationsToday === 1 ? "" : "s"} scheduled today with ${upcomingCount} still upcoming.`,
      metric: `${consultationsToday} today`,
    });
  }

  if (!intelligence.length) {
    intelligence.push({
      id: "baseline",
      severity: "info",
      title: "Insights warming up",
      detail:
        "As appointments and staff activity grow, DigiHealth will surface more targeted operational recommendations.",
    });
  }

  return {
    isNewUser: false,
    name: adminName,
    facility: {
      id: hospitalId,
      name: fac.name,
      facilityType: fac.facilityType || "Hospital",
      city: fac.address?.city,
      province: fac.address?.province,
      specialties: fac.specialties || [],
      emergencyServices: !!fac.emergencyServices,
      isOpen: fac.isOpen !== false,
      bedCapacity: {
        total: totalBeds,
        generalAvailable: fac.bedCapacity?.generalAvailable || 0,
        icuAvailable: fac.bedCapacity?.icuAvailable || 0,
        occupancyPercent,
      },
      waitTimeMins: fac.currentWaitTimeMins || 0,
    },
    kpi: {
      consultationsToday,
      revenueToday,
      revenueMonth,
      staffOnDuty,
      totalStaff,
      totalDoctors,
      doctorsOnDuty,
      totalNurses,
      uniquePatients: patientIds.length,
      patientsThisMonth,
      upcomingAppointments: upcomingCount,
      completedThisMonth,
      cancelledThisMonth,
      highRiskPatients,
      avgDoctorRating,
    },
    staffByRole,
    departmentBreakdown,
    doctors,
    patients: patients.slice(0, 24),
    appointmentStatus,
    appointmentTypes,
    monthlyData,
    upcomingAppointments,
    intelligence: intelligence.slice(0, 8),
  };
}
