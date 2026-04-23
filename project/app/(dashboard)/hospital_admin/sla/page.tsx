"use client";

import React, { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { BiTime, BiLoaderAlt, BiCheckCircle, BiErrorCircle, BiEditAlt } from "react-icons/bi";

interface SLAMetric {
  id: string;
  name: string;
  target: string;
  current: string;
  unit: string;
  status: "met" | "at_risk" | "breached";
  description: string;
}

const defaultSLAs: SLAMetric[] = [
  { id: "1", name: "Emergency Response Time", target: "< 8", current: "6.2", unit: "min", status: "met", description: "Time from emergency call to first responder contact" },
  { id: "2", name: "Outpatient Wait Time", target: "< 30", current: "34", unit: "min", status: "at_risk", description: "Average waiting time for outpatient consultations" },
  { id: "3", name: "Teleconsultation Connect", target: "< 2", current: "1.4", unit: "min", status: "met", description: "Time for a patient to connect with a practitioner" },
  { id: "4", name: "Lab Result Turnaround", target: "< 4", current: "5.1", unit: "hrs", status: "breached", description: "Time from sample collection to result delivery" },
  { id: "5", name: "Appointment Booking", target: "< 24", current: "19", unit: "hrs", status: "met", description: "Lead time to secure a booked appointment slot" },
  { id: "6", name: "Discharge Processing", target: "< 2", current: "1.8", unit: "hrs", status: "met", description: "Time to process and complete patient discharge" },
];

function StatusBadge({ status }: { status: SLAMetric["status"] }) {
  const cfg = {
    met: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Met", icon: <BiCheckCircle size={14} /> },
    at_risk: { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "At Risk", icon: <BiErrorCircle size={14} /> },
    breached: { cls: "bg-rose-50 text-rose-700 border-rose-200", label: "Breached", icon: <BiErrorCircle size={14} /> },
  }[status];
  return (
    <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg border ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function ProgressBar({ target, current }: { target: string; current: string }) {
  const t = parseFloat(target.replace("<", "").replace(">", "").trim());
  const c = parseFloat(current);
  const pct = Math.min((c / t) * 100, 120);
  const over = pct > 100;
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${over ? "bg-rose-500" : pct > 85 ? "bg-amber-400" : "bg-emerald-500"}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

export default function HospitalSLAPage() {
  const [slas] = useState<SLAMetric[]>(defaultSLAs);
  const [loading] = useState(false);

  const met = slas.filter((s) => s.status === "met").length;
  const breached = slas.filter((s) => s.status === "breached").length;
  const atRisk = slas.filter((s) => s.status === "at_risk").length;

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <BiLoaderAlt className="animate-spin text-primary text-4xl" />
      </div>
    );

  return (
    <div className="w-full pb-10 flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 font-grotesk">Service Level Agreements</h1>
        <p className="text-sm text-slate-500 mt-1">Monitor and manage operational performance targets</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "SLAs Met", value: met, color: "emerald" },
          { label: "At Risk", value: atRisk, color: "amber" },
          { label: "Breached", value: breached, color: "rose" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="text-center py-5">
            <p className={`text-3xl font-bold text-${color}-600`}>{value}</p>
            <p className="text-sm text-slate-500 mt-1">{label}</p>
          </Card>
        ))}
      </div>

      {/* SLA Table */}
      <Card className="overflow-hidden p-0">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 font-grotesk">All SLA Targets</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {slas.map((sla) => (
            <div key={sla.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <BiTime size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1.5">
                  <p className="text-sm font-semibold text-slate-800">{sla.name}</p>
                  <StatusBadge status={sla.status} />
                </div>
                <p className="text-xs text-slate-400 mb-2">{sla.description}</p>
                <ProgressBar target={sla.target} current={sla.current} />
              </div>
              <div className="text-right shrink-0 w-28">
                <p className="text-sm font-bold text-slate-800">{sla.current} <span className="font-normal text-slate-400">{sla.unit}</span></p>
                <p className="text-xs text-slate-400">Target: {sla.target} {sla.unit}</p>
              </div>
              <button className="text-slate-300 hover:text-primary transition-colors">
                <BiEditAlt size={18} />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
