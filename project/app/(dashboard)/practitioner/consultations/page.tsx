"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Card from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import KPICard from "@/components/ui/KPICard";
import RiskScoreCard from "@/components/dashboard/practitioner/RiskScoreCard";
import SoapNoteModal from "@/components/dashboard/practitioner/SoapNoteModal";
import {
  BiSearch,
  BiLoaderAlt,
  BiNote,
  BiVideo,
  BiChat,
  BiTime,
  BiCalendar,
  BiCheckCircle,
  BiFileBlank,
  BiPulse,
} from "react-icons/bi";

type SoapNotes = {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
};

type ConsultationRow = {
  id: string;
  consultationId: string;
  patientId: string;
  patientName: string;
  scheduledStart: string | Date;
  scheduledEnd: string | Date;
  durationMinutes?: number;
  callMinutesUsed?: number;
  status: string;
  type: string;
  reason?: string;
  riskScore?: number;
  riskColor?: string;
  soapNotes?: SoapNotes;
  aiRecommendations?: string[];
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  video: <BiVideo className="text-emerald-500" size={14} />,
  chat: <BiChat className="text-blue-500" size={14} />,
};

const SOAP_FIELDS: {
  key: keyof SoapNotes;
  label: string;
  color: string;
}[] = [
  { key: "subjective", label: "S – Subjective", color: "text-primary" },
  { key: "objective", label: "O – Objective", color: "text-cyan-600" },
  { key: "assessment", label: "A – Assessment", color: "text-purple-600" },
  { key: "plan", label: "P – Plan", color: "text-emerald-600" },
];

function hasSoap(notes?: SoapNotes) {
  return !!notes && Object.values(notes).some((v) => !!v && String(v).trim());
}

function formatDuration(mins?: number) {
  if (mins == null || mins <= 0) return "—";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function formatWhen(d: string | Date) {
  return new Date(d).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ConsultationRow | null>(null);
  const [soapModal, setSoapModal] = useState({
    isOpen: false,
    consultationId: "",
    patientName: "",
    existingNotes: undefined as SoapNotes | undefined,
  });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const fetchConsultations = useCallback(async () => {
    setLoading(true);
    try {
      // Only successful / honored (completed) appointments
      const url = `/api/practitioner/appointments?tab=completed${
        search ? `&search=${encodeURIComponent(search)}` : ""
      }`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        const rows = (json.data || []).filter(
          (c: ConsultationRow) => c.status === "completed",
        );
        setConsultations(rows);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const stats = useMemo(() => {
    const total = consultations.length;
    const withSoap = consultations.filter((c) => hasSoap(c.soapNotes)).length;
    const withoutSoap = total - withSoap;
    const avgDuration =
      total === 0
        ? 0
        : Math.round(
            consultations.reduce(
              (sum, c) => sum + (c.durationMinutes || c.callMinutesUsed || 0),
              0,
            ) / total,
          );
    return { total, withSoap, withoutSoap, avgDuration };
  }, [consultations]);

  const paginated = consultations.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const totalPages = Math.max(1, Math.ceil(consultations.length / PAGE_SIZE));

  const applySoapLocally = (consultationId: string, notes: SoapNotes) => {
    setConsultations((prev) =>
      prev.map((c) =>
        c.consultationId === consultationId || c.id === consultationId
          ? { ...c, soapNotes: notes }
          : c,
      ),
    );
    setSelected((prev) =>
      prev &&
      (prev.consultationId === consultationId || prev.id === consultationId)
        ? { ...prev, soapNotes: notes }
        : prev,
    );
  };

  const openSoap = (c: ConsultationRow) => {
    setSoapModal({
      isOpen: true,
      consultationId: c.consultationId || c.id,
      patientName: c.patientName,
      existingNotes: c.soapNotes,
    });
  };

  return (
    <div className="w-full pb-10 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 font-grotesk">
            Consultations
          </h1>
          <p className="text-sm text-slate-500">
            Successful (honored) consultations — review details and SOAP notes
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <BiSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            size={16}
          />
          <input
            type="text"
            placeholder="Search by patient name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* KPI stats — 2 cols on sm, 4 on lg */}
      <div className="grid grid-cols-2  lg:grid-cols-4 gap-2 sm:gap-3">
        <KPICard
          label="Completed"
          value={stats.total}
          description="Honored consultations"
          icon={<BiCheckCircle size={24} />}
          color="primary"
        />
        <KPICard
          label="With SOAP"
          value={stats.withSoap}
          description="Notes documented"
          icon={<BiNote size={24} />}
          color="emerald"
        />
        <KPICard
          label="Missing SOAP"
          value={stats.withoutSoap}
          description="Need clinical notes"
          icon={<BiFileBlank size={24} />}
          color="red"
        />
        <KPICard
          label="Avg duration"
          value={stats.avgDuration || "—"}
          unit={stats.avgDuration ? "min" : undefined}
          description="Per completed session"
          icon={<BiTime size={24} />}
          color="slate"
        />
      </div>

      <Card className="flex flex-col p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <BiLoaderAlt className="animate-spin text-primary text-3xl" />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {paginated.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => setSelected(c)}
              >
                <Avatar name={c.patientName} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">
                    {c.patientName}
                  </p>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                    {c.reason || "General consultation"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                  {TYPE_ICON[c.type] || TYPE_ICON.video}
                  <span className="capitalize hidden sm:inline">
                    {c.type || "Telehealth"}
                  </span>
                </div>
                <div className="text-xs text-slate-500 shrink-0 hidden md:flex items-center gap-1">
                  <BiTime size={12} />
                  {formatDuration(c.durationMinutes || c.callMinutesUsed)}
                </div>
                <div className="text-xs text-slate-500 shrink-0 hidden lg:block">
                  {c.scheduledStart
                    ? new Date(c.scheduledStart).toLocaleDateString("en-ZA", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </div>
                <div className="shrink-0">
                  <RiskScoreCard
                    score={c.riskScore || 0}
                    color={(c.riskColor as any) || "green"}
                    size="sm"
                    showRing={false}
                  />
                </div>
                <div
                  className="flex items-center gap-2 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => openSoap(c)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      hasSoap(c.soapNotes)
                        ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        : "bg-purple-50 text-purple-600 hover:bg-purple-100"
                    }`}
                    title={hasSoap(c.soapNotes) ? "Edit SOAP notes" : "Add SOAP notes"}
                  >
                    <BiNote size={14} />
                  </button>
                </div>
              </div>
            ))}
            {paginated.length === 0 && !loading && (
              <div className="py-12 text-center text-slate-500">
                No completed consultations found.
              </div>
            )}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-500">
              {consultations.length} records
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors"
              >
                ←
              </button>
              <span className="px-3 py-1 text-sm text-slate-600">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors"
              >
                →
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Patient / consultation detail modal */}
      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? selected.patientName : "Consultation"}
        width="lg"
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <Avatar name={selected.patientName} size="lg" />
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-slate-800 font-grotesk">
                  {selected.patientName}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {selected.reason || "General consultation"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700">
                    <BiCheckCircle size={12} /> {selected.status}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-600 capitalize">
                    {TYPE_ICON[selected.type] || TYPE_ICON.video}
                    {selected.type || "Telehealth"}
                  </span>
                </div>
              </div>
              <RiskScoreCard
                score={selected.riskScore || 0}
                color={(selected.riskColor as any) || "green"}
                size="sm"
                showRing={false}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <BiCalendar size={12} /> Start
                </p>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {formatWhen(selected.scheduledStart)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <BiCalendar size={12} /> End
                </p>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {formatWhen(selected.scheduledEnd)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-primary/5 p-3 sm:col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                  <BiTime size={12} /> Duration
                </p>
                <p className="text-lg font-bold text-slate-900 mt-1 font-grotesk">
                  {formatDuration(
                    selected.durationMinutes || selected.callMinutesUsed,
                  )}
                  {selected.callMinutesUsed ? (
                    <span className="text-xs font-medium text-slate-500 ml-2">
                      ({selected.callMinutesUsed} min on call)
                    </span>
                  ) : null}
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-800 font-grotesk">
                  SOAP notes
                </h4>
                <Button
                  size="sm"
                  onClick={() => openSoap(selected)}
                  icon={<BiNote size={14} />}
                >
                  {hasSoap(selected.soapNotes) ? "Edit notes" : "Add notes"}
                </Button>
              </div>

              {hasSoap(selected.soapNotes) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SOAP_FIELDS.map(({ key, label, color }) =>
                    selected.soapNotes?.[key] ? (
                      <div
                        key={key}
                        className="bg-white rounded-lg p-4 border border-slate-100"
                      >
                        <p
                          className={`text-xs font-bold tracking-wide mb-1.5 ${color}`}
                        >
                          {label}
                        </p>
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                          {selected.soapNotes[key]}
                        </p>
                      </div>
                    ) : null,
                  )}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                  <BiNote className="mx-auto text-slate-300 mb-2" size={28} />
                  <p className="text-sm text-slate-500">
                    No SOAP notes yet for this consultation.
                  </p>
                  <button
                    type="button"
                    onClick={() => openSoap(selected)}
                    className="mt-2 text-sm font-bold text-primary hover:underline"
                  >
                    Add SOAP note →
                  </button>
                </div>
              )}
            </div>

            {selected.aiRecommendations &&
              selected.aiRecommendations.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <p className="text-xs font-bold text-primary tracking-wide mb-2 flex items-center gap-1">
                    <BiPulse size={12} /> AI Recommendations
                  </p>
                  <ul className="space-y-1">
                    {selected.aiRecommendations.map((rec, ri) => (
                      <li
                        key={ri}
                        className="text-xs text-blue-700 flex items-start gap-1.5"
                      >
                        <span className="text-primary shrink-0 mt-0.5">→</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <SoapNoteModal
        isOpen={soapModal.isOpen}
        onClose={() =>
          setSoapModal({
            isOpen: false,
            consultationId: "",
            patientName: "",
            existingNotes: undefined,
          })
        }
        consultationId={soapModal.consultationId}
        patientName={soapModal.patientName}
        existingNotes={soapModal.existingNotes}
        onSaved={(notes) => {
          if (soapModal.consultationId) {
            applySoapLocally(soapModal.consultationId, notes);
          }
        }}
      />
    </div>
  );
}
