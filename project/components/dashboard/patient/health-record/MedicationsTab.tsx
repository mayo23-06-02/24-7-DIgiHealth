"use client";

import React from "react";
import { Download, Pill } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { formatHealthDate, type Medication } from "./types";

interface MedicationsTabProps {
  medications: Medication[];
  onRequestRefill: (med: Medication) => void;
}

export default function MedicationsTab({
  medications,
  onRequestRefill,
}: MedicationsTabProps) {
  if (medications.length === 0) {
    return (
      <div className="col-span-full text-center py-10 text-slate-500">
        No prescribed medications found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-dissolve">
      {medications.map((med) => (
        <div
          key={med.id}
          className="bg-white border border-slate-200 rounded-lg p-6 border-l-4 border-l-supportive-teal"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center text-supportive-teal">
              <Pill size={24} />
            </div>
            <Badge
              label={med.status}
              status={med.status === "active" ? "success" : "neutral"}
              size="sm"
            />
          </div>
          <h3 className="text-lg font-bold text-slate-800 font-grotesk">
            {med.name}
          </h3>
          <p className="text-sm font-semibold text-primary mb-2">{med.dosage}</p>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed italic">
            &quot;{med.instructions}&quot;
          </p>
          <div className="flex flex-wrap justify-between items-center gap-2 pt-4 border-t border-slate-50">
            <span className="text-xs text-slate-500">
              Prescribed {formatHealthDate(med.prescribedDate)}
            </span>
            <div className="flex items-center gap-3">
              {(med.canDownload || med.documentUrl) && med.documentUrl ? (
                <a
                  href={med.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={med.documentName || undefined}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  <Download size={14} /> Pharmacy script
                </a>
              ) : (
                <span className="text-[10px] text-slate-400 font-medium">
                  No script file
                </span>
              )}
              {med.refillsLeft > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => onRequestRefill(med)}
                  className="!p-0 !min-w-0 !h-auto text-xs font-bold text-primary hover:underline bg-transparent"
                >
                  Request Refill ({med.refillsLeft} left)
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
