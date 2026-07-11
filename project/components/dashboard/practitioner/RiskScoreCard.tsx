"use client";

import React from "react";
import {
  clampRiskScore,
  riskBandFromScore,
  riskBandStyle,
  type RiskBand,
} from "@/lib/riskScore";

interface RiskScoreCardProps {
  score: number;
  /** @deprecated Prefer score — band is derived from score. Kept for call-site compatibility. */
  color?: RiskBand | "green" | "gray" | "red" | string;
  factors?: string[];
  size?: "sm" | "md" | "lg";
  showRing?: boolean;
}

/** Soft UI tokens per band (ring stroke uses solid brand hex from riskBandStyle). */
const BAND_UI: Record<
  RiskBand,
  { bg: string; text: string; border: string; track: string; glow: string }
> = {
  green: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    track: "#dcfce7",
    glow: "shadow-emerald-200",
  },
  gray: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    track: "#e2e8f0",
    glow: "shadow-slate-200",
  },
  orange: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    track: "#ffedd5",
    glow: "shadow-orange-200",
  },
  red: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    track: "#fee2e2",
    glow: "shadow-red-200",
  },
};

export default function RiskScoreCard({
  score,
  factors = [],
  size = "md",
  showRing = true,
}: RiskScoreCardProps) {
  const value = clampRiskScore(score);
  const band = riskBandFromScore(value);
  const style = riskBandStyle(value);
  const ui = BAND_UI[band];
  const radius = size === "sm" ? 20 : size === "lg" ? 36 : 28;
  const strokeWidth = size === "sm" ? 4 : 5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const svgSize = (radius + strokeWidth + 2) * 2;
  const textSize =
    size === "sm" ? "text-xs" : size === "lg" ? "text-2xl" : "text-base";

  return (
    <div className="relative group">
      <div
        className={`
          inline-flex items-center gap-2 px-2 py-1 rounded-full border font-semibold
          ${ui.bg} ${ui.text} ${ui.border}
          ${size === "sm" ? "text-xs" : "text-sm"}
          cursor-default transition-all duration-200
          hover:shadow-md ${ui.glow}
        `}
        title={style.label}
      >
        {showRing && (
          <svg
            width={svgSize}
            height={svgSize}
            viewBox={`0 0 ${svgSize} ${svgSize}`}
            className="rotate-[-90deg]"
            aria-hidden
          >
            <circle
              cx={svgSize / 2}
              cy={svgSize / 2}
              r={radius}
              fill="none"
              stroke={ui.track}
              strokeWidth={strokeWidth}
            />
            <circle
              cx={svgSize / 2}
              cy={svgSize / 2}
              r={radius}
              fill="none"
              stroke={style.bg}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-[stroke-dashoffset] duration-[0.8s] ease-[cubic-bezier(0.16,1,0.3,1)]"
            />
          </svg>
        )}
        <span className={`font-bold tabular-nums ${textSize}`}>{value}</span>
        {size !== "sm" && (
          <span className="opacity-70 font-medium">{style.label}</span>
        )}
      </div>

      {factors.length > 0 && (
        <div
          className="
            absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 z-50
            bg-slate-900 text-white text-xs rounded-lg p-3
            opacity-0 group-hover:opacity-100 pointer-events-none
            transition-all duration-300 scale-95 group-hover:scale-100
            origin-bottom
          "
        >
          <p className="font-bold text-slate-300 mb-2 tracking-wide text-xs">
            Risk Factors
          </p>
          <ul className="space-y-1">
            {factors.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <span
                  className="mt-0.5 shrink-0"
                  style={{ color: style.bg }}
                >
                  •
                </span>
                <span className="text-slate-200 leading-tight">{f}</span>
              </li>
            ))}
          </ul>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
}
