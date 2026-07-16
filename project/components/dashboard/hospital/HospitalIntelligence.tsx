"use client";

import React from "react";
import { BiBulb } from "react-icons/bi";
import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import Badge from "@/components/ui/Badge";
import type { BadgeStatus } from "@/components/ui/Badge";
import type { HospitalOverviewData } from "./types";

const SEV_BADGE: Record<string, BadgeStatus> = {
  critical: "error",
  warning: "warning",
  success: "success",
  info: "info",
};

const SEV_WRAP: Record<string, string> = {
  critical: "border-red-100 bg-red-50/80",
  warning: "border-amber-100 bg-amber-50/80",
  success: "border-emerald-100 bg-emerald-50/60",
  info: "border-sky-100 bg-sky-50/60",
};

export default function HospitalIntelligence({
  items,
}: {
  items: HospitalOverviewData["intelligence"];
}) {
  if (!items?.length) return null;

  return (
    <Card className="!rounded-lg">
      <SectionHeader
        compact
        icon={<BiBulb />}
        title="Operational intelligence"
        subtitle="Coverage, capacity, and patient risk signals"
        className="mb-4"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-lg border p-3.5 ${
              SEV_WRAP[item.severity] || SEV_WRAP.info
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <p className="text-sm font-bold text-slate-800">{item.title}</p>
              <div className="flex items-center gap-1.5 shrink-0">
                {item.metric && (
                  <Badge
                    label={item.metric}
                    status="neutral"
                    className="!text-[10px] !px-2 !py-1 !bg-white/80"
                  />
                )}
                <Badge
                  label={item.severity}
                  status={SEV_BADGE[item.severity] || "info"}
                  className="!text-[10px] !px-2 !py-1 capitalize"
                />
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {item.detail}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
