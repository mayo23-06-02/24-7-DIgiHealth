"use client";

import React, { useState, useEffect, useCallback } from "react";
import Card from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import RiskScoreCard from "@/components/dashboard/practitioner/RiskScoreCard";
import SoapNoteModal from "@/components/dashboard/practitioner/SoapNoteModal";
import {
  BiSearch,
  BiLoaderAlt,
  BiNote,
  BiChevronDown,
  BiChevronUp,
  BiVideo,
  BiChat,
  BiClinic,
  BiDownload,
} from "react-icons/bi";

const TYPE_ICON: Record<string, React.ReactNode> = {
  video: <BiVideo className="text-emerald-500" size={14} />,
  chat: <BiChat className="text-blue-500" size={14} />,
  "in-person": <BiClinic className="text-slate-400" size={14} />,
};

export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [soapModal, setSoapModal] = useState({
    isOpen: false,
    consultationId: "",
    patientName: "",
  });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const fetchConsultations = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/practitioner/appointments?tab=past${search ? `&search=${encodeURIComponent(search)}` : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setConsultations(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  const paginated = consultations.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const totalPages = Math.ceil(consultations.length / PAGE_SIZE);

  const hasSoap = (c: any) =>
    c.soapNotes && Object.values(c.soapNotes).some(Boolean);

  return (
    <div className="w-full pb-10 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 font-grotesk">Consultations</h1>
          <p className="text-sm text-slate-500">
            History of completed consultations with SOAP notes and clinical data
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <BiSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
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

      <Card className="flex flex-col p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <BiLoaderAlt className="animate-spin text-primary text-3xl" />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {paginated.map((c, i) => (
              <div key={i}>
                {/* Row */}
                <div className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <Avatar name={c.patientName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800">
                      {c.patientName}
                    </p>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                      {c.reason || "General consultation"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                    {TYPE_ICON[c.type] || TYPE_ICON["in-person"]}
                    <span className="capitalize">{c.type}</span>
                  </div>
                  <div className="text-xs text-slate-500 shrink-0 hidden md:block">
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
                      color={c.riskColor || "green"}
                      size="sm"
                      showRing={false}
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() =>
                        setSoapModal({
                          isOpen: true,
                          consultationId: c.consultationId,
                          patientName: c.patientName,
                        })
                      }
                      className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-100 transition-colors"
                      title="SOAP Notes"
                    >
                      <BiNote size={14} />
                    </button>
                    <button
                      onClick={() =>
                        setExpanded(expanded === c.id ? null : c.id)
                      }
                      className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors"
                    >
                      {expanded === c.id ? (
                        <BiChevronUp size={16} />
                      ) : (
                        <BiChevronDown size={16} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Detail */}
                {expanded === c.id && (
                  <div className="px-5 pb-5 bg-slate-50 border-t border-slate-100">
                    <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {hasSoap(c) ? (
                        [
                          {
                            key: "subjective",
                            label: "S – Subjective",
                            color: "text-primary",
                          },
                          {
                            key: "objective",
                            label: "O – Objective",
                            color: "text-cyan-600",
                          },
                          {
                            key: "assessment",
                            label: "A – Assessment",
                            color: "text-purple-600",
                          },
                          {
                            key: "plan",
                            label: "P – Plan",
                            color: "text-emerald-600",
                          },
                        ].map(({ key, label, color }) =>
                          c.soapNotes?.[key] ? (
                            <div
                              key={key}
                              className="bg-white rounded-xl p-4 border border-slate-100 shadow-none"
                            >
                              <p
                                className={`text-xs font-bold  tracking-wide mb-1.5 ${color}`}
                              >
                                {label}
                              </p>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {c.soapNotes[key]}
                              </p>
                            </div>
                          ) : null,
                        )
                      ) : (
                        <div className="col-span-2 text-xs text-slate-400 py-4 text-center">
                          No SOAP note recorded for this consultation.{" "}
                          <button
                            onClick={() =>
                              setSoapModal({
                                isOpen: true,
                                consultationId: c.consultationId,
                                patientName: c.patientName,
                              })
                            }
                            className="text-primary font-bold hover:underline"
                          >
                            Add note →
                          </button>
                        </div>
                      )}
                    </div>

                    {/* AI Recommendations */}
                    {c.aiRecommendations?.length > 0 && (
                      <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <p className="text-xs font-bold text-primary  tracking-wide mb-2">
                          AI Recommendations
                        </p>
                        <ul className="space-y-1">
                          {c.aiRecommendations.map(
                            (rec: string, ri: number) => (
                              <li
                                key={ri}
                                className="text-xs text-blue-700 flex items-start gap-1.5"
                              >
                                <span className="text-primary shrink-0 mt-0.5">
                                  →
                                </span>{" "}
                                {rec}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {paginated.length === 0 && !loading && (
              <div className="py-12 text-center text-slate-400">
                No past consultations found.
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

      <SoapNoteModal
        isOpen={soapModal.isOpen}
        onClose={() =>
          setSoapModal({ isOpen: false, consultationId: "", patientName: "" })
        }
        consultationId={soapModal.consultationId}
        patientName={soapModal.patientName}
      />
    </div>
  );
}
