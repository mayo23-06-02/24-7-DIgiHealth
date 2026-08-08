"use client";

import React from "react";
import { FileText } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { formatHealthDate, type LabResult } from "./types";

export default function LabsTab({ labs }: { labs: LabResult[] }) {
  if (labs.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500">
        No laboratory results on record.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-dissolve">
      {labs.map((lab) => (
        <Card key={lab.id}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-800 font-grotesk">
                {lab.name}
              </h3>
              <p className="text-sm text-slate-500">
                Reported on {formatHealthDate(lab.date)} · Ordered by{" "}
                {lab.orderedBy}
              </p>
            </div>
            <Button
              variant="white"
              className="flex items-center gap-2 font-bold text-sm bg-slate-50 border-none hover:bg-primary hover:text-white"
            >
              <FileText size={20} /> Full Lab Report
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lab.values.map((v, i) => (
              <div
                key={i}
                className="bg-slate-50/50 border border-slate-100 p-4 rounded-lg"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-slate-500 tracking-normal">
                    {v.parameter}
                  </span>
                  {v.status === "normal" ? (
                    <Badge label="NORMAL" status="success" size="sm" />
                  ) : (
                    <Badge label="ABNORMAL" status="error" size="sm" />
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-slate-800">
                    {v.value}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {v.unit}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2 font-medium">
                  Ref: {v.referenceRange}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
