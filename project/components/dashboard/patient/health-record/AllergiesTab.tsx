"use client";

import React from "react";
import { Filter as FilterIcon } from "lucide-react";
import Button from "@/components/ui/Button";
import type { Allergy } from "./types";

interface AllergiesTabProps {
  allergies: Allergy[];
  onAdd: () => void;
  onRemove: (id: string) => void;
}

export default function AllergiesTab({
  allergies,
  onAdd,
  onRemove,
}: AllergiesTabProps) {
  return (
    <div className="space-y-4 animate-dissolve">
      <div className="flex justify-end">
        <Button onClick={onAdd} className="text-sm font-bold">
          + Report Allergy
        </Button>
      </div>
      {allergies.length === 0 ? (
        <div className="text-center py-10 text-slate-500">
          No allergies recorded.
        </div>
      ) : (
        allergies.map((allergy) => (
          <div
            key={allergy.id}
            className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
          >
            <div className="flex items-center gap-5">
              <div
                className={`w-14 h-14 rounded-lg flex items-center justify-center shrink-0 ${
                  allergy.severity === "severe"
                    ? "bg-rose-50 text-rose-500"
                    : allergy.severity === "moderate"
                      ? "bg-amber-50 text-amber-500"
                      : "bg-slate-50 text-slate-500"
                }`}
              >
                <FilterIcon size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 font-grotesk">
                  {allergy.allergen}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {allergy.reaction}
                </p>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                  {allergy.severity} · {allergy.source}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => onRemove(allergy.id)}
              className="text-xs font-bold text-rose-500 hover:bg-rose-50"
            >
              Remove
            </Button>
          </div>
        ))
      )}
    </div>
  );
}
