/**
 * Practitioner Clinical Insights — full roster analytics + teleclinic intelligence.
 * Shared by GET /api/practitioner/insights and PDF export.
 */
import mongoose from "mongoose";
import { Consultation } from "@/lib/models/Consultation";
import RiskScore from "@/lib/models/RiskScore";
import User from "@/lib/models/User";
import {
  PatientProfile,
  PractitionerProfile,
} from "@/lib/models/RoleProfiles";
import { Prescription, MedicalContext } from "@/lib/models/ClinicalData";
import { PaymentTransaction } from "@/lib/models/Billing";
import { Review } from "@/lib/models/ReviewsDocs";
import {
  calcAge,
  riskBandFromScore,
  riskBandStyle,
  type RiskBand,
} from "@/lib/riskScore";

const BAND_ORDER: RiskBand[] = ["green", "gray", "orange", "red"];
const BAND_SAMPLE: Record<RiskBand, number> = {
  green: 20,
  gray: 40,
  orange: 60,
  red: 85,
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface IntelligenceItem {
  id: string;
  severity: "info" | "success" | "warning" | "critical";
  title: string;
  detail: string;
  metric?: string;
}

export interface PractitionerInsightsData {
  periodDays: number;
  generatedAt: string;
  practitioner: {
    name: string;
    firstName: string;
    lastName: string;
    specialisation: string;
    hpcsaNumber: string;
    experienceYears: number | null;
    rating: number;
    reviewCount: number;
    languages: string[];
    acceptedMedicalAids: string[];
    city?: string;
    province?: string;
    isOnline: boolean;
    bio?: string;
  };
  kpis: {
    totalPatients: number;
    totalConsults: number;
    periodConsults: number;
    completedPeriod: number;
    adherencePercent: number;
    noShowPercent: number;
    avgRiskScore: number;
    highRiskPatients: number;
    soapCompletionPercent: number;
    prescriptionsIssued: number;
    avgCallMinutes: number;
    earningsZar: number;
    rating: number;
    reviewCount: number;
  };
  riskDist: {
    name: RiskBand;
    label: string;
    value: number;
    color: string;
    percent: number;
  }[];
  consultTrend: { date: string; count: number }[];
  typeMix: { name: string; value: number; color: string }[];
  statusBreakdown: { name: string; value: number }[];
  peakHours: { hour: string; count: number }[];
  peakDays: { day: string; count: number }[];
  genderDist: { name: string; value: number; color: string }[];
  ageBands: { name: string; value: number }[];
  conditions: { name: string; value: number }[];
  topReasons: { name: string; count: number }[];
  intelligence: IntelligenceItem[];
  teleclinic: {
    videoPercent: number;
    chatPercent: number;
    inPersonPercent: number;
    totalCallMinutes: number;
    avgMinutesPerConsult: number;
    periodLabel: string;
  };
  /** Back-compat fields used by existing UI */
  totalPatients: number;
  totalPatientsInRiskDist: number;
  totalConsults: number;
  adherencePercent: number;
}

function practMatch(practitionerId: string, practitionerOid: mongoose.Types.ObjectId) {
  return {
    $or: [
      { practitionerId: practitionerOid },
      { practitionerId: practitionerId as any },
    ],
  };
}

async function getRosterPatientIds(
  practitionerId: string,
  practitionerOid: mongoose.Types.ObjectId,
): Promise<mongoose.Types.ObjectId[]> {
  const profile = await PractitionerProfile.findOne({
    userId: practitionerId,
  }).lean();
  const assignedIds = (profile?.assignedPatientIds || [])
    .map((id: any) => id?.toString?.() || String(id))
    .filter((id: string) => mongoose.Types.ObjectId.isValid(id));

  const consultedIds = await Consultation.find(
    practMatch(practitionerId, practitionerOid),
  ).distinct("patientId");

  const unique = [
    ...new Set([...assignedIds, ...consultedIds.map((id) => id.toString())]),
  ].filter((id) => mongoose.Types.ObjectId.isValid(id));

  return unique.map((id) => new mongoose.Types.ObjectId(id));
}

async function patientRiskScores(
  practitionerId: string,
  practitionerOid: mongoose.Types.ObjectId,
  patientIds: mongoose.Types.ObjectId[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!patientIds.length) return map;

  const latestConsultRisks = await Consultation.aggregate([
    {
      $match: {
        ...practMatch(practitionerId, practitionerOid),
        patientId: { $in: patientIds },
        "clinicalRisk.score": { $exists: true, $ne: null },
      },
    },
    { $sort: { scheduledStartTime: -1 } },
    {
      $group: {
        _id: "$patientId",
        score: { $first: "$clinicalRisk.score" },
      },
    },
  ]);
  for (const row of latestConsultRisks) {
    if (row._id != null && typeof row.score === "number") {
      map.set(row._id.toString(), row.score);
    }
  }

  const latestStored = await RiskScore.aggregate([
    { $match: { patientId: { $in: patientIds } } },
    { $sort: { calculatedAt: -1 } },
    { $group: { _id: "$patientId", score: { $first: "$score" } } },
  ]);
  for (const row of latestStored) {
    if (row._id != null && typeof row.score === "number") {
      map.set(row._id.toString(), row.score);
    }
  }
  return map;
}

function hasSoap(notes: any): boolean {
  if (!notes || typeof notes !== "object") return false;
  return Boolean(
    notes.subjective ||
      notes.objective ||
      notes.assessment ||
      notes.plan ||
      notes.signedAt,
  );
}

function buildIntelligence(input: {
  totalPatients: number;
  periodConsults: number;
  adherencePercent: number;
  noShowPercent: number;
  highRiskPatients: number;
  highRiskPercent: number;
  soapCompletionPercent: number;
  videoPercent: number;
  avgRiskScore: number;
  peakDay?: string;
  peakHour?: string;
  topCondition?: string;
  topReason?: string;
  rating: number;
  prescriptionsIssued: number;
  periodDays: number;
}): IntelligenceItem[] {
  const items: IntelligenceItem[] = [];
  const {
    totalPatients,
    periodConsults,
    adherencePercent,
    noShowPercent,
    highRiskPatients,
    highRiskPercent,
    soapCompletionPercent,
    videoPercent,
    avgRiskScore,
    peakDay,
    peakHour,
    topCondition,
    topReason,
    rating,
    prescriptionsIssued,
    periodDays,
  } = input;

  if (highRiskPatients > 0) {
    items.push({
      id: "high-risk",
      severity: highRiskPercent >= 25 ? "critical" : "warning",
      title:
        highRiskPercent >= 25
          ? "Elevated high-risk burden"
          : "High-risk patients need follow-up",
      detail: `${highRiskPatients} patient${highRiskPatients === 1 ? "" : "s"} (${highRiskPercent}%) are in the high-risk band (score 76–100). Prioritise review, care plans, and outreach.`,
      metric: `${highRiskPatients} high-risk`,
    });
  } else if (totalPatients > 0) {
    items.push({
      id: "risk-stable",
      severity: "success",
      title: "Risk profile is stable",
      detail:
        "No patients currently sit in the high-risk band. Continue routine monitoring and preventive telehealth check-ins.",
      metric: `Avg risk ${avgRiskScore}`,
    });
  }

  if (periodConsults === 0) {
    items.push({
      id: "no-activity",
      severity: "info",
      title: "Quiet period for the teleclinic",
      detail: `No consultations in the last ${periodDays} days. Consider availability slots, patient reminders, or promotional clinic hours.`,
    });
  } else {
    items.push({
      id: "volume",
      severity: "info",
      title: "Teleclinic volume",
      detail: `${periodConsults} consultation${periodConsults === 1 ? "" : "s"} over the last ${periodDays} days (~${(periodConsults / periodDays).toFixed(1)}/day).`,
      metric: `${periodConsults} consults`,
    });
  }

  if (adherencePercent < 70 && periodConsults >= 3) {
    items.push({
      id: "adherence",
      severity: "warning",
      title: "Attendance adherence is low",
      detail: `Only ${adherencePercent}% of bookings completed. Missed/cancelled rate is ${noShowPercent}%. Send SMS reminders 24h before and offer flexible reschedule links.`,
      metric: `${adherencePercent}% adherence`,
    });
  } else if (adherencePercent >= 85 && periodConsults >= 3) {
    items.push({
      id: "adherence-good",
      severity: "success",
      title: "Strong appointment adherence",
      detail: `${adherencePercent}% of consultations completed — patients are engaging well with your teleclinic.`,
      metric: `${adherencePercent}%`,
    });
  }

  if (soapCompletionPercent < 50 && periodConsults >= 3) {
    items.push({
      id: "soap",
      severity: "warning",
      title: "SOAP documentation gap",
      detail: `Only ${soapCompletionPercent}% of completed visits have SOAP notes. Complete documentation improves continuity and medicolegal safety.`,
      metric: `${soapCompletionPercent}% SOAP`,
    });
  } else if (soapCompletionPercent >= 80 && periodConsults >= 3) {
    items.push({
      id: "soap-good",
      severity: "success",
      title: "Excellent clinical documentation",
      detail: `${soapCompletionPercent}% of completed consultations include SOAP notes.`,
      metric: `${soapCompletionPercent}%`,
    });
  }

  if (videoPercent >= 60) {
    items.push({
      id: "video-first",
      severity: "info",
      title: "Video-first teleclinic",
      detail: `${videoPercent}% of visits are video. Ensure stable connectivity guidance for patients and keep backup chat/phone pathways ready.`,
      metric: `${videoPercent}% video`,
    });
  }

  if (peakDay || peakHour) {
    items.push({
      id: "peaks",
      severity: "info",
      title: "Demand peaks",
      detail: [
        peakDay ? `Busiest day: ${peakDay}.` : null,
        peakHour ? `Peak hour: ${peakHour}.` : null,
        "Align staffing and open slots around these windows for better utilisation.",
      ]
        .filter(Boolean)
        .join(" "),
      metric: [peakDay, peakHour].filter(Boolean).join(" · "),
    });
  }

  if (topCondition) {
    items.push({
      id: "condition",
      severity: "info",
      title: "Dominant chronic condition",
      detail: `"${topCondition}" is the most common chronic condition on your roster. Consider structured recall clinics or educational materials for this cohort.`,
      metric: topCondition,
    });
  }

  if (topReason) {
    items.push({
      id: "reason",
      severity: "info",
      title: "Top consultation reason",
      detail: `Most frequent chief complaint: "${topReason}". Prepare templated SOAP plans and patient leaflets for this presentation.`,
      metric: topReason,
    });
  }

  if (rating > 0 && rating < 3.5) {
    items.push({
      id: "rating-low",
      severity: "warning",
      title: "Patient satisfaction needs attention",
      detail: `Average rating is ${rating.toFixed(1)}/5. Review recent feedback, wait times, and communication quality.`,
      metric: `${rating.toFixed(1)}★`,
    });
  } else if (rating >= 4.5) {
    items.push({
      id: "rating-high",
      severity: "success",
      title: "Excellent patient satisfaction",
      detail: `You hold a ${rating.toFixed(1)}/5 average rating. Maintain response times and personalised follow-up.`,
      metric: `${rating.toFixed(1)}★`,
    });
  }

  if (prescriptionsIssued > 0) {
    items.push({
      id: "rx",
      severity: "info",
      title: "Prescribing activity",
      detail: `${prescriptionsIssued} prescription${prescriptionsIssued === 1 ? "" : "s"} issued in this period. Audit high-risk meds and ensure scripts reach patients via chat/download.`,
      metric: `${prescriptionsIssued} Rx`,
    });
  }

  if (!items.length) {
    items.push({
      id: "baseline",
      severity: "info",
      title: "Insights warming up",
      detail:
        "As your teleclinic activity grows, DigiHealth will surface more targeted clinical and operational recommendations here.",
    });
  }

  return items.slice(0, 10);
}

export async function buildPractitionerInsights(
  practitionerId: string,
  days = 30,
): Promise<PractitionerInsightsData> {
  const practitionerOid = new mongoose.Types.ObjectId(practitionerId);
  const match = practMatch(practitionerId, practitionerOid);

  const since = new Date();
  since.setDate(since.getDate() - days);

  const [user, profile, patientIds] = await Promise.all([
    User.findById(practitionerId)
      .select("firstName lastName email")
      .lean(),
    PractitionerProfile.findOne({ userId: practitionerId }).lean(),
    getRosterPatientIds(practitionerId, practitionerOid),
  ]);

  const firstName = (user as any)?.firstName || "";
  const lastName = (user as any)?.lastName || "";
  const name =
    `Dr. ${firstName} ${lastName}`.replace(/\s+/g, " ").trim() ||
    "Practitioner";

  const scores = await patientRiskScores(
    practitionerId,
    practitionerOid,
    patientIds,
  );

  const bandCounts: Record<RiskBand, number> = {
    green: 0,
    gray: 0,
    orange: 0,
    red: 0,
  };
  let riskSum = 0;
  for (const pid of patientIds) {
    const score = scores.get(pid.toString()) ?? 0;
    riskSum += score;
    bandCounts[riskBandFromScore(score)] += 1;
  }
  const totalPatients = patientIds.length;
  const avgRiskScore =
    totalPatients > 0 ? Math.round(riskSum / totalPatients) : 0;
  const highRiskPatients = bandCounts.red;

  const riskDist = BAND_ORDER.map((band) => {
    const sample = riskBandStyle(BAND_SAMPLE[band]);
    const value = bandCounts[band];
    return {
      name: band,
      label: sample.label,
      value,
      color: sample.bg,
      percent:
        totalPatients > 0 ? Math.round((value / totalPatients) * 100) : 0,
    };
  });

  // All consults + period consults
  const [allConsults, periodConsultsList] = await Promise.all([
    Consultation.find(match).lean(),
    Consultation.find({
      ...match,
      scheduledStartTime: { $gte: since },
    }).lean(),
  ]);

  const totalConsults = allConsults.length;
  const periodConsults = periodConsultsList.length;

  // Status / adherence
  const statusMap: Record<string, number> = {};
  let completedAll = 0;
  for (const c of allConsults as any[]) {
    const s = c.status || "unknown";
    statusMap[s] = (statusMap[s] || 0) + 1;
    if (s === "completed") completedAll += 1;
  }
  const statusBreakdown = Object.entries(statusMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  let completedPeriod = 0;
  let cancelledMissedPeriod = 0;
  let soapDone = 0;
  let completedWithSoapDenom = 0;
  let callMinutesSum = 0;
  let callMinutesN = 0;
  const typeMap: Record<string, number> = {
    video: 0,
    chat: 0,
    in_person: 0,
  };
  const hourMap: Record<number, number> = {};
  const dayMap: Record<number, number> = {};
  const trendMap: Record<string, number> = {};

  // Fill empty trend days
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    trendMap[key] = 0;
  }

  for (const c of periodConsultsList as any[]) {
    const st = c.status || "unknown";
    if (st === "completed") {
      completedPeriod += 1;
      completedWithSoapDenom += 1;
      if (hasSoap(c.soapNotes)) soapDone += 1;
    }
    if (st === "cancelled" || st === "missed") cancelledMissedPeriod += 1;

    const t = (c.type || "video") as string;
    if (t in typeMap) typeMap[t] += 1;
    else typeMap[t] = (typeMap[t] || 0) + 1;

    if (typeof c.callMinutesUsed === "number" && c.callMinutesUsed > 0) {
      callMinutesSum += c.callMinutesUsed;
      callMinutesN += 1;
    }

    if (c.scheduledStartTime) {
      const dt = new Date(c.scheduledStartTime);
      const key = dt.toISOString().slice(0, 10);
      if (key in trendMap) trendMap[key] += 1;
      const h = dt.getHours();
      hourMap[h] = (hourMap[h] || 0) + 1;
      dayMap[dt.getDay()] = (dayMap[dt.getDay()] || 0) + 1;
    }
  }

  // Also count SOAP on completed-all in period for denom if zero completed with status
  const adherencePercent =
    periodConsults > 0
      ? Math.round((completedPeriod / periodConsults) * 100)
      : totalConsults > 0
        ? Math.round((completedAll / totalConsults) * 100)
        : 0;
  const noShowPercent =
    periodConsults > 0
      ? Math.round((cancelledMissedPeriod / periodConsults) * 100)
      : 0;
  const soapCompletionPercent =
    completedWithSoapDenom > 0
      ? Math.round((soapDone / completedWithSoapDenom) * 100)
      : 0;

  const typeColors: Record<string, string> = {
    video: "#4493b8",
    chat: "#53CBF3",
    in_person: "#6554C0",
  };
  const typeMix = Object.entries(typeMap)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({
      name: name === "in_person" ? "In person" : name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: typeColors[name] || "#94a3b8",
    }));

  const typeTotal = Object.values(typeMap).reduce((a, b) => a + b, 0) || 1;
  const videoPercent = Math.round(((typeMap.video || 0) / typeTotal) * 100);
  const chatPercent = Math.round(((typeMap.chat || 0) / typeTotal) * 100);
  const inPersonPercent = Math.round(
    ((typeMap.in_person || 0) / typeTotal) * 100,
  );

  const consultTrend = Object.entries(trendMap).map(([date, count]) => ({
    date,
    count,
  }));

  // Peak hours 6–21
  const peakHours = Array.from({ length: 16 }, (_, i) => {
    const h = i + 6;
    return {
      hour: `${String(h).padStart(2, "0")}:00`,
      count: hourMap[h] || 0,
    };
  });
  const peakDays = DAY_NAMES.map((day, i) => ({
    day,
    count: dayMap[i] || 0,
  }));
  const busiestHour = [...peakHours].sort((a, b) => b.count - a.count)[0];
  const busiestDay = [...peakDays].sort((a, b) => b.count - a.count)[0];

  // Demographics
  const profiles = patientIds.length
    ? await PatientProfile.find({ userId: { $in: patientIds } })
        .select("userId dateOfBirth gender")
        .lean()
    : [];
  const users = patientIds.length
    ? await User.find({ _id: { $in: patientIds } })
        .select("gender dateOfBirth")
        .lean()
    : [];
  const profileByUser = new Map(
    profiles.map((p: any) => [p.userId.toString(), p]),
  );
  const userById = new Map(users.map((u: any) => [u._id.toString(), u]));

  const genderCounts: Record<string, number> = {
    female: 0,
    male: 0,
    other: 0,
    unknown: 0,
  };
  const ageBandCounts: Record<string, number> = {
    "0–17": 0,
    "18–34": 0,
    "35–49": 0,
    "50–64": 0,
    "65+": 0,
    Unknown: 0,
  };

  for (const pid of patientIds) {
    const id = pid.toString();
    const pp = profileByUser.get(id);
    const u = userById.get(id);
    const gender = (pp?.gender || u?.gender || "unknown") as string;
    const gKey = ["male", "female", "other"].includes(gender)
      ? gender
      : "unknown";
    genderCounts[gKey] += 1;

    const age = calcAge(pp?.dateOfBirth || u?.dateOfBirth);
    if (age == null) ageBandCounts.Unknown += 1;
    else if (age < 18) ageBandCounts["0–17"] += 1;
    else if (age < 35) ageBandCounts["18–34"] += 1;
    else if (age < 50) ageBandCounts["35–49"] += 1;
    else if (age < 65) ageBandCounts["50–64"] += 1;
    else ageBandCounts["65+"] += 1;
  }

  const genderDist = [
    { name: "Female", value: genderCounts.female, color: "#ec4899" },
    { name: "Male", value: genderCounts.male, color: "#3b82f6" },
    { name: "Other", value: genderCounts.other, color: "#8b5cf6" },
    { name: "Unknown", value: genderCounts.unknown, color: "#94a3b8" },
  ].filter((g) => g.value > 0);

  const ageBands = Object.entries(ageBandCounts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  // Conditions
  let conditions: { name: string; value: number }[] = [];
  try {
    const ctxs = await MedicalContext.find({
      patientId: { $in: patientIds },
    })
      .select("chronicConditions")
      .lean();
    const condMap: Record<string, number> = {};
    for (const c of ctxs as any[]) {
      for (const cond of c.chronicConditions || []) {
        if (!cond) continue;
        condMap[cond] = (condMap[cond] || 0) + 1;
      }
    }
    conditions = Object.entries(condMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  } catch {
    /* optional */
  }

  // Top reasons
  const reasonMap: Record<string, number> = {};
  for (const c of allConsults as any[]) {
    const r = (c.chiefComplaint || "").trim();
    if (!r) continue;
    reasonMap[r] = (reasonMap[r] || 0) + 1;
  }
  const topReasons = Object.entries(reasonMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Prescriptions in period
  let prescriptionsIssued = 0;
  try {
    prescriptionsIssued = await Prescription.countDocuments({
      ...match,
      prescribedDate: { $gte: since },
    });
  } catch {
    /* */
  }

  // Earnings
  let earningsZar = 0;
  try {
    const payAgg = await PaymentTransaction.aggregate([
      {
        $match: {
          practitionerId: practitionerOid,
          status: "completed",
          timestamp: { $gte: since },
        },
      },
      {
        $group: {
          _id: null,
          earnings: {
            $sum: {
              $ifNull: ["$practitionerEarnings", "$amount"],
            },
          },
        },
      },
    ]);
    earningsZar = Math.round(payAgg[0]?.earnings || 0);
  } catch {
    /* */
  }

  // Reviews
  let rating = profile?.rating ?? 0;
  let reviewCount = profile?.reviewCount ?? 0;
  try {
    const revAgg = await Review.aggregate([
      { $match: { practitionerId: practitionerOid } },
      {
        $group: {
          _id: null,
          avg: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);
    if (revAgg[0]?.count) {
      rating = Math.round((revAgg[0].avg || 0) * 10) / 10;
      reviewCount = revAgg[0].count;
    }
  } catch {
    /* */
  }

  const avgCallMinutes =
    callMinutesN > 0 ? Math.round(callMinutesSum / callMinutesN) : 0;
  const highRiskPercent =
    totalPatients > 0
      ? Math.round((highRiskPatients / totalPatients) * 100)
      : 0;

  const intelligence = buildIntelligence({
    totalPatients,
    periodConsults,
    adherencePercent,
    noShowPercent,
    highRiskPatients,
    highRiskPercent,
    soapCompletionPercent,
    videoPercent,
    avgRiskScore,
    peakDay:
      busiestDay && busiestDay.count > 0 ? busiestDay.day : undefined,
    peakHour:
      busiestHour && busiestHour.count > 0 ? busiestHour.hour : undefined,
    topCondition: conditions[0]?.name,
    topReason: topReasons[0]?.name,
    rating,
    prescriptionsIssued,
    periodDays: days,
  });

  return {
    periodDays: days,
    generatedAt: new Date().toISOString(),
    practitioner: {
      name,
      firstName,
      lastName,
      specialisation: profile?.specialisation || "General Practitioner",
      hpcsaNumber: profile?.hpcsaNumber || "—",
      experienceYears: profile?.experienceYears ?? null,
      rating,
      reviewCount,
      languages: profile?.languages || [],
      acceptedMedicalAids: profile?.acceptedMedicalAids || [],
      city: profile?.address?.city,
      province: profile?.address?.province,
      isOnline: !!profile?.isOnline,
      bio: profile?.bio,
    },
    kpis: {
      totalPatients,
      totalConsults,
      periodConsults,
      completedPeriod,
      adherencePercent,
      noShowPercent,
      avgRiskScore,
      highRiskPatients,
      soapCompletionPercent,
      prescriptionsIssued,
      avgCallMinutes,
      earningsZar,
      rating,
      reviewCount,
    },
    riskDist,
    consultTrend,
    typeMix,
    statusBreakdown,
    peakHours,
    peakDays,
    genderDist,
    ageBands,
    conditions,
    topReasons,
    intelligence,
    teleclinic: {
      videoPercent,
      chatPercent,
      inPersonPercent,
      totalCallMinutes: callMinutesSum,
      avgMinutesPerConsult: avgCallMinutes,
      periodLabel: `Last ${days} days`,
    },
    totalPatients,
    totalPatientsInRiskDist: totalPatients,
    totalConsults,
    adherencePercent,
  };
}
