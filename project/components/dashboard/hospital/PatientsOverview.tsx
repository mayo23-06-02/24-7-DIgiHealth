"use client";

import React from "react";
import { BiUser, BiCalendar } from "react-icons/bi";
import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import type { HospitalOverviewData } from "./types";
import type { BadgeStatus } from "@/components/ui/Badge";

const RISK_STATUS: Record<string, BadgeStatus> = {
  green: "success",
  gray: "neutral",
  orange: "warning",
  red: "error",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
  });
}

export default function PatientsOverview({
  patients,
  totalUnique,
}: {
  patients: HospitalOverviewData["patients"];
  totalUnique: number;
}) {
  return (
    <Card noPadding className="!rounded-lg flex flex-col min-h-[360px] !p-0">
      <div className="px-5 py-4 border-b border-slate-100">
        <SectionHeader
          compact
          icon={<BiUser />}
          title="Patients assigned"
          subtitle={`${totalUnique} unique · visits, risk & next appointment`}
        />
      </div>

      <div className="flex-1 overflow-auto max-h-[420px]">
        {patients.length === 0 ? (
          <EmptyState
            title="No patient appointments yet"
            description="Patients appear here once hospital appointments are booked."
            icon={<BiCalendar size={32} />}
            className="py-10"
          />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-2.5">Patient</th>
                    <th className="px-3 py-2.5">Visits</th>
                    <th className="px-3 py-2.5">Last</th>
                    <th className="px-3 py-2.5">Next</th>
                    <th className="px-3 py-2.5">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {patients.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <p className="text-sm font-bold text-slate-800">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate max-w-[160px]">
                          {p.lastDoctor || p.email || "—"}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold text-slate-700 tabular-nums">
                        {p.totalVisits}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {fmtDate(p.lastVisit)}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {fmtDate(p.nextVisit)}
                      </td>
                      <td className="px-3 py-3">
                        <Badge
                          label={String(p.riskScore)}
                          status={RISK_STATUS[p.riskBand] || "neutral"}
                          className="!text-xs !px-2 !py-1 tabular-nums"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="md:hidden divide-y divide-slate-50">
              {patients.map((p) => (
                <li key={p.id} className="px-4 py-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {p.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {p.totalVisits} visits · Last {fmtDate(p.lastVisit)}
                      </p>
                    </div>
                    <Badge
                      label={String(p.riskScore)}
                      status={RISK_STATUS[p.riskBand] || "neutral"}
                      className="!text-xs !px-2 !py-1"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Next: {fmtDate(p.nextVisit)}
                    {p.lastDoctor ? ` · ${p.lastDoctor}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}
