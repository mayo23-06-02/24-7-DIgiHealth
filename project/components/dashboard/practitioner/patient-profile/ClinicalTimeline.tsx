"use client";

import React from "react";
import Card from "@/components/ui/Card";
import RiskScoreCard from "@/components/dashboard/practitioner/RiskScoreCard";
import { BiClinic, BiNote, BiPlus, BiTime, BiVideo } from "react-icons/bi";
import type { PatientConsultation } from "./types";

interface ClinicalTimelineProps {
  consultations: PatientConsultation[];
  patientName: string;
  expandedId: string | null;
  onToggle: (id: string) => void;
  onOpenSoap: (consultationId: string, patientName: string) => void;
}

export default function ClinicalTimeline({
  consultations,
  patientName,
  expandedId,
  onToggle,
  onOpenSoap,
}: ClinicalTimelineProps) {
  return (
    <Card noPadding>
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-800 font-grotesk">
            Clinical Timeline
          </h3>
          <p className="text-xs text-slate-500 font-bold tracking-normal mt-0.5">
            Historical Consultations & Outcomes
          </p>
        </div>
        <button
          type="button"
          className="text-primary hover:bg-primary/5 p-2 rounded-lg transition-all"
        >
          <BiPlus size={24} />
        </button>
      </div>

      <div className="divide-y divide-slate-50">
        {consultations.length === 0 ? (
          <div className="py-20 text-center">
            <BiClinic className="mx-auto text-slate-200 mb-4" size={48} />
            <p className="text-sm font-bold text-slate-500">
              No consultation history available.
            </p>
          </div>
        ) : (
          consultations.map((c) => (
            <div key={c.id} className="group">
              <div
                className="px-6 py-5 flex items-center gap-6 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => onToggle(c.id)}
              >
                <div className="w-16 flex flex-col gap-1.5 items-center shrink-0 text-center">
                  <p className="text-xs font-bold text-slate-800">
                    {c.scheduledStartTime
                      ? new Date(c.scheduledStartTime).toLocaleDateString(
                          "en-ZA",
                          { day: "2-digit", month: "short" },
                        )
                      : "N/A"}
                  </p>
                  <p className="text-xs font-bold text-slate-500">
                    {c.scheduledStartTime
                      ? new Date(c.scheduledStartTime).getFullYear()
                      : ""}
                  </p>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex pb-2 items-center gap-2">
                    <h4 className="font-bold text-slate-800 text-sm truncate font-grotesk">
                      {c.chiefComplaint || "No complaint recorded"}
                    </h4>
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-bold tracking-tighter ${
                        c.status === "completed"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                      <BiVideo className="text-primary" />
                      <p>{c.type} Session</p>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-slate-200" />
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                      <BiTime />
                      <p>30 Minutes</p>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-4">
                  <RiskScoreCard
                    score={c.riskScore}
                    color={c.riskColor}
                    size="sm"
                    showRing={false}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSoap(c.id, patientName);
                    }}
                    className="w-10 h-10 rounded-lg bg-white border border-slate-100 text-slate-500 hover:text-primary hover:border-primary/20 transition-all flex items-center justify-center"
                  >
                    <BiNote size={18} />
                  </button>
                </div>
              </div>

              {expandedId === c.id && c.soapNotes && (
                <div className="px-6 pb-6 bg-slate-50/50 pt-2 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                  {(
                    [
                      ["Subjective", "subjective", "text-primary"],
                      ["Objective", "objective", "text-cyan-600"],
                      ["Assessment", "assessment", "text-purple-600"],
                      ["Plan", "plan", "text-emerald-600"],
                    ] as const
                  ).map(([label, key, color]) => (
                    <div
                      key={key}
                      className="bg-white p-4 rounded-lg border border-slate-100"
                    >
                      <p
                        className={`text-xs font-bold ${color} tracking-normal mb-2`}
                      >
                        {label}
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {c.soapNotes?.[key] || "No notes."}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
