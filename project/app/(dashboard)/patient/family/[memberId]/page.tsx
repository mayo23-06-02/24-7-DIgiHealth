"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Pill,
  FlaskConical,
  Syringe,
  Ruler,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge, { BadgeStatus } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import Alert from "@/components/ui/Alert";
import { useFamilyMembers } from "@/lib/family/FamilyMemberContext";

interface AppointmentRow {
  id: string;
  practitionerName: string;
  scheduledStart: string;
  scheduledEnd: string;
  type: string;
  status: string;
}

interface HealthRecordData {
  vitals: { date: string; weight?: number; systolicBP?: number; diastolicBP?: number; heartRate?: number }[];
  labs: { id: string; name: string; date: string }[];
  medications: { id: string; name: string; dosage: string; status: string }[];
  allergies: string[];
  immunizations: { id: string; vaccine: string; date: string }[];
}

const STATUS_BADGE: Record<string, BadgeStatus> = {
  scheduled: "info",
  confirmed: "info",
  completed: "success",
  cancelled: "neutral",
  no_show: "error",
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });

export default function ManageFamilyMemberPage() {
  const params = useParams<{ memberId: string }>();
  const router = useRouter();
  const { members, setActiveMemberId } = useFamilyMembers();
  const member = members.find((m) => m.id === params.memberId) || null;

  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [healthRecord, setHealthRecord] = useState<HealthRecordData | null>(null);
  const [healthRecordError, setHealthRecordError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Keep the switcher's "active member" state in sync when this page is
    // reached directly (deep link, refresh) rather than via the switcher.
    setActiveMemberId(params.memberId);
  }, [params.memberId, setActiveMemberId]);

  const load = useCallback(async () => {
    setIsLoading(true);
    const [apptRes, recordRes] = await Promise.all([
      fetch(`/api/patient/family/${params.memberId}/appointments`),
      fetch(`/api/patient/family/${params.memberId}/health-record`),
    ]);
    const apptJson = await apptRes.json().catch(() => null);
    if (apptRes.ok && apptJson?.success) setAppointments(apptJson.data);

    const recordJson = await recordRes.json().catch(() => null);
    if (recordRes.ok && recordJson?.success) {
      setHealthRecord(recordJson.data);
    } else {
      setHealthRecordError(recordJson?.error || "");
    }
    setIsLoading(false);
  }, [params.memberId]);

  useEffect(() => {
    load();
  }, [load]);

  const backToMyAccount = () => {
    setActiveMemberId(null);
    router.push("/patient");
  };

  const latestVitals = healthRecord?.vitals?.[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-400">
      <button
        onClick={backToMyAccount}
        className="flex items-center gap-2 text-sm font-semibold text-ink-600 hover:text-primary transition-colors"
      >
        <ArrowLeft size={16} />
        Back to my account
      </button>

      <Card className="flex flex-wrap items-center gap-4">
        <Avatar name={member?.name || "Family member"} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-h2 font-bold text-ink-900 font-grotesk">
              {member?.name || "Family member"}
            </h1>
            {member && <Badge label={member.relationship} status="neutral" size="sm" className="capitalize" />}
            {member?.isMinor && <Badge label="Minor" status="info" size="sm" />}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            You're viewing and managing this account on their behalf.
          </p>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center gap-2 mb-5">
              <Calendar size={18} className="text-primary" />
              <h2 className="text-h3 font-bold text-ink-900 font-grotesk">Appointments</h2>
            </div>
            {appointments.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No appointments yet.</p>
            ) : (
              <div className="space-y-3">
                {appointments.slice(0, 8).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ink-900 truncate">{a.practitionerName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {fmtDate(a.scheduledStart)} · {a.type}
                      </p>
                    </div>
                    <Badge
                      label={a.status.replace("_", " ")}
                      status={STATUS_BADGE[a.status] || "neutral"}
                      size="sm"
                      className="capitalize shrink-0"
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-5">
              <ShieldCheck size={18} className="text-primary" />
              <h2 className="text-h3 font-bold text-ink-900 font-grotesk">Medical summary</h2>
            </div>

            {!healthRecord ? (
              <Alert status="info" title="Medical history is private">
                {healthRecordError ||
                  `${member?.name || "This family member"}'s medical history is only visible to a guardian while they're flagged as a minor.`}
              </Alert>
            ) : (
              <div className="space-y-4">
                {latestVitals && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-soft">
                    <Ruler size={16} className="text-primary shrink-0" />
                    <div className="text-xs text-ink-600">
                      <span className="font-semibold">Latest vitals ({latestVitals.date}):</span>{" "}
                      {latestVitals.weight ? `${latestVitals.weight}kg` : ""}
                      {latestVitals.systolicBP ? ` · ${latestVitals.systolicBP}/${latestVitals.diastolicBP} mmHg` : ""}
                      {latestVitals.heartRate ? ` · ${latestVitals.heartRate} bpm` : ""}
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Pill size={16} className="text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-400 mb-1">
                      Medications ({healthRecord.medications.length})
                    </p>
                    {healthRecord.medications.length === 0 ? (
                      <p className="text-sm text-slate-500">None on record</p>
                    ) : (
                      <p className="text-sm text-ink-600">
                        {healthRecord.medications.map((m) => m.name).join(", ")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FlaskConical size={16} className="text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-400 mb-1">
                      Allergies ({healthRecord.allergies.length})
                    </p>
                    {healthRecord.allergies.length === 0 ? (
                      <p className="text-sm text-slate-500">None on record</p>
                    ) : (
                      <p className="text-sm text-ink-600">{healthRecord.allergies.join(", ")}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Syringe size={16} className="text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-400 mb-1">
                      Immunizations ({healthRecord.immunizations.length})
                    </p>
                    {healthRecord.immunizations.length === 0 ? (
                      <p className="text-sm text-slate-500">None on record</p>
                    ) : (
                      <p className="text-sm text-ink-600">
                        {healthRecord.immunizations.map((i) => i.vaccine).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="ghost" onClick={backToMyAccount}>
          Done managing {member?.name?.split(" ")[0] || "this account"}
        </Button>
      </div>
    </div>
  );
}
