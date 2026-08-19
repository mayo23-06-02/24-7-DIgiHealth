"use client";

import React, { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { BadgeStatus } from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import { Clock, Loader2 } from "lucide-react";

interface SLAMetric {
  id: string;
  name: string;
  target: string;
  current: string;
  unit: string;
  status: "met" | "at_risk" | "breached";
  description: string;
}

const SLA_STATUS_MAP: Record<SLAMetric["status"], BadgeStatus> = {
  met: "success",
  at_risk: "warning",
  breached: "error",
};

const SLA_STATUS_LABEL: Record<SLAMetric["status"], string> = {
  met: "Met",
  at_risk: "At Risk",
  breached: "Breached",
};

function StatusBadge({ status }: { status: SLAMetric["status"] }) {
  return (
    <Badge
      label={SLA_STATUS_LABEL[status]}
      status={SLA_STATUS_MAP[status]}
      size="sm"
    />
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
        className={`h-full rounded-full transition-all duration-700 ${over ? "bg-rose-500" : pct > 85 ? "bg-gray-400" : "bg-emerald-500"}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

export default function HospitalSLAPage() {
  const [slas, setSlas] = useState<SLAMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/hospital/sla")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success) setSlas(json.data);
      })
      .catch((e) => console.error(e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const met = slas.filter((s) => s.status === "met").length;
  const breached = slas.filter((s) => s.status === "breached").length;
  const atRisk = slas.filter((s) => s.status === "at_risk").length;

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );

  return (
    <div className="w-full pb-10 flex flex-col gap-6">
      <div className="px-4 lg:px-0">
        <PageHeader
          title="Service Level Agreements"
          subtitle="Monitor and manage operational performance targets"
        />
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "SLAs Met", value: met, color: "emerald" },
          { label: "At Risk", value: atRisk, color: "gray" },
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
        <div className="lg:px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 font-grotesk">
            All SLA Targets
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {slas.map((sla) => (
            <div
              key={sla.id}
              className="lg:px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
            >
             
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1.5">
                  <p className="text-sm font-semibold text-slate-800">
                    {sla.name}
                  </p>
                  <StatusBadge status={sla.status} />
                </div>
                <p className="text-xs text-slate-500 mb-2">{sla.description}</p>
                <ProgressBar target={sla.target} current={sla.current} />
              </div>
              <div className="text-right shrink-0 w-28">
                <p className="text-sm font-bold text-slate-800">
                  {sla.current}{" "}
                  <span className="font-normal text-slate-500">{sla.unit}</span>
                </p>
                <p className="text-xs text-slate-500">
                  Target: {sla.target} {sla.unit}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
