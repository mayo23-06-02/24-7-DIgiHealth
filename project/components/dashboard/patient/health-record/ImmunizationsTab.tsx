"use client";

import React from "react";
import { Syringe } from "lucide-react";
import { formatHealthDate, type Immunization } from "./types";

export default function ImmunizationsTab({
  immunizations,
}: {
  immunizations: Immunization[];
}) {
  if (immunizations.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500">
        No immunization records found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-dissolve">
      {immunizations.map((imm) => (
        <div
          key={imm.id}
          className="bg-white border border-slate-200 rounded-lg p-5 flex gap-4"
        >
          <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Syringe size={22} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-800 font-grotesk">
              {imm.vaccine}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {formatHealthDate(imm.date)} · {imm.dose}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
              Batch {imm.batch} · {imm.administeredBy}
            </p>
            <p className="text-xs text-primary font-semibold mt-2">
              Next due: {imm.nextDue ? formatHealthDate(imm.nextDue) : "—"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
