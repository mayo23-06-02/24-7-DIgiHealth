"use client";

import React from "react";
import { BiError, BiChevronRight } from "react-icons/bi";
import RiskScoreCard from "./RiskScoreCard";

interface RiskAlert {
  consultationId: string;
  patientName: string;
  score: number;
  color: "green" | "gray" | "red";
  condition: string;
  factors: string[];
}

interface RiskAlertsBannerProps {
  alerts: RiskAlert[];
  onViewQueue?: () => void;
}

import Button from "@/components/ui/Button";

export default function RiskAlertsBanner({
  alerts,
  onViewQueue,
}: RiskAlertsBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-100 rounded-2xl p-4 shrink-0 shadow-none relative overflow-hidden group">
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-rose-500 rounded-xl flex items-center justify-center shadow-none shadow-rose-200">
            <BiError className="text-white" size={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800  tracking-normal">
              {alerts.length} High-Risk{" "}
              {alerts.length === 1 ? "Patient" : "Patients"}
            </p>
            <p className="text-sm text-rose-500 font-bold  tracking-normal mt-0.5 animate-pulse">
              Clinical attention Required
            </p>
          </div>
        </div>
        {onViewQueue && (
          <Button
            variant="ghost"
            onClick={onViewQueue}
            className="flex items-center gap-1 text-sm font-bold text-rose-600 hover:bg-rose-100/50 rounded-full py-1.5 px-3 h-auto !min-w-0 border-none bg-transparent  tracking-normal shadow-none"
          >
            View Queue <BiChevronRight size={14} />
          </Button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {alerts.map((alert) => (
          <div
            key={alert.consultationId}
            className="bg-white rounded-xl border border-red-100 p-3 shrink-0 min-w-[180px] shadow-none hover: transition-shadow"
          >
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-bold text-slate-800 truncate max-w-[100px]">
                {alert.patientName}
              </p>
              <RiskScoreCard
                score={alert.score}
                color={alert.color}
                size="sm"
                showRing={false}
              />
            </div>
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
              {alert.condition}
            </p>
            {alert.factors.length > 0 && (
              <p className="text-[9px] text-red-500 mt-1.5 font-semibold truncate">
                ⚑ {alert.factors[0]}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
